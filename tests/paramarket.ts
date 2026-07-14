import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import * as anchor from "@coral-xyz/anchor";
import {
  ComputeBudgetProgram,
  Connection,
  Keypair,
  PublicKey,
  SystemProgram,
  Transaction,
} from "@solana/web3.js";

const PROGRAM_ID = new PublicKey("HPzBCd83X61od45nq2ofu4G1sRMiguuvZk87vGqsmxtN");
const TXORACLE = new PublicKey("6pW64gN1s2uqjHkn1unFeEjAwJkPGHoppGvS715wyP2J");
const FIXTURE_ID = 18213979;
const SEQ = 941;
const MS_PER_DAY = 86_400_000;
const LAMPORT_BET = 5_000_000;

type ProofNode = { hash: number[]; isRightSibling: boolean };
type Proof = {
  ts: number;
  statToProve: { key: number; value: number; period: number };
  statToProve2?: { key: number; value: number; period: number };
  eventStatRoot: number[];
  summary: {
    fixtureId: number;
    updateStats: { updateCount: number; minTimestamp: number; maxTimestamp: number };
    eventStatsSubTreeRoot: number[];
  };
  statProof: ProofNode[];
  statProof2?: ProofNode[];
  subTreeProof: ProofNode[];
  mainTreeProof: ProofNode[];
};

function loadKeypair(): Keypair {
  const p = process.env.SOLANA_KEYPAIR ?? path.join(os.homedir(), ".config", "solana", "id.json");
  return Keypair.fromSecretKey(Uint8Array.from(JSON.parse(fs.readFileSync(p, "utf8"))));
}

function tokenHeaders() {
  const saved = JSON.parse(fs.readFileSync(".txline-token.json", "utf8"));
  return { Authorization: `Bearer ${saved.jwt}`, "X-Api-Token": saved.apiToken };
}

async function fetchProof(statKey: number, statKey2?: number): Promise<Proof> {
  const qs = new URLSearchParams({ fixtureId: String(FIXTURE_ID), seq: String(SEQ), statKey: String(statKey) });
  if (statKey2 !== undefined) qs.set("statKey2", String(statKey2));
  const res = await fetch(`https://txline-dev.txodds.com/api/scores/stat-validation?${qs}`, {
    headers: tokenHeaders(),
  });
  if (!res.ok) throw new Error(`proof fetch failed ${res.status}: ${await res.text()}`);
  return (await res.json()) as Proof;
}

function pda(seeds: (Buffer | Uint8Array)[]) {
  return PublicKey.findProgramAddressSync(seeds, PROGRAM_ID)[0];
}

function marketPda(authority: PublicKey, marketId: bigint) {
  const id = Buffer.alloc(8);
  id.writeBigUInt64LE(marketId);
  return pda([Buffer.from("market"), authority.toBuffer(), id]);
}

function dailyPda(tsMs: number) {
  const epoch = Buffer.alloc(2);
  epoch.writeUInt16LE(Math.floor(tsMs / MS_PER_DAY));
  return PublicKey.findProgramAddressSync([Buffer.from("daily_scores_roots"), epoch], TXORACLE)[0];
}

function fixedLabel(s: string) {
  const out = Array(16).fill(0);
  Buffer.from(s).copy(Buffer.from(out), 0, 0, Math.min(16, Buffer.byteLength(s)));
  return out;
}

function proofNode(n: ProofNode) {
  return { hash: n.hash, isRightSibling: n.isRightSibling };
}

function statTerm(stat: Proof["statToProve"], proof: ProofNode[], root: number[]) {
  return { statToProve: stat, eventStatRoot: root, statProof: proof.map(proofNode) };
}

function proofArgs(proof: Proof, tamperFixture = false, tamperStat = false) {
  const ts = proof.summary.updateStats.minTimestamp;
  return {
    ts: new anchor.BN(ts),
    fixtureSummary: {
      fixtureId: new anchor.BN(tamperFixture ? 999999 : proof.summary.fixtureId),
      updateStats: {
        updateCount: proof.summary.updateStats.updateCount,
        minTimestamp: new anchor.BN(proof.summary.updateStats.minTimestamp),
        maxTimestamp: new anchor.BN(proof.summary.updateStats.maxTimestamp),
      },
      eventsSubTreeRoot: proof.summary.eventStatsSubTreeRoot,
    },
    fixtureProof: proof.subTreeProof.map(proofNode),
    mainTreeProof: proof.mainTreeProof.map(proofNode),
    predicate: { threshold: 0, comparison: { equalTo: {} } },
    statA: statTerm(
      { ...proof.statToProve, key: tamperStat ? proof.statToProve.key + 1 : proof.statToProve.key },
      proof.statProof,
      proof.eventStatRoot
    ),
    statB: proof.statToProve2 && proof.statProof2 ? statTerm(proof.statToProve2, proof.statProof2, proof.eventStatRoot) : null,
    op: proof.statToProve2 ? { add: {} } : null,
  };
}

