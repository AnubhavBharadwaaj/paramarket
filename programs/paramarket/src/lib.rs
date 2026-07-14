use anchor_lang::prelude::*;
use anchor_lang::system_program;
use anchor_lang::solana_program::{
    instruction::{AccountMeta, Instruction},
    program::{get_return_data, invoke, invoke_signed},
    system_instruction,
};

declare_id!("HPzBCd83X61od45nq2ofu4G1sRMiguuvZk87vGqsmxtN");

const TXORACLE_VALIDATE_STAT_DISCRIMINATOR: [u8; 8] = [107, 197, 232, 90, 191, 136, 105, 185];
const TXORACLE_DEVNET: Pubkey = pubkey!("6pW64gN1s2uqjHkn1unFeEjAwJkPGHoppGvS715wyP2J");
const MAX_OUTCOMES: usize = 4;
const LABEL_LEN: usize = 16;
const FEE_BPS: u64 = 100;

#[program]
pub mod paramarket {
    use super::*;

    pub fn initialize_market(
        ctx: Context<InitializeMarket>,
        market_id: u64,
        spec: MarketSpecInput,
    ) -> Result<()> {
        require!(spec.num_outcomes >= 2, ParaError::InvalidOutcomeCount);
        require!(
            (spec.num_outcomes as usize) <= MAX_OUTCOMES,
            ParaError::InvalidOutcomeCount
        );
        require!(
            spec.outcome_labels.len() == spec.num_outcomes as usize,
            ParaError::InvalidOutcomeCount
        );
        require!(
            spec.num_outcomes != 2 || spec.comparison != Comparison::EqualTo,
            ParaError::BinaryEqualUnsupported
        );
        require!(spec.close_ts <= spec.min_final_ts, ParaError::InvalidTimeConfig);
        let market = &mut ctx.accounts.market;
        market.authority = ctx.accounts.payer.key();
        market.market_id = market_id;
        market.bump = ctx.bumps.market;
        market.vault_bump = ctx.bumps.market_vault;
        market.spec = MarketSpec::from_input(spec)?;
        market.pool_totals = [0; MAX_OUTCOMES];
        market.total_pool = 0;
        market.settled = false;
        market.voided = false;
        market.winning_outcome = u8::MAX;
        Ok(())
    }

    pub fn place_bet(ctx: Context<PlaceBet>, outcome_idx: u8, amount: u64) -> Result<()> {
        let market = &mut ctx.accounts.market;
        require!(!market.settled && !market.voided, ParaError::MarketClosed);
        require!(amount > 0, ParaError::ZeroAmount);
        require!(
            Clock::get()?.unix_timestamp <= market.spec.close_ts,
            ParaError::BettingClosed
        );
        require!(
            outcome_idx < market.spec.num_outcomes,
            ParaError::InvalidOutcome
        );

        invoke(
            &system_instruction::transfer(
                &ctx.accounts.bettor.key(),
                &ctx.accounts.market_vault.key(),
                amount,
            ),
            &[
                ctx.accounts.bettor.to_account_info(),
                ctx.accounts.market_vault.to_account_info(),
                ctx.accounts.system_program.to_account_info(),
            ],
        )?;

        let idx = outcome_idx as usize;
        market.pool_totals[idx] = market.pool_totals[idx]
            .checked_add(amount)
            .ok_or(ParaError::MathOverflow)?;
        market.total_pool = market
            .total_pool
            .checked_add(amount)
            .ok_or(ParaError::MathOverflow)?;

        let position = &mut ctx.accounts.position;
        position.market = market.key();
        position.user = ctx.accounts.bettor.key();
        position.bump = ctx.bumps.position;
        position.claimed = false;
        position.amounts[idx] = position.amounts[idx]
            .checked_add(amount)
            .ok_or(ParaError::MathOverflow)?;
        Ok(())
    }

