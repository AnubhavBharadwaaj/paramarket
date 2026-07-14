use anchor_lang::prelude::*;
use anchor_lang::solana_program::{
    instruction::{AccountMeta, Instruction},
    program::{get_return_data, invoke},
};

declare_id!("CWCzF6shQBeGYNJcwip62WvoBM1P6QHCbnGm5MB3c8Pm");

const TXORACLE_VALIDATE_STAT_DISCRIMINATOR: [u8; 8] = [107, 197, 232, 90, 191, 136, 105, 185];

#[program]
pub mod paramarket_spike {
    use super::*;

    pub fn settle_spike(ctx: Context<SettleSpike>, args: ValidateStatArgs) -> Result<bool> {
        let mut data = TXORACLE_VALIDATE_STAT_DISCRIMINATOR.to_vec();
        args.serialize(&mut data)?;

        let ix = Instruction {
            program_id: ctx.accounts.txoracle_program.key(),
            accounts: vec![AccountMeta::new_readonly(
                ctx.accounts.daily_scores_merkle_roots.key(),
                false,
            )],
            data,
        };

        invoke(
            &ix,
            &[
                ctx.accounts.daily_scores_merkle_roots.to_account_info(),
                ctx.accounts.txoracle_program.to_account_info(),
            ],
        )?;

        let (returning_program, returned) =
            get_return_data().ok_or(SpikeError::MissingValidateStatReturnData)?;
        require_keys_eq!(
            returning_program,
            ctx.accounts.txoracle_program.key(),
            SpikeError::UnexpectedReturnDataProgram
        );

        let verdict =
            bool::try_from_slice(&returned).map_err(|_| error!(SpikeError::InvalidBoolReturnData))?;
        msg!("paramarket settle_spike validate_stat={}", verdict);
        Ok(verdict)
    }
}

#[derive(Accounts)]
pub struct SettleSpike<'info> {
    /// CHECK: TxOracle owns and validates this account during validate_stat.
    pub daily_scores_merkle_roots: UncheckedAccount<'info>,
    /// CHECK: Devnet TxOracle program, fixed by address constraint.
    #[account(address = pubkey!("6pW64gN1s2uqjHkn1unFeEjAwJkPGHoppGvS715wyP2J"))]
    pub txoracle_program: UncheckedAccount<'info>,
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

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct TraderPredicate {
    pub threshold: i32,
    pub comparison: Comparison,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub enum Comparison {
    GreaterThan,
    LessThan,
    EqualTo,
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

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub enum BinaryExpression {
    Add,
    Subtract,
}

#[error_code]
pub enum SpikeError {
    #[msg("TxOracle validate_stat did not set return data")]
    MissingValidateStatReturnData,
    #[msg("Return data was not written by the TxOracle program")]
    UnexpectedReturnDataProgram,
    #[msg("TxOracle validate_stat return data was not a serialized bool")]
    InvalidBoolReturnData,
}
