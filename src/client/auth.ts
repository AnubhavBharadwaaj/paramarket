/**
 * TxLINE authentication flow.
 *
 *   1. POST /auth/guest/start           -> guest JWT (Bearer, 30-day)
 *   2. on-chain `subscribe(level, weeks)` (free tier = no TxL spent)
 *   3. POST /api/token/activate          -> long-lived API token (X-Api-Token)
 *
 * Data endpoints then require BOTH headers:
 *   Authorization: Bearer <jwt>
 *   X-Api-Token:   <apiToken>
 *
 * This module owns steps 1 and 3 (pure HTTP). Step 2 (the on-chain subscribe)
 * lives in subscribe.ts because it needs a wallet + Anchor. They're separated
 * so the HTTP layer stays testable without a funded wallet.
 */

import type { NetworkConfig } from "./config.ts";

export interface GuestSession {
  jwt: string;
}

export interface ActivatedToken {
  apiToken: string;
}

/** Step 1: anonymous guest session. Returns a 30-day JWT. */
export async function startGuestSession(cfg: NetworkConfig): Promise<GuestSession> {
  const res = await fetch(`${cfg.apiOrigin}/auth/guest/start`, { method: "POST" });
  if (!res.ok) {
    throw new Error(`guest/start failed: ${res.status} ${await safeText(res)}`);
  }
  const body = (await res.json()) as { token?: string };
  if (!body.token) throw new Error("guest/start: no token in response");
  return { jwt: body.token };
}

/**
 * Step 3: activate API access after the on-chain `subscribe` tx confirms.
 *
 * The activation message is signed by the subscribing wallet:
 *   `${txSig}:${leagues.join(",")}:${jwt}`
 * For the standard free-tier bundle, leagues = [] so it signs `${txSig}::${jwt}`.
 *
 * @param signMessage  fn that returns a detached signature over the message bytes
 */
export async function activateApiToken(params: {
  cfg: NetworkConfig;
  jwt: string;
  txSig: string;
  leagues: number[];
  signMessage: (msg: Uint8Array) => Promise<Uint8Array>;
}): Promise<ActivatedToken> {
  const { cfg, jwt, txSig, leagues, signMessage } = params;

  const messageString = `${txSig}:${leagues.join(",")}:${jwt}`;
  const signature = await signMessage(new TextEncoder().encode(messageString));
  const walletSignature = Buffer.from(signature).toString("base64");

  const res = await fetch(`${cfg.apiBaseUrl}/token/activate`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${jwt}` },
    body: JSON.stringify({ txSig, walletSignature, leagues }),
  });
  if (!res.ok) {
    throw new Error(`token/activate failed: ${res.status} ${await safeText(res)}`);
  }
  const rawBody = await res.text();
  const body = rawBody.trim().startsWith("{")
    ? ((JSON.parse(rawBody) as { token?: string } | string))
    : rawBody.trim();
  const apiToken = typeof body === "string" ? body : body.token;
  if (!apiToken) throw new Error("token/activate: no token in response");
  return { apiToken };
}

/** Build the auth headers for all data endpoints. */
export function authHeaders(jwt: string, apiToken: string): Record<string, string> {
  return { Authorization: `Bearer ${jwt}`, "X-Api-Token": apiToken };
}

async function safeText(res: Response): Promise<string> {
  try {
    return await res.text();
  } catch {
    return "<no body>";
  }
}
