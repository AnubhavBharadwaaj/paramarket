/**
 * Step 2 of auth: the on-chain `subscribe` transaction.
 *
 * For the free World Cup tiers (service level 1 or 12) no TxL is spent, but the
 * transaction still runs and records the wallet's subscription on-chain. The
 * resulting tx signature is what `token/activate` verifies.
 *
 * Verified against the IDL `subscribe` instruction:
 *   args:     service_level_id: u16, weeks: u8
 *   accounts: user (signer), pricing_matrix, token_mint, user_token_account,
 *             token_treasury_vault, token_treasury_pda, token_program,
 *             system_program, associated_token_program
 */

import * as anchor from "@coral-xyz/anchor";
import { PublicKey, SystemProgram } from "@solana/web3.js";
import {
  ASSOCIATED_TOKEN_PROGRAM_ID,
  TOKEN_2022_PROGRAM_ID,
  createAssociatedTokenAccountInstruction,
  getAssociatedTokenAddressSync,
} from "@solana/spl-token";
import { PDA_SEEDS } from "./config.ts";
import type { NetworkConfig } from "./config.ts";

export async function subscribeFreeTier(params: {
  program: anchor.Program;
  cfg: NetworkConfig;
  serviceLevelId: number;
  weeks: number;
}): Promise<string> {
  const { program, cfg, serviceLevelId, weeks } = params;
  const programId = program.programId;
  const wallet = program.provider.publicKey!;
  const txlMint = new PublicKey(cfg.txlTokenMint);

  const [tokenTreasuryPda] = PublicKey.findProgramAddressSync(
    [Buffer.from(PDA_SEEDS.tokenTreasury)],
    programId
  );
  const [pricingMatrixPda] = PublicKey.findProgramAddressSync(
    [Buffer.from(PDA_SEEDS.pricingMatrix)],
    programId
  );
  const tokenTreasuryVault = getAssociatedTokenAddressSync(
    txlMint,
    tokenTreasuryPda,
    true,
    TOKEN_2022_PROGRAM_ID,
    ASSOCIATED_TOKEN_PROGRAM_ID
  );
  const userTokenAccount = getAssociatedTokenAddressSync(
    txlMint,
    wallet,
    false,
    TOKEN_2022_PROGRAM_ID,
    ASSOCIATED_TOKEN_PROGRAM_ID
  );
  const preInstructions = [];
  const existingUserTokenAccount =
    await program.provider.connection.getAccountInfo(userTokenAccount);
  if (!existingUserTokenAccount) {
    preInstructions.push(
      createAssociatedTokenAccountInstruction(
        wallet,
        userTokenAccount,
        wallet,
        txlMint,
        TOKEN_2022_PROGRAM_ID,
        ASSOCIATED_TOKEN_PROGRAM_ID
      )
    );
  }

  const txSig = await program.methods
    .subscribe(serviceLevelId, weeks)
    .accounts({
      user: wallet,
      pricingMatrix: pricingMatrixPda,
      tokenMint: txlMint,
      userTokenAccount,
      tokenTreasuryVault,
      tokenTreasuryPda,
      tokenProgram: TOKEN_2022_PROGRAM_ID,
      systemProgram: SystemProgram.programId,
      associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
    })
    .preInstructions(preInstructions)
    .rpc();

  return txSig;
}

/** Request free devnet USDT from the program faucet (devnet only, no args). */
export async function requestDevnetFaucet(params: {
  program: anchor.Program;
  cfg: NetworkConfig;
}): Promise<string> {
  const { program, cfg } = params;
  const programId = program.programId;
  const wallet = program.provider.publicKey!;
  const usdtMint = new PublicKey(cfg.usdtMint);

  const [usdtTreasuryPda] = PublicKey.findProgramAddressSync(
    [Buffer.from(PDA_SEEDS.usdtTreasury)],
    programId
  );
  const [faucetTracker] = PublicKey.findProgramAddressSync(
    [Buffer.from("faucet_tracker"), wallet.toBuffer()],
    programId
  );
  const userUsdtAta = getAssociatedTokenAddressSync(
    usdtMint,
    wallet,
    false,
    TOKEN_2022_PROGRAM_ID,
    ASSOCIATED_TOKEN_PROGRAM_ID
  );

  return program.methods
    .requestDevnetFaucet()
    .accounts({
      user: wallet,
      faucetTracker,
      usdtMint,
      userUsdtAta,
      usdtTreasuryPda,
      tokenProgram: TOKEN_2022_PROGRAM_ID,
      associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
      systemProgram: SystemProgram.programId,
    })
    .rpc();
}
