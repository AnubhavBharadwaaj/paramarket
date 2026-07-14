/**
 * STAGE 1 — ParaMarket settlement CPI spike runner.
 *
 * Fetches a real TxLINE stat-validation proof, derives the per-day
 * daily_scores_roots PDA, and calls the deployed paramarket_spike program twice:
 * one two-stat predicate that should return true and one that should return false.
 */

import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import * as anchor from "@coral-xyz/anchor";
import { ComputeBudgetProgram, Connection, Keypair, PublicKey } from "@solana/web3.js";
import { getConfig } from "./config.ts";

const NETWORK = (process.env.TXLINE_NETWORK ?? "devnet") as "devnet";
const SPIKE_PROGRAM_ID = new PublicKey(
  process.env.PARAMARKET_SPIKE_PROGRAM_ID ??
    "CWCzF6shQBeGYNJcwip62WvoBM1P6QHCbnGm5MB3c8Pm"
);
const FIXTURE_ID = Number(process.env.SPIKE_FIXTURE_ID ?? 18213979);
const SEQ = Number(process.env.SPIKE_SEQ ?? 1);
const STAT_KEY_A = Number(process.env.SPIKE_STAT_KEY_A ?? 1002);
const STAT_KEY_B = Number(process.env.SPIKE_STAT_KEY_B ?? 1003);
const TS_MODE = process.env.SPIKE_TS_MODE ?? "proof";
const MS_PER_DAY = 86_400_000;

