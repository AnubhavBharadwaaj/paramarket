/**
 * TxLINE network configuration.
 *
 * All addresses verified against the on-chain devnet IDL
 * (idl/txoracle_devnet.json, program 6pW64gN1s2uqjHkn1unFeEjAwJkPGHoppGvS715wyP2J)
 * and the TxLINE Program Addresses documentation. Do NOT mix networks:
 * a devnet `subscribe` tx must be activated against the devnet API host.
 */

export type Network = "mainnet" | "devnet";

export interface NetworkConfig {
  network: Network;
  rpcUrl: string;
  /** Root origin, e.g. https://txline-dev.txodds.com — used for /auth/guest/start */
  apiOrigin: string;
  /** API base, e.g. https://txline-dev.txodds.com/api — used for data + activate */
  apiBaseUrl: string;
  programId: string;
  txlTokenMint: string;
  usdtMint: string;
}

export const CONFIG: Record<Network, NetworkConfig> = {
  mainnet: {
    network: "mainnet",
    rpcUrl: "https://api.mainnet-beta.solana.com",
    apiOrigin: "https://txline.txodds.com",
    apiBaseUrl: "https://txline.txodds.com/api",
    programId: "9ExbZjAapQww1vfcisDmrngPinHTEfpjYRWMunJgcKaA",
    txlTokenMint: "Zhw9TVKp68a1QrftncMSd6ELXKDtpVMNuMGr1jNwdeL",
    usdtMint: "Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB",
  },
  devnet: {
    network: "devnet",
    rpcUrl: "https://api.devnet.solana.com",
    apiOrigin: "https://txline-dev.txodds.com",
    apiBaseUrl: "https://txline-dev.txodds.com/api",
    programId: "6pW64gN1s2uqjHkn1unFeEjAwJkPGHoppGvS715wyP2J",
    txlTokenMint: "4Zao8ocPhmMgq7PdsYWyxvqySMGx7xb9cMftPMkEokRG",
    usdtMint: "ELWTKspHKCnCfCiCiqYw1EDH77k8VCP74dK9qytG2Ujh",
  },
};

/** Free World Cup tiers — no TxL payment required. 1 = 60s delay, 12 = real-time. */
export const SERVICE_LEVEL = {
  WORLD_CUP_DELAYED: 1,
  WORLD_CUP_REALTIME: 12,
} as const;

/** PDA seeds, verified from the IDL and Program Addresses docs. */
export const PDA_SEEDS = {
  tokenTreasury: "token_treasury_v2",
  pricingMatrix: "pricing_matrix",
  usdtTreasury: "usdt_treasury",
  dailyScoresRoots: "daily_scores_roots",
  dailyBatchRoots: "daily_batch_roots",
  tenDailyFixturesRoots: "ten_daily_fixtures_roots",
} as const;

export function getConfig(network: Network): NetworkConfig {
  return CONFIG[network];
}
