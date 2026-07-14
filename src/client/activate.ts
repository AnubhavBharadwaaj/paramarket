/**
 * STAGE 0.5 — ACTIVATION RUNNER
 * =============================
 * Chains the full auth flow to get your API token, which unlocks the data feeds:
 *
 *   guest JWT  ->  on-chain subscribe (free tier)  ->  activate  ->  save token
 *
 * The feeds returned 403 with the guest JWT alone; this produces the X-Api-Token
 * that unblocks them. Run once; it writes .txline-token.json which smoke.ts and
 * the agent read.
 *
 * PREREQUISITES (do these first — see ACTIVATE_STEPS in the run instructions):
 *   - Solana CLI wallet at ~/.config/solana/id.json (or set SOLANA_KEYPAIR)
 *   - Devnet SOL for fees:  solana airdrop 2 --url devnet
 *
 * RUN:
 *   npx tsx src/client/activate.ts
 *
 * On success prints the token and writes .txline-token.json. Then:
 *   npm run smoke     (smoke.ts auto-loads the saved token)
 */

import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import * as anchor from "@coral-xyz/anchor";
import { Connection, Keypair, PublicKey } from "@solana/web3.js";
import nacl from "tweetnacl";
import { getConfig } from "./config.ts";
import { startGuestSession, activateApiToken } from "./auth.ts";
import { subscribeFreeTier } from "./subscribe.ts";

const NETWORK = (process.env.TXLINE_NETWORK ?? "devnet") as "devnet" | "mainnet";
// Devnet documents service level 1 (60s delay). Mainnet also has 12 (real-time).
const SERVICE_LEVEL_ID = Number(process.env.TXLINE_SERVICE_LEVEL ?? 1);
const DURATION_WEEKS = Number(process.env.TXLINE_WEEKS ?? 4);
const SELECTED_LEAGUES: number[] = []; // empty = standard World Cup bundle
const TOKEN_FILE = ".txline-token.json";

function loadKeypair(): Keypair {
  const p =
    process.env.SOLANA_KEYPAIR ??
    path.join(os.homedir(), ".config", "solana", "id.json");
  if (!fs.existsSync(p)) {
    throw new Error(
      `No keypair at ${p}. Create one:\n` +
        `  solana-keygen new --outfile ~/.config/solana/id.json\n` +
        `  solana airdrop 2 --url devnet`
    );
  }
  const secret = Uint8Array.from(JSON.parse(fs.readFileSync(p, "utf8")));
  return Keypair.fromSecretKey(secret);
}

async function main() {
  const cfg = getConfig(NETWORK);
  const payer = loadKeypair();
  console.log(`network=${NETWORK}  wallet=${payer.publicKey.toBase58()}`);

  const connection = new Connection(cfg.rpcUrl, "confirmed");
  const bal = await connection.getBalance(payer.publicKey);
  console.log(`devnet SOL balance: ${(bal / 1e9).toFixed(3)}`);
  if (bal === 0) {
    throw new Error(
      "Wallet has 0 SOL. Fund it:  solana airdrop 2 --url devnet " +
        `--keypair <your keypair>  (wallet ${payer.publicKey.toBase58()})`
    );
  }

  // Anchor program handle (loads the devnet IDL shipped in this repo)
  const wallet = new anchor.Wallet(payer);
  const provider = new anchor.AnchorProvider(connection, wallet, {
    commitment: "confirmed",
  });
  anchor.setProvider(provider);
  const idl = JSON.parse(fs.readFileSync("idl/txoracle_devnet.json", "utf8"));
  const program = new anchor.Program(idl, provider);
  if (!program.programId.equals(new PublicKey(cfg.programId))) {
    throw new Error(
      `IDL program ${program.programId.toBase58()} != ${NETWORK} ${cfg.programId}`
    );
  }

  // Step 1: guest JWT
  const { jwt } = await startGuestSession(cfg);
  console.log(`[1] guest JWT ok (len ${jwt.length})`);

  // Step 2: on-chain subscribe (free tier; no TxL spent)
  console.log(`[2] subscribing on-chain (level ${SERVICE_LEVEL_ID}, ${DURATION_WEEKS}w)…`);
  const txSig = await subscribeFreeTier({
    program,
    cfg,
    serviceLevelId: SERVICE_LEVEL_ID,
    weeks: DURATION_WEEKS,
  });
  console.log(`    subscribe tx: ${txSig}`);
  console.log(`    explorer: https://explorer.solana.com/tx/${txSig}?cluster=devnet`);

  // Step 3: activate — sign `${txSig}:${leagues}:${jwt}` with the wallet key
  const { apiToken } = await activateApiToken({
    cfg,
    jwt,
    txSig,
    leagues: SELECTED_LEAGUES,
    signMessage: async (msg) => nacl.sign.detached(msg, payer.secretKey),
  });
  console.log(`[3] API token activated (len ${apiToken.length}) ✅`);

  fs.writeFileSync(
    TOKEN_FILE,
    JSON.stringify({ network: NETWORK, jwt, apiToken, txSig, ts: Date.now() }, null, 2)
  );
  console.log(`\nsaved ${TOKEN_FILE}. Now run:  npm run smoke`);
}

main().catch((e) => {
  console.error("\nACTIVATION FAILED:", e.message ?? e);
  process.exit(1);
});