function errorCode(err: any): string {
  const direct = err?.error?.errorCode?.code;
  if (direct) return direct;
  const logs = err?.logs ?? err?.transactionLogs ?? [];
  const fromLogs = logs.join("\n").match(/Error Code: ([A-Za-z0-9_]+)/)?.[1];
  if (fromLogs) return fromLogs;
  const fromMessage = String(err?.message ?? err).match(/Error Code: ([A-Za-z0-9_]+)/)?.[1];
  return fromMessage ?? String(err?.message ?? err).slice(0, 120);
}

async function expectReject(label: string, expectedCode: string, fn: () => Promise<unknown>) {
  try {
    await fn();
    throw new Error(`${label} unexpectedly succeeded`);
  } catch (err: any) {
    const actual = errorCode(err);
    console.log(`[revert] ${label}: ${actual}`);
    if (actual !== expectedCode) {
      throw new Error(`${label} reverted with ${actual}, expected ${expectedCode}`);
    }
  }
}

async function main() {
  const payer = loadKeypair();
  const connection = new Connection("https://api.devnet.solana.com", "confirmed");
  const provider = new anchor.AnchorProvider(connection, new anchor.Wallet(payer), { commitment: "confirmed" });
  anchor.setProvider(provider);
  const program: any = new anchor.Program(
    JSON.parse(fs.readFileSync("target/idl/paramarket.json", "utf8")),
    provider
  );

  const loser = Keypair.generate();
  await provider.sendAndConfirm(
    new Transaction().add(SystemProgram.transfer({ fromPubkey: payer.publicKey, toPubkey: loser.publicKey, lamports: 80_000_000 }))
  );

  const proofSingle = await fetchProof(1002);
  const proofTwo = await fetchProof(1002, 1003);
  const now = Math.floor(Date.now() / 1000);
  const gate = now + 8;
  const mk = (id: bigint) => {
    const market = marketPda(payer.publicKey, id);
    return { market, vault: pda([Buffer.from("vault"), market.toBuffer()]) };
  };
  const pos = (market: PublicKey, user: PublicKey) => pda([Buffer.from("position"), market.toBuffer(), user.toBuffer()]);
  const runId = BigInt(Date.now() % 1_000_000);
  const results: string[] = [];
  const reverts: string[] = [];

  async function initMarket(id: bigint, spec: any) {
    const { market, vault } = mk(id);
    const sig = await program.methods.initializeMarket(new anchor.BN(id.toString()), spec).accounts({
      payer: payer.publicKey,
      market,
      marketVault: vault,
      systemProgram: SystemProgram.programId,
    }).rpc();
    results.push(`init ${id}: ${sig}`);
    return { market, vault };
  }

  async function bet(market: PublicKey, vault: PublicKey, bettor: Keypair, outcome: number, amount = LAMPORT_BET) {
    const sig = await program.methods.placeBet(outcome, new anchor.BN(amount)).accounts({
      bettor: bettor.publicKey,
      market,
      marketVault: vault,
      position: pos(market, bettor.publicKey),
      systemProgram: SystemProgram.programId,
    }).signers(bettor === payer ? [] : [bettor]).rpc();
    results.push(`bet outcome ${outcome}: ${sig}`);
  }

  async function settle(market: PublicKey, proof: Proof, winning: number, label: string, tamperFixture = false, tamperStat = false) {
    const args = proofArgs(proof, tamperFixture, tamperStat);
    const sig = await program.methods.settleWithProof(winning, args).accounts({
      settler: payer.publicKey,
      market,
      dailyScoresMerkleRoots: dailyPda(Number(args.ts)),
      txoracleProgram: TXORACLE,
    }).preInstructions([ComputeBudgetProgram.setComputeUnitLimit({ units: 1_000_000 })]).rpc();
    results.push(`${label}: ${sig}`);
    return sig;
  }

  async function claim(market: PublicKey, vault: PublicKey, user: Keypair, label: string) {
    const sig = await program.methods.claim().accounts({
      user: user.publicKey,
      market,
      marketVault: vault,
      position: pos(market, user.publicKey),
      systemProgram: SystemProgram.programId,
    }).signers(user === payer ? [] : [user]).rpc();
    results.push(`${label}: ${sig}`);
  }

  const base = { fixtureId: new anchor.BN(FIXTURE_ID), period: 0, minFinalTs: new anchor.BN(gate), closeTs: new anchor.BN(gate) };
  const t1 = await initMarket(runId + 1n, { ...base, statKeyA: 1002, statKeyB: null, op: null, comparison: { greaterThan: {} }, threshold: proofSingle.statToProve.value - 1, numOutcomes: 2, outcomeLabels: [fixedLabel("OVER"), fixedLabel("UNDER")] });
  const t2 = await initMarket(runId + 2n, { ...base, statKeyA: 1002, statKeyB: 1003, op: { add: {} }, comparison: { greaterThan: {} }, threshold: proofTwo.statToProve.value + (proofTwo.statToProve2?.value ?? 0) - 1, numOutcomes: 2, outcomeLabels: [fixedLabel("SUM OVER"), fixedLabel("SUM UNDER")] });
  const t3 = await initMarket(runId + 3n, { ...base, statKeyA: 1002, statKeyB: 1003, op: { add: {} }, comparison: { equalTo: {} }, threshold: proofTwo.statToProve.value + (proofTwo.statToProve2?.value ?? 0), numOutcomes: 3, outcomeLabels: [fixedLabel("UNDER"), fixedLabel("EXACT"), fixedLabel("OVER")] });

  await bet(t1.market, t1.vault, payer, 0);
  await bet(t1.market, t1.vault, loser, 1);
  await bet(t2.market, t2.vault, payer, 0);
  await bet(t2.market, t2.vault, loser, 1);
  await bet(t3.market, t3.vault, payer, 1);
  await bet(t3.market, t3.vault, loser, 0);

  const early = await initMarket(runId + 4n, { ...base, statKeyA: 1002, statKeyB: null, op: null, comparison: { greaterThan: {} }, threshold: proofSingle.statToProve.value - 1, minFinalTs: new anchor.BN(now + 3600), closeTs: new anchor.BN(now + 3600), numOutcomes: 2, outcomeLabels: [fixedLabel("OVER"), fixedLabel("UNDER")] });
  await expectReject("early settle", "SettleTooEarly", () => settle(early.market, proofSingle, 0, "early"));
  reverts.push("early settle -> SettleTooEarly");

  const closed = await initMarket(runId + 5n, { ...base, statKeyA: 1002, statKeyB: null, op: null, comparison: { greaterThan: {} }, threshold: proofSingle.statToProve.value - 1, minFinalTs: new anchor.BN(0), closeTs: new anchor.BN(0), numOutcomes: 2, outcomeLabels: [fixedLabel("OVER"), fixedLabel("UNDER")] });
  await expectReject("bet after close", "BettingClosed", () => bet(closed.market, closed.vault, payer, 0));
  reverts.push("bet after close -> BettingClosed");

  const waitMs = Math.max(0, gate * 1000 - Date.now() + 1500);
  console.log(`waiting ${Math.ceil(waitMs / 1000)}s for close/min_final gate...`);
  await new Promise((r) => setTimeout(r, waitMs));

  const wrong = await initMarket(runId + 6n, { ...base, minFinalTs: new anchor.BN(0), closeTs: new anchor.BN(0), statKeyA: 1002, statKeyB: 1003, op: { add: {} }, comparison: { greaterThan: {} }, threshold: proofTwo.statToProve.value + (proofTwo.statToProve2?.value ?? 0) - 1, numOutcomes: 2, outcomeLabels: [fixedLabel("SUM OVER"), fixedLabel("SUM UNDER")] });
  await expectReject("wrong winner", "WrongWinner", () => settle(wrong.market, proofTwo, 1, "wrong"));
  reverts.push("wrong winner -> WrongWinner");
  await expectReject("fixture mismatch", "FixtureMismatch", () => settle(wrong.market, proofTwo, 0, "fixture mismatch", true));
  reverts.push("fixture mismatch -> FixtureMismatch");
  await expectReject("stat mismatch", "StatKeyMismatch", () => settle(wrong.market, proofTwo, 0, "stat mismatch", false, true));
  reverts.push("stat mismatch -> StatKeyMismatch");

  await settle(t1.market, proofSingle, 0, "T1 settle single-stat");
  await settle(t2.market, proofTwo, 0, "T2 settle two-stat");
  await settle(t3.market, proofTwo, 1, "T3 settle band");
  await claim(t1.market, t1.vault, payer, "T1 claim");
  await claim(t2.market, t2.vault, payer, "T2 claim");
  await claim(t3.market, t3.vault, payer, "T3 claim");
  await expectReject("double claim", "AlreadyClaimed", () => claim(t1.market, t1.vault, payer, "double"));
  reverts.push("double claim -> AlreadyClaimed");
  await expectReject("non-winner claim", "NothingToClaim", () => claim(t2.market, t2.vault, loser, "nonwinner"));
  reverts.push("non-winner claim -> NothingToClaim");

  console.log("\nSTAGE 2 EVAL RESULTS");
  for (const line of results) {
    const sig = line.split(": ").at(-1);
    console.log(`${line}\n  https://explorer.solana.com/tx/${sig}?cluster=devnet`);
  }
  console.log("\nREVERTS");
  for (const line of reverts) console.log(line);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