    pub fn settle_with_proof(
        ctx: Context<SettleWithProof>,
        winning_outcome: u8,
        proof: ValidateStatArgs,
    ) -> Result<()> {
        let market = &mut ctx.accounts.market;
        require!(!market.settled && !market.voided, ParaError::AlreadySettled);
        require!(
            Clock::get()?.unix_timestamp >= market.spec.min_final_ts,
            ParaError::SettleTooEarly
        );
        require!(
            winning_outcome < market.spec.num_outcomes,
            ParaError::InvalidOutcome
        );

        // Canonical TxOracle batch timestamp: finalwhistle fw-settle enforces
        // payload.ts == min_timestamp; our Stage 1 tx 3Ssn7... proves raw ts fails.
        require!(
            proof.ts == proof.fixture_summary.update_stats.min_timestamp,
            ParaError::TimestampNotBatchMin
        );
        require!(
            proof.fixture_summary.fixture_id == market.spec.fixture_id,
            ParaError::FixtureMismatch
        );
        require!(
            proof.stat_a.stat_to_prove.key == market.spec.stat_key_a,
            ParaError::StatKeyMismatch
        );
        match (market.spec.stat_key_b, proof.stat_b.as_ref()) {
            (Some(expected), Some(stat_b)) => {
                require!(
                    stat_b.stat_to_prove.key == expected,
                    ParaError::StatKeyMismatch
                );
            }
            (None, None) => {}
            _ => return err!(ParaError::StatKeyMismatch),
        }
        require!(proof.op == market.spec.op, ParaError::PredicateMismatch);

        let mut cpi_args = proof;
        cpi_args.predicate = market.predicate_for_outcome(winning_outcome)?;
        cpi_args.op = market.spec.op;
        let valid = validate_stat_cpi(
            ctx.accounts.txoracle_program.to_account_info(),
            ctx.accounts.daily_scores_merkle_roots.to_account_info(),
            &cpi_args,
        )?;
        require!(valid, ParaError::WrongWinner);

        market.settled = true;
        market.winning_outcome = winning_outcome;
        if market.pool_totals[winning_outcome as usize] == 0 {
            market.voided = true;
        }
        Ok(())
    }

    pub fn claim(ctx: Context<Claim>) -> Result<()> {
        let market = &ctx.accounts.market;
        let position = &mut ctx.accounts.position;
        require!(market.settled, ParaError::NotSettled);
        require!(!position.claimed, ParaError::AlreadyClaimed);
        require!(position.user == ctx.accounts.user.key(), ParaError::Unauthorized);
        require!(position.market == market.key(), ParaError::PositionMismatch);

        let payout = if market.voided {
            position
                .amounts
                .iter()
                .try_fold(0_u64, |acc, x| acc.checked_add(*x))
                .ok_or(ParaError::MathOverflow)?
        } else {
            let win_idx = market.winning_outcome as usize;
            let stake = position.amounts[win_idx];
            require!(stake > 0, ParaError::NothingToClaim);
            let winning_pool = market.pool_totals[win_idx];
            require!(winning_pool > 0, ParaError::NothingToClaim);
            let fee = market
                .total_pool
                .checked_mul(FEE_BPS)
                .ok_or(ParaError::MathOverflow)?
                .checked_div(10_000)
                .ok_or(ParaError::MathOverflow)?;
            let net_pool = market
                .total_pool
                .checked_sub(fee)
                .ok_or(ParaError::MathOverflow)?;
            net_pool
                .checked_mul(stake)
                .ok_or(ParaError::MathOverflow)?
                .checked_div(winning_pool)
                .ok_or(ParaError::MathOverflow)?
        };
        require!(payout > 0, ParaError::NothingToClaim);
        position.claimed = true;

        let market_key = market.key();
        let seeds = &[
            b"vault",
            market_key.as_ref(),
            &[market.vault_bump],
        ];
        invoke_signed(
            &system_instruction::transfer(
                &ctx.accounts.market_vault.key(),
                &ctx.accounts.user.key(),
                payout,
            ),
            &[
                ctx.accounts.market_vault.to_account_info(),
                ctx.accounts.user.to_account_info(),
                ctx.accounts.system_program.to_account_info(),
            ],
            &[seeds],
        )?;
        Ok(())
    }

    pub fn void_market(ctx: Context<VoidMarket>) -> Result<()> {
        let market = &mut ctx.accounts.market;
        require!(
            market.authority == ctx.accounts.authority.key(),
            ParaError::Unauthorized
        );
        require!(!market.settled, ParaError::AlreadySettled);
        market.voided = true;
        market.settled = true;
        Ok(())
    }
}