type ProofNode = { hash: number[]; isRightSibling: boolean };
type StatValidationProof = {
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

function loadKeypair(): Keypair {
  const keypairPath =
    process.env.SOLANA_KEYPAIR ??
    path.join(os.homedir(), ".config", "solana", "id.json");
  return Keypair.fromSecretKey(
    Uint8Array.from(JSON.parse(fs.readFileSync(keypairPath, "utf8")))
  );
}

function loadSavedToken(): { jwt: string; apiToken: string } {
  const saved = JSON.parse(fs.readFileSync(".txline-token.json", "utf8"));
  if (!saved.jwt || !saved.apiToken) {
    throw new Error(".txline-token.json is missing jwt/apiToken");
  }
  return { jwt: saved.jwt, apiToken: saved.apiToken };
}

function toFixed32(bytes: number[]): number[] {
  if (bytes.length !== 32) throw new Error(`expected 32 bytes, got ${bytes.length}`);
  return bytes;
}

function proofNode(node: ProofNode) {
  return { hash: toFixed32(node.hash), isRightSibling: node.isRightSibling };
}

function statTerm(statToProve: StatValidationProof["statToProve"], proof: ProofNode[], root: number[]) {
  return {
    statToProve,
    eventStatRoot: toFixed32(root),
    statProof: proof.map(proofNode),
  };
}

function dailyScoresRootsPda(txoracleProgramId: PublicKey, tsMs: number): {
  epochDay: number;
  pda: PublicKey;
} {
  const epochDay = Math.floor(tsMs / MS_PER_DAY);
  const epoch = Buffer.alloc(2);
  epoch.writeUInt16LE(epochDay);
  const [pda] = PublicKey.findProgramAddressSync(
    [Buffer.from("daily_scores_roots"), epoch],
    txoracleProgramId
  );
  return { epochDay, pda };
}

function validationTimestamp(proof: StatValidationProof): number {
  switch (TS_MODE) {
    case "min":
      return proof.summary.updateStats.minTimestamp;
    case "max":
      return proof.summary.updateStats.maxTimestamp;
    case "minute":
      return Math.floor(proof.ts / 60_000) * 60_000;
    case "batch-minute":
      return Math.floor(proof.summary.updateStats.maxTimestamp / 60_000) * 60_000;
    case "proof":
      return proof.ts;
    default:
      throw new Error(`unknown SPIKE_TS_MODE=${TS_MODE}`);
  }
}

async function fetchProof(cfg: ReturnType<typeof getConfig>): Promise<StatValidationProof> {
  const { jwt, apiToken } = loadSavedToken();
  const url =
    `${cfg.apiBaseUrl}/scores/stat-validation?fixtureId=${FIXTURE_ID}` +
    `&seq=${SEQ}&statKey=${STAT_KEY_A}&statKey2=${STAT_KEY_B}`;
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${jwt}`, "X-Api-Token": apiToken },
  });
  if (!res.ok) throw new Error(`stat-validation failed: ${res.status} ${await res.text()}`);
  return (await res.json()) as StatValidationProof;
}

async function sendSpike(params: {
  program: anchor.Program;
  txoracleProgramId: PublicKey;
  dailyScoresRoots: PublicKey;
  proof: StatValidationProof;
  label: string;
  predicate: { threshold: number; comparison: Record<string, object> };
}) {
  const { program, txoracleProgramId, dailyScoresRoots, proof, label, predicate } = params;
  const ts = validationTimestamp(proof);
  const args = {
    ts: new anchor.BN(ts),
    fixtureSummary: {
      fixtureId: new anchor.BN(proof.summary.fixtureId),
      updateStats: {
        updateCount: proof.summary.updateStats.updateCount,
        minTimestamp: new anchor.BN(proof.summary.updateStats.minTimestamp),
        maxTimestamp: new anchor.BN(proof.summary.updateStats.maxTimestamp),
      },
      eventsSubTreeRoot: toFixed32(proof.summary.eventStatsSubTreeRoot),
    },
    fixtureProof: proof.subTreeProof.map(proofNode),
    mainTreeProof: proof.mainTreeProof.map(proofNode),
    predicate,
    statA: statTerm(proof.statToProve, proof.statProof, proof.eventStatRoot),
    statB: statTerm(proof.statToProve2, proof.statProof2, proof.eventStatRoot),
    op: { add: {} },
  };

  const sig = await program.methods
    .settleSpike(args)
    .accounts({
      dailyScoresMerkleRoots: dailyScoresRoots,
      txoracleProgram: txoracleProgramId,
    })
    .preInstructions([
      ComputeBudgetProgram.setComputeUnitLimit({ units: 1_000_000 }),
    ])
    .rpc();
  const tx = await program.provider.connection.getTransaction(sig, {
    commitment: "confirmed",
    maxSupportedTransactionVersion: 0,
  });
  const verdictLog =
    tx?.meta?.logMessages?.find((line) =>
      line.includes("paramarket settle_spike validate_stat=")
    ) ?? "<verdict log missing>";

  console.log(`[${label}] ${sig}`);
  console.log(`    explorer: https://explorer.solana.com/tx/${sig}?cluster=devnet`);
  console.log(`    ${verdictLog}`);
}

async function main() {
  const cfg = getConfig(NETWORK);
  const payer = loadKeypair();
  const connection = new Connection(cfg.rpcUrl, "confirmed");
  const provider = new anchor.AnchorProvider(connection, new anchor.Wallet(payer), {
    commitment: "confirmed",
  });
  anchor.setProvider(provider);

  const idl = JSON.parse(fs.readFileSync("target/idl/paramarket_spike.json", "utf8"));
  const program = new anchor.Program(idl, provider);
  const txoracleProgramId = new PublicKey(cfg.programId);
  const proof = await fetchProof(cfg);
  const ts = validationTimestamp(proof);
  const { epochDay, pda: dailyScoresRoots } = dailyScoresRootsPda(
    txoracleProgramId,
    ts
  );

  const sum = proof.statToProve.value + proof.statToProve2.value;
  console.log(`fixture=${FIXTURE_ID} seq=${SEQ} tsMode=${TS_MODE} ts=${ts} epochDay=${epochDay}`);
  console.log(
    `stat ${proof.statToProve.key}=${proof.statToProve.value}, ` +
      `stat ${proof.statToProve2.key}=${proof.statToProve2.value}, sum=${sum}`
  );
  console.log(`daily_scores_roots=${dailyScoresRoots.toBase58()}`);

  await sendSpike({
    program,
    txoracleProgramId,
    dailyScoresRoots,
    proof,
    label: "TRUE two-stat equal",
    predicate: { threshold: sum, comparison: { equalTo: {} } },
  });
  await sendSpike({
    program,
    txoracleProgramId,
    dailyScoresRoots,
    proof,
    label: "FALSE two-stat greater",
    predicate: { threshold: sum + 1, comparison: { greaterThan: {} } },
  });
}

main().catch((err) => {
  console.error("SETTLE SPIKE FAILED:", err);
  process.exit(1);
});
