"use client";

import { BorshInstructionCoder, BN } from "@coral-xyz/anchor";
import {
  ComputeBudgetProgram,
  Connection,
  PublicKey,
  TransactionMessage,
  VersionedTransaction,
  TransactionInstruction,
} from "@solana/web3.js";
import { Buffer } from "buffer";
import {
  DAILY_ROOT_PDA,
  DEVNET_FEE_PAYER,
  DEVNET_RPC,
  SPIKE_PROGRAM_ID,
  TXORACLE_PROGRAM_ID,
} from "./constants";
import { spikeIdl } from "./spikeIdl";

type ProofNode = { hash: number[]; isRightSibling: boolean };
export type ReceiptProof = {
  fixtureId: number;
  seq: number;
  proof: {
    ts: number;
    statToProve: { key: number; value: number; period: number };
    statToProve2: { key: number; value: number; period: number };
    eventStatRoot: number[];
    summary: {
      fixtureId: number;
      updateStats: {
        updateCount: number;
        minTimestamp: number;
        maxTimestamp: number;
      };
      eventStatsSubTreeRoot: number[];
    };
    statProof: ProofNode[];
    statProof2: ProofNode[];
    subTreeProof: ProofNode[];
    mainTreeProof: ProofNode[];
  };
};

export type VerifyResult = {
  ok: boolean;
  returnValue: boolean;
  verdictLog: string;
  slot: number;
  unitsConsumed?: number;
  proofTimestamp: string;
  logs: string[];
};

export type TamperKind = "wrongTimestamp" | "wrongStatKey" | "wrongFixture";

export type TamperResult = {
  ok: false;
  tamper: TamperKind;
  guardName: string;
  guardLog: string;
  diff: string;
  error: string;
  slot: number;
  unitsConsumed?: number;
  logs: string[];
};

function ensureBuffer() {
  const globalWithBuffer = globalThis as typeof globalThis & { Buffer?: typeof Buffer };
  globalWithBuffer.Buffer ??= Buffer;
}

function fixed32(bytes: number[]) {
  if (bytes.length !== 32) throw new Error(`expected 32 bytes, got ${bytes.length}`);
  return bytes;
}

function proofNode(node: ProofNode) {
  return { hash: fixed32(node.hash), isRightSibling: node.isRightSibling };
}

function statTerm(stat: ReceiptProof["proof"]["statToProve"], proof: ProofNode[], root: number[]) {
  return {
    statToProve: stat,
    eventStatRoot: fixed32(root),
    statProof: proof.map(proofNode),
  };
}

export async function loadReceiptProof(): Promise<ReceiptProof> {
  const res = await fetch("/stage4/receipt-proof.json", { cache: "no-store" });
  if (!res.ok) throw new Error(`proof asset failed: HTTP ${res.status}`);
  return (await res.json()) as ReceiptProof;
}

export async function simulateReceipt(proofAsset: ReceiptProof): Promise<VerifyResult> {
  ensureBuffer();
  const proof = proofAsset.proof;
  const ts = proof.summary.updateStats.minTimestamp;
  const sum = proof.statToProve.value + proof.statToProve2.value;
  const args = {
    ts: new BN(ts),
    fixtureSummary: {
      fixtureId: new BN(proof.summary.fixtureId),
      updateStats: {
        updateCount: proof.summary.updateStats.updateCount,
        minTimestamp: new BN(proof.summary.updateStats.minTimestamp),
        maxTimestamp: new BN(proof.summary.updateStats.maxTimestamp),
      },
      eventsSubTreeRoot: fixed32(proof.summary.eventStatsSubTreeRoot),
    },
    fixtureProof: proof.subTreeProof.map(proofNode),
    mainTreeProof: proof.mainTreeProof.map(proofNode),
    predicate: { threshold: sum, comparison: { equalTo: {} } },
    statA: statTerm(proof.statToProve, proof.statProof, proof.eventStatRoot),
    statB: statTerm(proof.statToProve2, proof.statProof2, proof.eventStatRoot),
    op: { add: {} },
  };

  const coder = new BorshInstructionCoder(spikeIdl as any);
  const data = coder.encode("settleSpike", { args });
  const ix = new TransactionInstruction({
    programId: SPIKE_PROGRAM_ID,
    keys: [
      { pubkey: new PublicKey(DAILY_ROOT_PDA), isSigner: false, isWritable: false },
      { pubkey: TXORACLE_PROGRAM_ID, isSigner: false, isWritable: false },
    ],
    data,
  });

  const connection = new Connection(DEVNET_RPC, "confirmed");
  const blockhash = (await connection.getLatestBlockhash("confirmed")).blockhash;
  const message = new TransactionMessage({
    payerKey: DEVNET_FEE_PAYER,
    recentBlockhash: blockhash,
    instructions: [ComputeBudgetProgram.setComputeUnitLimit({ units: 1_000_000 }), ix],
  }).compileToV0Message();
  const tx = new VersionedTransaction(message);

  const sim = await connection.simulateTransaction(tx, {
    sigVerify: false,
    replaceRecentBlockhash: true,
  } as any);
  if (sim.value.err) throw new Error(`simulation failed: ${JSON.stringify(sim.value.err)}`);

  const logs = sim.value.logs ?? [];
  const verdictLog =
    logs.find((line) => line.includes("paramarket settle_spike validate_stat=")) ??
    "paramarket settle_spike validate_stat=<missing>";
  const returnData = sim.value.returnData?.data;
  const returnByte =
    Array.isArray(returnData) && typeof returnData[0] === "string"
      ? Buffer.from(returnData[0], "base64")[0]
      : undefined;
  const returnValue = returnByte === 1 || verdictLog.endsWith("=true");

  return {
    ok: returnValue,
    returnValue,
    verdictLog,
    slot: sim.context.slot,
    unitsConsumed: sim.value.unitsConsumed,
    proofTimestamp: new Date(ts).toISOString(),
    logs,
  };
}

