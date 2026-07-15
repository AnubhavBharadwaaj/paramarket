import { Connection, PublicKey } from "@solana/web3.js";
import {
  CORE_ACCOUNTS,
  MARKET_EVIDENCE,
  decodeMarketAccount,
} from "../app/lib/marketEvidence";
import { DAILY_ROOT_PDA, DEVNET_RPC, RECEIPT_SETTLEMENT_TX, STAGE1_TRUE_TX } from "../app/lib/constants";

const STAGE1_FALSE_TX = "2VavzgtQt9595Lmr1sfkDR5TRZ4LTiYwmWZyp8e6y6Fps9xrRfAsxaFyPTecS3nQLTgBBzw7cBzQ1aeeGfaMJy88";

type Row = {
  kind: string;
  name: string;
  id: string;
  status: string;
  detail?: string;
};

const connection = new Connection(process.env.SOLANA_RPC_URL ?? DEVNET_RPC, "confirmed");

async function txStatus(sig: string) {
  let lastError = "";
  for (let attempt = 0; attempt < 5; attempt += 1) {
    try {
      const tx = await connection.getTransaction(sig, { maxSupportedTransactionVersion: 0, commitment: "confirmed" });
      return tx ? "LIVE" : "PRUNED";
    } catch (err) {
      lastError = String(err instanceof Error ? err.message : err);
      await new Promise((resolve) => setTimeout(resolve, 500 * (attempt + 1)));
    }
  }
  return `ERROR ${lastError.slice(0, 48)}`;
}

async function accountStatus(address: string) {
  try {
    const account = await connection.getAccountInfo(new PublicKey(address), "confirmed");
    return account ? { status: "LIVE", data: account.data } : { status: "MISSING", data: null };
  } catch (err) {
    return { status: `ERROR ${String(err instanceof Error ? err.message : err).slice(0, 48)}`, data: null };
  }
}

async function main() {
  const rows: Row[] = [];

  for (const tx of [
    ["Stage 1 TRUE", STAGE1_TRUE_TX],
    ["Stage 1 FALSE", STAGE1_FALSE_TX],
    ["Receipt settlement", RECEIPT_SETTLEMENT_TX],
  ] as const) {
    rows.push({ kind: "tx", name: tx[0], id: tx[1], status: await txStatus(tx[1]) });
  }

  for (const market of MARKET_EVIDENCE) {
    const account = await accountStatus(market.marketPda);
    let detail = "";
    if (account.data) {
      const decoded = decodeMarketAccount(account.data);
      detail = `settled=${decoded.settled} winner=${decoded.winningOutcome} total=${decoded.totalPoolLamports}`;
    }
    rows.push({ kind: "account", name: `${market.name} Market PDA`, id: market.marketPda, status: account.status, detail });
    rows.push({
      kind: "account",
      name: `${market.name} vault`,
      id: market.vaultPda,
      status: (await accountStatus(market.vaultPda)).status,
    });
    for (const [kind, sig] of Object.entries(market.txs)) {
      rows.push({ kind: "tx", name: `${market.name} ${kind}`, id: sig, status: await txStatus(sig) });
    }
  }

  rows.push({
    kind: "account",
    name: "daily_scores_roots PDA",
    id: DAILY_ROOT_PDA,
    status: (await accountStatus(DAILY_ROOT_PDA)).status,
  });
  for (const account of CORE_ACCOUNTS) {
    rows.push({ kind: "account", name: account.label, id: account.address, status: (await accountStatus(account.address)).status });
  }

  console.table(
    rows.map((row) => ({
      kind: row.kind,
      name: row.name,
      status: row.status,
      id: `${row.id.slice(0, 10)}...${row.id.slice(-6)}`,
      detail: row.detail ?? "",
    }))
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
