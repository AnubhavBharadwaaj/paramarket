import fs from "node:fs";
import path from "node:path";
import { Connection } from "@solana/web3.js";
import { DEVNET_RPC, RECEIPT_SETTLEMENT_TX, STAGE1_TRUE_TX } from "../app/lib/constants";
import { MARKET_EVIDENCE } from "../app/lib/marketEvidence";

const STAGE1_FALSE_TX = "2VavzgtQt9595Lmr1sfkDR5TRZ4LTiYwmWZyp8e6y6Fps9xrRfAsxaFyPTecS3nQLTgBBzw7cBzQ1aeeGfaMJy88";
const connection = new Connection(process.env.SOLANA_RPC_URL ?? DEVNET_RPC, "confirmed");

const txs: Record<string, string> = {
  "stage1-true": STAGE1_TRUE_TX,
  "stage1-false": STAGE1_FALSE_TX,
  "receipt-settlement": RECEIPT_SETTLEMENT_TX,
};

for (const market of MARKET_EVIDENCE) {
  for (const [kind, sig] of Object.entries(market.txs)) {
    txs[`${market.evidencePrefix}-${kind}`] = sig;
  }
}

async function main() {
  fs.mkdirSync("evidence", { recursive: true });
  for (const [name, signature] of Object.entries(txs)) {
    let transaction = null;
    let error: string | undefined;
    for (let attempt = 0; attempt < 5; attempt += 1) {
      try {
        transaction = await connection.getTransaction(signature, {
          maxSupportedTransactionVersion: 0,
          commitment: "confirmed",
        });
        error = undefined;
        break;
      } catch (err) {
        error = String(err instanceof Error ? err.message : err);
        await new Promise((resolve) => setTimeout(resolve, 500 * (attempt + 1)));
      }
    }
    const record = {
      signature,
      fetchedAt: new Date().toISOString(),
      cluster: "devnet",
      status: transaction ? "live" : "pruned_or_unavailable",
      transaction,
      error,
    };
    fs.writeFileSync(path.join("evidence", `${name}.json`), `${JSON.stringify(record, null, 2)}\n`);
    console.log(`${name}: ${record.status}`);
    await new Promise((resolve) => setTimeout(resolve, 450));
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