#[derive(Accounts)]
#[instruction(market_id: u64)]
pub struct InitializeMarket<'info> {
    #[account(mut)]
    pub payer: Signer<'info>,
    #[account(
        init,
        payer = payer,
        space = 8 + Market::INIT_SPACE,
        seeds = [b"market", payer.key().as_ref(), &market_id.to_le_bytes()],
        bump
    )]
    pub market: Account<'info, Market>,
    #[account(
        init,
        payer = payer,
        space = 0,
        owner = system_program::ID,
        seeds = [b"vault", market.key().as_ref()],
        bump
    )]
    /// CHECK: System-owned PDA that receives SOL stakes and signs payouts.
    pub market_vault: UncheckedAccount<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct PlaceBet<'info> {
    #[account(mut)]
    pub bettor: Signer<'info>,
    #[account(mut)]
    pub market: Account<'info, Market>,
    #[account(
        mut,
        seeds = [b"vault", market.key().as_ref()],
        bump = market.vault_bump
    )]
    /// CHECK: System-owned PDA stake vault.
    pub market_vault: UncheckedAccount<'info>,
    #[account(
        init,
        payer = bettor,
        space = 8 + Position::INIT_SPACE,
        seeds = [b"position", market.key().as_ref(), bettor.key().as_ref()],
        bump
    )]
    pub position: Account<'info, Position>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct SettleWithProof<'info> {
    #[account(mut)]
    pub settler: Signer<'info>,
    #[account(mut)]
    pub market: Account<'info, Market>,
    /// CHECK: TxOracle owns and validates this per-day account.
    pub daily_scores_merkle_roots: UncheckedAccount<'info>,
    /// CHECK: Real TxOracle devnet program.
    #[account(address = TXORACLE_DEVNET)]
    pub txoracle_program: UncheckedAccount<'info>,
}

#[derive(Accounts)]
pub struct Claim<'info> {
    #[account(mut)]
    pub user: Signer<'info>,
    pub market: Account<'info, Market>,
    #[account(
        mut,
        seeds = [b"vault", market.key().as_ref()],
        bump = market.vault_bump
    )]
    /// CHECK: System-owned PDA stake vault.
    pub market_vault: UncheckedAccount<'info>,
    #[account(mut)]
    pub position: Account<'info, Position>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct VoidMarket<'info> {
    pub authority: Signer<'info>,
    #[account(mut)]
    pub market: Account<'info, Market>,
}

#[account]
#[derive(InitSpace)]
pub struct Market {
    pub authority: Pubkey,
    pub market_id: u64,
    pub bump: u8,
    pub vault_bump: u8,
    pub spec: MarketSpec,
    pub pool_totals: [u64; MAX_OUTCOMES],
    pub total_pool: u64,
    pub settled: bool,
    pub voided: bool,
    pub winning_outcome: u8,
}

impl Market {
    fn predicate_for_outcome(&self, outcome: u8) -> Result<TraderPredicate> {
        if self.spec.num_outcomes == 2 {
            return Ok(match outcome {
                0 => TraderPredicate {
                    threshold: self.spec.threshold,
                    comparison: self.spec.comparison,
                },
                1 => TraderPredicate {
                    threshold: self.spec.threshold,
                    comparison: self.spec.comparison.invert_binary()?,
                },
                _ => return err!(ParaError::InvalidOutcome),
            });
        }
        if self.spec.num_outcomes == 3 {
            return Ok(match outcome {
                0 => TraderPredicate {
                    threshold: self.spec.threshold,
                    comparison: Comparison::LessThan,
                },
                1 => TraderPredicate {
                    threshold: self.spec.threshold,
                    comparison: Comparison::EqualTo,
                },
                2 => TraderPredicate {
                    threshold: self.spec.threshold,
                    comparison: Comparison::GreaterThan,
                },
                _ => return err!(ParaError::InvalidOutcome),
            });
        }
        err!(ParaError::InvalidOutcomeCount)
    }
}

#[account]
#[derive(InitSpace)]
pub struct Position {
    pub market: Pubkey,
    pub user: Pubkey,
    pub bump: u8,
    pub amounts: [u64; MAX_OUTCOMES],
    pub claimed: bool,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, InitSpace, PartialEq, Eq)]
pub struct MarketSpec {
    pub fixture_id: i64,
    pub stat_key_a: u32,
    pub stat_key_b: Option<u32>,
    pub op: Option<BinaryExpression>,
    pub comparison: Comparison,
    pub threshold: i32,
    pub period: u16,
    pub num_outcomes: u8,
    pub outcome_labels: [[u8; LABEL_LEN]; MAX_OUTCOMES],
    pub min_final_ts: i64,
    pub close_ts: i64,
}

