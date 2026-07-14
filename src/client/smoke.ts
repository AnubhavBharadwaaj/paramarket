/**
 * STAGE 0 LIVE SMOKE TEST
 * =======================
 * Proves the foundation everything else stands on, against the real devnet API.
 * Run this on your machine (it needs network access to txline-dev.txodds.com).
 *
 *   npx tsx src/client/smoke.ts
 *     or
 *   node --experimental-strip-types src/client/smoke.ts
 *
 * PASS CRITERIA (Stage 0 eval gate):
 *   [1] guest JWT obtained from the live devnet host
 *   [2] at least one SSE frame received from the SCORES stream
 *   [3] at least one SSE frame received from the ODDS stream
 *
 * NOTE ON AUTH: the score/odds streams may require the full activated API token
 * (guest JWT + on-chain subscribe + activate). This smoke test first tries with
 * the guest JWT only. If the streams 401/403, that CONFIRMS activation is
 * required — set TXLINE_API_TOKEN in the env (from your Stage-0 activate run)
 * and re-run. Either outcome is a useful, definitive result.
 */

import fs from "node:fs";
import { getConfig } from "./config.ts";
import { startGuestSession } from "./auth.ts";
import { streamFeed, type SseEvent } from "./stream.ts";

const NETWORK = (process.env.TXLINE_NETWORK ?? "devnet") as "devnet" | "mainnet";

// Prefer an explicit env token; otherwise auto-load the one activate.ts saved.
function loadSavedToken(): { jwt?: string; apiToken: string } {
  if (process.env.TXLINE_API_TOKEN) return { apiToken: process.env.TXLINE_API_TOKEN };
  try {
    const saved = JSON.parse(fs.readFileSync(".txline-token.json", "utf8"));
    if (saved.network === NETWORK && saved.apiToken) {
      console.log("[smoke] using saved token from .txline-token.json");
      return { jwt: saved.jwt, apiToken: saved.apiToken };
    }
  } catch {
    /* no saved token yet */
  }
  return { apiToken: "" };
}
const SAVED = loadSavedToken();
const API_TOKEN = SAVED.apiToken;
const WAIT_MS = Number(process.env.SMOKE_WAIT_MS ?? 30_000);

function log(step: string, msg: string) {
  console.log(`[${new Date().toISOString()}] ${step}  ${msg}`);
}

async function firstEvent(
  cfg: ReturnType<typeof getConfig>,
  jwt: string,
  apiToken: string,
  feed: "scores" | "odds",
  timeoutMs: number
): Promise<SseEvent | null> {
  return new Promise((resolve) => {
    let done = false;
    const finish = (e: SseEvent | null) => {
      if (done) return;
      done = true;
      handle.stop();
      resolve(e);
    };
    const handle = streamFeed({
      cfg,
      jwt,
      apiToken,
      feed,
      onEvent: (e) => finish(e),
      onError: (err) => log(`  ${feed}`, `stream error: ${err.message}`),
      onReconnect: (n) => log(`  ${feed}`, `reconnect attempt ${n}`),
    });
    setTimeout(() => finish(null), timeoutMs);
  });
}

async function main() {
  const cfg = getConfig(NETWORK);
  log("STAGE0", `network=${NETWORK} host=${cfg.apiOrigin}`);

  // [1] guest JWT — reuse the one the token was activated with, if saved.
  const jwt = SAVED.jwt ?? (await startGuestSession(cfg)).jwt;
  log("[1] AUTH", `guest JWT ready (${jwt.slice(0, 12)}…, len ${jwt.length}) ✅`);

  // [2]/[3] dual feed — split the wait budget across both
  const per = Math.floor(WAIT_MS / 2);
  log("STAGE0", `listening up to ${per / 1000}s per feed…`);

  const scores = await firstEvent(cfg, jwt, API_TOKEN, "scores", per);
  if (scores) {
    log("[2] SCORES", `first event id=${scores.id ?? "-"} ✅`);
    console.log("      payload:", JSON.stringify(scores.data).slice(0, 200));
  } else {
    log("[2] SCORES", "no event received ❌ (see auth note in header)");
  }

  const odds = await firstEvent(cfg, jwt, API_TOKEN, "odds", per);
  if (odds) {
    log("[3] ODDS", `first event id=${odds.id ?? "-"} ✅`);
    console.log("      payload:", JSON.stringify(odds.data).slice(0, 200));
  } else {
    log("[3] ODDS", "no event received ❌ (see auth note in header)");
  }

  const pass = Boolean(jwt) && Boolean(scores) && Boolean(odds);
  console.log("\n" + "=".repeat(48));
  console.log(`STAGE 0 RESULT: ${pass ? "PASS ✅" : "PARTIAL / FAIL ❌"}`);
  console.log("=".repeat(48));
  if (!pass && !API_TOKEN) {
    console.log(
      "\nIf JWT succeeded but streams failed, activation is required.\n" +
        "Run the subscribe+activate flow, then re-run with:\n" +
        "  TXLINE_API_TOKEN=<token> npx tsx src/client/smoke.ts"
    );
  }
  process.exit(pass ? 0 : 1);
}

main().catch((err) => {
  console.error("SMOKE TEST CRASHED:", err);
  process.exit(2);
});