function txOracleGuard(logs: string[], err: unknown) {
  const joined = logs.join("\n");
  const anchorName =
    joined.match(/Error Code: ([A-Za-z0-9_]+)/)?.[1] ??
    joined.match(/custom program error: 0x([0-9a-f]+)/i)?.[1];
  if (anchorName && !/^[0-9a-f]+$/i.test(anchorName)) return anchorName;
  if (anchorName && /^[0-9a-f]+$/i.test(anchorName)) {
    const code = Number.parseInt(anchorName, 16);
    const known: Record<number, string> = {
      6010: "TimestampMismatch",
      6021: "PredicateFailed",
      6022: "InvalidFixtureSubTreeProof",
      6023: "InvalidStatProof",
      6048: "FixtureMismatch",
      6053: "StatKeyMismatch",
    };
    return known[code] ?? `CustomError${code}`;
  }
  return String(err);
}

function guardLogLine(logs: string[], guardName: string) {
  return (
    logs.find((line) => line.includes(`Error Code: ${guardName}`)) ??
    logs.find((line) => line.includes("Program log: AnchorError")) ??
    logs.find((line) => line.includes("custom program error")) ??
    logs.find((line) => line.includes("failed")) ??
    "no program failure log returned"
  );
}

function tamperArgs(proofAsset: ReceiptProof, tamper: TamperKind) {
  const proof = proofAsset.proof;
  const sum = proof.statToProve.value + proof.statToProve2.value;
  const statA =
    tamper === "wrongStatKey"
      ? { ...proof.statToProve, key: 1001 }
      : proof.statToProve;
  const fixtureId = tamper === "wrongFixture" ? 999999 : proof.summary.fixtureId;
  const ts = tamper === "wrongTimestamp" ? proof.ts : proof.summary.updateStats.minTimestamp;
  const diff =
    tamper === "wrongTimestamp"
      ? `ts: ${proof.summary.updateStats.minTimestamp} -> ${proof.ts}`
      : tamper === "wrongStatKey"
        ? `statA.key: ${proof.statToProve.key} -> 1001`
        : `fixtureSummary.fixtureId: ${proof.summary.fixtureId} -> 999999`;

  return {
    diff,
    args: {
      ts: new BN(ts),
      fixtureSummary: {
        fixtureId: new BN(fixtureId),
        updateStats: {
          updateCount: proof.summary.updateStats.updateCount,
          minTimestamp: new BN(proof.summary.updateStats.minTimestamp),
          maxTimestamp: new BN(proof.summary.updateStats.maxTimestamp),
        },
        eventsSubTreeRoot: fixed32(proof.summary.eventStatsSubTreeRoot),
      },
      fixtureProof: proof.subTreeProof.map(proofNode),
      mainTreeProof: proof.mainTreeProof.map(proofNode),
      predicate: { threshold: sum, comparison: { equalTo: {} } },
      statA: statTerm(statA, proof.statProof, proof.eventStatRoot),
      statB: statTerm(proof.statToProve2, proof.statProof2, proof.eventStatRoot),
      op: { add: {} },
    },
  };
}

export async function simulateTamperedReceipt(
  proofAsset: ReceiptProof,
  tamper: TamperKind
): Promise<TamperResult> {
  ensureBuffer();
  const { args, diff } = tamperArgs(proofAsset, tamper);
  const coder = new BorshInstructionCoder(spikeIdl as any);
  const data = coder.encode("settleSpike", { args });
  const ix = new TransactionInstruction({
    programId: SPIKE_PROGRAM_ID,
    keys: [
      { pubkey: new PublicKey(DAILY_ROOT_PDA), isSigner: false, isWritable: false },
      { pubkey: TXORACLE_PROGRAM_ID, isSigner: false, isWritable: false },
    ],
    data,
  });

  const connection = new Connection(DEVNET_RPC, "confirmed");
  const blockhash = (await connection.getLatestBlockhash("confirmed")).blockhash;
  const message = new TransactionMessage({
    payerKey: DEVNET_FEE_PAYER,
    recentBlockhash: blockhash,
    instructions: [ComputeBudgetProgram.setComputeUnitLimit({ units: 1_000_000 }), ix],
  }).compileToV0Message();
  const tx = new VersionedTransaction(message);

  const sim = await connection.simulateTransaction(tx, {
    sigVerify: false,
    replaceRecentBlockhash: true,
  } as any);

  const logs = sim.value.logs ?? [];
  if (!sim.value.err) {
    const returnData = sim.value.returnData?.data;
    const returnByte =
      Array.isArray(returnData) && typeof returnData[0] === "string"
        ? Buffer.from(returnData[0], "base64")[0]
        : undefined;
    throw new Error(`tamper unexpectedly succeeded with return byte ${returnByte ?? "<missing>"}`);
  }

  const guardName = txOracleGuard(logs, sim.value.err);
  return {
    ok: false,
    tamper,
    guardName,
    guardLog: guardLogLine(logs, guardName),
    diff,
    error: JSON.stringify(sim.value.err),
    slot: sim.context.slot,
    unitsConsumed: sim.value.unitsConsumed,
    logs,
  };
}
