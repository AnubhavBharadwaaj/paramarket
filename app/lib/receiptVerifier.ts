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
type ReceiptProof = {
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
