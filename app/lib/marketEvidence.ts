import { Connection, PublicKey } from "@solana/web3.js";
import { DEVNET_RPC, PARAMARKET_PROGRAM_ID, TXORACLE_PROGRAM_ID } from "./constants";

export type TxStatus = "checking" | "live" | "pruned" | "error";
export type AccountStatus = "checking" | "live" | "missing" | "error";

export type LifecycleTxs = {
  init: string;
  settle: string;
  claim: string;
};

export type MarketEvidence = {
  id: string;
  name: string;
  marketId: number;
  marketPda: string;
  vaultPda: string;
  evidencePrefix: string;
  outcomeLabels: string[];
  txs: LifecycleTxs;
};

export type DecodedMarketState = {
  marketId: string;
  authority: string;
  fixtureId: string;
  statKeyA: number;
  statKeyB: number | null;
  op: "add" | "subtract" | null;
  comparison: "greaterThan" | "lessThan" | "equalTo";
  threshold: number;
  period: number;
  numOutcomes: number;
  outcomeLabels: string[];
  poolTotalsLamports: string[];
  totalPoolLamports: string;
  settled: boolean;
  voided: boolean;
  winningOutcome: number | null;
  closeTs: string;
  minFinalTs: string;
};

export const MARKET_EVIDENCE: MarketEvidence[] = [
  {
    id: "t1",
    name: "T1 single-stat over/under",
    marketId: 481421,
    marketPda: "8JZmhpo2TEnbssA2RfDRbYwbvbawzHH5KeEiEZHNZv5w",
    vaultPda: "342t8gWxytzF7m5wfzJjDX2BXfk6DPxnDQEhFQUQaemG",
    evidencePrefix: "stage2-t1",
    outcomeLabels: ["OVER", "UNDER"],
    txs: {
      init: "3ucd6d4AWSy86Rm7LesHBWpgBEzeMY4LWfTRDwv1Z1w1UKhBQitjXZnngvrBLo55b7dFj1W53gh3zfmEkph4vje5",
      settle: "4gWe45Q74LHRiLh1yv3YUDf6rRxUMP3Gic6JMBruZN1XqHwjdEf13ErzNygyeHKyLKQiTWViL4axtzpYHKPUmUsN",
      claim: "3dPLXU2N5Ak8x3DS93jZzEfsmtSPUqtpmAP9RkYSr6Jc7ZQuD4NdYuboe7N4gH5Nz8G9wQZDV5wUa6rhyoQD2dAe",
    },
  },
  {
    id: "t2",
    name: "T2 two-stat sum predicate",
    marketId: 481422,
    marketPda: "4mThnf3THGCxN3rRfkxCqMhLfXYEz9d3XamSJHZ4Bq3i",
    vaultPda: "5Za2pg1bxyEHsnYXUAZHGuQqBmE38SY1mSpN8fsxfg2Z",
    evidencePrefix: "stage2-t2",
    outcomeLabels: ["SUM OVER", "SUM UNDER"],
    txs: {
      init: "5gUKJLbimxK9ptfh3puqXCUfHduxdgCdEjKxBA94vmWHknYYYLLoF3HhKFUawF99L2V21DmxbGvTNdE9u3rA4eCi",
      settle: "5b2NYByaYuCdz3xJhM2UoFwwgqNtBRHgwVftVgFozq6moQKdg1AfNp42MAReQqd4ery9LYLACZ2b5y347M4qCcGQ",
      claim: "5aXTakrhTjfpedRmWq6PgWDbjUG52ZqRQSyoXCzL5eLbTbgMvosvTuxdUCSrDKTfL9U57t8mUt1e2oogy6JJDYSx",
    },
  },
  {
    id: "t3",
    name: "T3 under/exact/over 3-way",
    marketId: 481423,
    marketPda: "BeHTr9mTLxRNnyZtVVAaS5bmijJS8jMJ8PmLcCZC7HpW",
    vaultPda: "6RU5bvuztUeoHNCk1Y3qe5CiBMu7iTqhKXHzQbDPD3oF",
    evidencePrefix: "stage2-t3",
    outcomeLabels: ["UNDER", "EXACT", "OVER"],
    txs: {
      init: "53HBasqoDf1KMFsC7hUmY9sMDx6mB4GwNozrNBatvpa4i8s9vqKbbG62L1LkRQtzsfecduZ31RNshNYsVBhWhxy8",
      settle: "4r9T3imD7jfpwsemA7gyGTo3ysncRE3cxC481yMfwiheHGemZWxggEYWjeSS5mLdKQqwXS81E4EVDyzgNikdsYTJ",
      claim: "5jmpuHm1t9aitUe3yeurpj3dGYTniKqqewMkqRuqeKC6THbCesdUDpKjifdmsfcdGebaiioS7hDNdyU9KBDX4r4U",
    },
  },
];