impl MarketSpec {
    fn from_input(input: MarketSpecInput) -> Result<Self> {
        let mut outcome_labels = [[0_u8; LABEL_LEN]; MAX_OUTCOMES];
        for (idx, label) in input.outcome_labels.into_iter().enumerate() {
            outcome_labels[idx] = label;
        }
        Ok(Self {
            fixture_id: input.fixture_id,
            stat_key_a: input.stat_key_a,
            stat_key_b: input.stat_key_b,
            op: input.op,
            comparison: input.comparison,
            threshold: input.threshold,
            period: input.period,
            num_outcomes: input.num_outcomes,
            outcome_labels,
            min_final_ts: input.min_final_ts,
            close_ts: input.close_ts,
        })
    }
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct MarketSpecInput {
    pub fixture_id: i64,
    pub stat_key_a: u32,
    pub stat_key_b: Option<u32>,
    pub op: Option<BinaryExpression>,
    pub comparison: Comparison,
    pub threshold: i32,
    pub period: u16,
    pub num_outcomes: u8,
    pub outcome_labels: Vec<[u8; LABEL_LEN]>,
    pub min_final_ts: i64,
    pub close_ts: i64,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct ValidateStatArgs {
    pub ts: i64,
    pub fixture_summary: ScoresBatchSummary,
    pub fixture_proof: Vec<ProofNode>,
    pub main_tree_proof: Vec<ProofNode>,
    pub predicate: TraderPredicate,
    pub stat_a: StatTerm,
    pub stat_b: Option<StatTerm>,
    pub op: Option<BinaryExpression>,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct ScoresBatchSummary {
    pub fixture_id: i64,
    pub update_stats: ScoresUpdateStats,
    pub events_sub_tree_root: [u8; 32],
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct ScoresUpdateStats {
    pub update_count: i32,
    pub min_timestamp: i64,
    pub max_timestamp: i64,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct ProofNode {
    pub hash: [u8; 32],
    pub is_right_sibling: bool,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, InitSpace)]
pub struct TraderPredicate {
    pub threshold: i32,
    pub comparison: Comparison,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct StatTerm {
    pub stat_to_prove: ScoreStat,
    pub event_stat_root: [u8; 32],
    pub stat_proof: Vec<ProofNode>,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct ScoreStat {
    pub key: u32,
    pub value: i32,
    pub period: i32,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, InitSpace, PartialEq, Eq)]
pub enum Comparison {
    GreaterThan,
    LessThan,
    EqualTo,
}

impl Comparison {
    fn invert_binary(self) -> Result<Self> {
        match self {
            Comparison::GreaterThan => Ok(Comparison::LessThan),
            Comparison::LessThan => Ok(Comparison::GreaterThan),
            Comparison::EqualTo => err!(ParaError::PredicateMismatch),
        }
    }
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, InitSpace, PartialEq, Eq)]
pub enum BinaryExpression {
    Add,
    Subtract,
}

fn validate_stat_cpi<'info>(
    txoracle_program: AccountInfo<'info>,
    daily_scores_merkle_roots: AccountInfo<'info>,
    args: &ValidateStatArgs,
) -> Result<bool> {
    let mut data = TXORACLE_VALIDATE_STAT_DISCRIMINATOR.to_vec();
    args.serialize(&mut data)?;
    let ix = Instruction {
        program_id: txoracle_program.key(),
        accounts: vec![AccountMeta::new_readonly(
            daily_scores_merkle_roots.key(),
            false,
        )],
        data,
    };
    invoke(&ix, &[daily_scores_merkle_roots, txoracle_program])?;
    let (program, returned) = get_return_data().ok_or(ParaError::MissingReturnData)?;
    require_keys_eq!(program, TXORACLE_DEVNET, ParaError::UnexpectedReturnProgram);
    bool::try_from_slice(&returned).map_err(|_| error!(ParaError::InvalidReturnData))
}

#[error_code]
pub enum ParaError {
    #[msg("invalid outcome count")]
    InvalidOutcomeCount,
    #[msg("invalid time configuration")]
    InvalidTimeConfig,
    #[msg("2-outcome markets require GreaterThan/LessThan; EqualTo has no NotEqual inverse")]
    BinaryEqualUnsupported,
    #[msg("market is closed")]
    MarketClosed,
    #[msg("betting is closed")]
    BettingClosed,
    #[msg("zero amount")]
    ZeroAmount,
    #[msg("invalid outcome")]
    InvalidOutcome,
    #[msg("math overflow")]
    MathOverflow,
    #[msg("market already settled")]
    AlreadySettled,
    #[msg("settlement too early")]
    SettleTooEarly,
    #[msg("proof timestamp is not batch minTimestamp")]
    TimestampNotBatchMin,
    #[msg("fixture mismatch")]
    FixtureMismatch,
    #[msg("stat key mismatch")]
    StatKeyMismatch,
    #[msg("predicate mismatch")]
    PredicateMismatch,
    #[msg("wrong winner")]
    WrongWinner,
    #[msg("market not settled")]
    NotSettled,
    #[msg("already claimed")]
    AlreadyClaimed,
    #[msg("unauthorized")]
    Unauthorized,
    #[msg("position mismatch")]
    PositionMismatch,
    #[msg("nothing to claim")]
    NothingToClaim,
    #[msg("TxOracle return data missing")]
    MissingReturnData,
    #[msg("unexpected return data program")]
    UnexpectedReturnProgram,
    #[msg("invalid return data")]
    InvalidReturnData,
}
