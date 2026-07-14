import { PublicKey } from "@solana/web3.js";

export const DEVNET_RPC = "https://api.devnet.solana.com";
export const TXORACLE_PROGRAM_ID = new PublicKey("6pW64gN1s2uqjHkn1unFeEjAwJkPGHoppGvS715wyP2J");
export const SPIKE_PROGRAM_ID = new PublicKey("CWCzF6shQBeGYNJcwip62WvoBM1P6QHCbnGm5MB3c8Pm");
export const PARAMARKET_PROGRAM_ID = "HPzBCd83X61od45nq2ofu4G1sRMiguuvZk87vGqsmxtN";
export const DEVNET_FEE_PAYER = new PublicKey("7cSRptYJT9dfm6Kw1gftkTK5YS67dCNFA5j8zgV8EB9t");
export const DAILY_ROOT_PDA = "EdJuEftTBNwXRWJpvYCziVxKT87qMDVu9V6HC7PwGffB";
export const FIXTURE_ID = 18213979;
export const RECEIPT_SETTLEMENT_TX =
  "5XKM2B9yJ8kwJvReBfG5kbeDvNA74jGTCZLMmct5EweeEuo8nMQjs2j7bE6aZBJqVBtiCYeSvsTYoLjq4XWoiVtg";
export const STAGE1_TRUE_TX =
  "3Ssn7YTHUdbeQXRpTLnv8ifPcwDZHQiw3QnLXbLypuvgxanLZnbi7KJ3NjaiL1RZdqwu9kd13UocV4nePhZaUSQ2";

export function explorerTx(sig: string) {
  return `https://explorer.solana.com/tx/${sig}?cluster=devnet`;
}