export const CORE_ACCOUNTS = [
  { label: "ParaMarket program", address: PARAMARKET_PROGRAM_ID },
  { label: "TxOracle program", address: TXORACLE_PROGRAM_ID.toBase58() },
];

export function accountExplorer(address: string) {
  return `https://explorer.solana.com/address/${address}?cluster=devnet`;
}

export function solanaFmTx(sig: string) {
  return `https://solana.fm/tx/${sig}?cluster=devnet-solana`;
}

export function evidenceUrl(fileName: string) {
  return `https://github.com/AnubhavBharadwaaj/paramarket/blob/main/evidence/${fileName}`;
}

function readU64(view: DataView, offset: number) {
  return view.getBigUint64(offset, true).toString();
}

function readI64(view: DataView, offset: number) {
  return view.getBigInt64(offset, true).toString();
}

function readLabel(bytes: Uint8Array) {
  return new TextDecoder().decode(bytes).replace(/\0+$/g, "");
}

function comparisonName(value: number): DecodedMarketState["comparison"] {
  return value === 0 ? "greaterThan" : value === 1 ? "lessThan" : "equalTo";
}

function binaryExpressionName(value: number): DecodedMarketState["op"] {
  return value === 0 ? "add" : "subtract";
}

export function decodeMarketAccount(bytes: Uint8Array): DecodedMarketState {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  let offset = 8;
  const authority = new PublicKey(bytes.slice(offset, offset + 32)).toBase58();
  offset += 32;
  const marketId = readU64(view, offset);
  offset += 8;
  offset += 2; // bump + vault_bump

  const fixtureId = readI64(view, offset);
  offset += 8;
  const statKeyA = view.getUint32(offset, true);
  offset += 4;
  const hasStatB = bytes[offset] === 1;
  offset += 1;
  const statKeyB = hasStatB ? view.getUint32(offset, true) : null;
  offset += hasStatB ? 4 : 0;
  const hasOp = bytes[offset] === 1;
  offset += 1;
  const op = hasOp ? binaryExpressionName(bytes[offset]) : null;
  offset += hasOp ? 1 : 0;
  const comparison = comparisonName(bytes[offset]);
  offset += 1;
  const threshold = view.getInt32(offset, true);
  offset += 4;
  const period = view.getUint16(offset, true);
  offset += 2;
  const numOutcomes = bytes[offset];
  offset += 1;
  const outcomeLabels = Array.from({ length: 4 }, () => {
    const label = readLabel(bytes.slice(offset, offset + 16));
    offset += 16;
    return label;
  }).slice(0, numOutcomes);
  const minFinalTs = readI64(view, offset);
  offset += 8;
  const closeTs = readI64(view, offset);
  offset += 8;

  const poolTotalsLamports = Array.from({ length: 4 }, () => {
    const value = readU64(view, offset);
    offset += 8;
    return value;
  });
  const totalPoolLamports = readU64(view, offset);
  offset += 8;
  const settled = bytes[offset] === 1;
  offset += 1;
  const voided = bytes[offset] === 1;
  offset += 1;
  const winning = bytes[offset];

  return {
    marketId,
    authority,
    fixtureId,
    statKeyA,
    statKeyB,
    op,
    comparison,
    threshold,
    period,
    numOutcomes,
    outcomeLabels,
    poolTotalsLamports: poolTotalsLamports.slice(0, numOutcomes),
    totalPoolLamports,
    settled,
    voided,
    winningOutcome: winning === 255 ? null : winning,
    closeTs,
    minFinalTs,
  };
}

export async function fetchMarketState(marketPda: string) {
  const connection = new Connection(DEVNET_RPC, "confirmed");
  const account = await connection.getAccountInfo(new PublicKey(marketPda), "confirmed");
  if (!account) return null;
  return decodeMarketAccount(account.data);
}

export async function checkTransaction(sig: string): Promise<TxStatus> {
  const connection = new Connection(DEVNET_RPC, "confirmed");
  for (let attempt = 0; attempt < 4; attempt += 1) {
    try {
      const tx = await connection.getTransaction(sig, { maxSupportedTransactionVersion: 0, commitment: "confirmed" });
      return tx ? "live" : "pruned";
    } catch {
      await new Promise((resolve) => setTimeout(resolve, 500 * (attempt + 1)));
    }
  }
  return "error";
}
