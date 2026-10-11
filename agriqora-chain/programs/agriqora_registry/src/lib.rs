use anchor_lang::prelude::*;

// Replace the placeholder with the public key generated for this program before deployment.
declare_id!("HfnLEJnmphpMcuUALQAYNfTeybGSbQKCQmFPhTCLNDJA");

const CONFIG_SEED: &[u8] = b"config";
const BATCH_SEED: &[u8] = b"batch";
const REVISION_SEED: &[u8] = b"revision";

#[program]
pub mod agriqora_registry {
    use super::*;

    pub fn initialize_config(ctx: Context<InitializeConfig>) -> Result<()> {
        ctx.accounts.config.admin = ctx.accounts.admin.key();
        emit!(ConfigInitialized {
            admin: ctx.accounts.admin.key(),
        });
        Ok(())
    }

    pub fn rotate_admin(ctx: Context<RotateAdmin>, next_admin: Pubkey) -> Result<()> {
        require_keys_neq!(next_admin, Pubkey::default(), RegistryError::InvalidAuthority);
        let previous_admin = ctx.accounts.config.admin;
        ctx.accounts.config.admin = next_admin;
        emit!(AdminRotated {
            previous_admin,
            next_admin,
        });
        Ok(())
    }

    pub fn register_batch(
        ctx: Context<RegisterBatch>,
        batch_ref: [u8; 32],
        commitment: [u8; 32],
    ) -> Result<()> {
        require!(batch_ref != [0; 32], RegistryError::InvalidBatchReference);
        require!(commitment != [0; 32], RegistryError::InvalidCommitment);

        let now = Clock::get()?.unix_timestamp;
        let batch = &mut ctx.accounts.batch;
        batch.batch_ref = batch_ref;
        batch.authority = ctx.accounts.farmer.key();
        batch.latest_revision = 0;
        batch.latest_commitment = commitment;
        batch.created_at = now;

        let revision = &mut ctx.accounts.revision;
        revision.batch_ref = batch_ref;
        revision.revision = 0;
        revision.commitment = commitment;
        revision.previous_commitment = [0; 32];
        revision.authority = ctx.accounts.farmer.key();
        revision.created_at = now;

        emit!(BatchRegistered {
            batch_ref,
            commitment,
            farmer: ctx.accounts.farmer.key(),
            revision: 0,
            slot: Clock::get()?.slot,
        });
        Ok(())
    }

    pub fn append_revision(
        ctx: Context<AppendRevision>,
        batch_ref: [u8; 32],
        revision_number: u64,
        previous_commitment: [u8; 32],
        commitment: [u8; 32],
    ) -> Result<()> {
        require!(commitment != [0; 32], RegistryError::InvalidCommitment);
        require!(
            ctx.accounts.batch.batch_ref == batch_ref,
            RegistryError::InvalidBatchReference
        );
        validate_revision_transition(
            ctx.accounts.batch.latest_revision,
            ctx.accounts.batch.latest_commitment,
            revision_number,
            previous_commitment,
        )?;

        let now = Clock::get()?.unix_timestamp;
        let batch = &mut ctx.accounts.batch;
        batch.latest_revision = revision_number;
        batch.latest_commitment = commitment;

        let revision = &mut ctx.accounts.revision;
        revision.batch_ref = batch_ref;
        revision.revision = revision_number;
        revision.commitment = commitment;
        revision.previous_commitment = previous_commitment;
        revision.authority = ctx.accounts.admin.key();
        revision.created_at = now;

        emit!(RevisionAppended {
            batch_ref,
            revision: revision_number,
            previous_commitment,
            commitment,
            authority: ctx.accounts.admin.key(),
            slot: Clock::get()?.slot,
        });
        Ok(())
    }
}

fn validate_revision_transition(
    latest_revision: u64,
    latest_commitment: [u8; 32],
    revision_number: u64,
    previous_commitment: [u8; 32],
) -> Result<()> {
    require!(
        revision_number == latest_revision + 1,
        RegistryError::InvalidRevision
    );
    require!(
        previous_commitment == latest_commitment,
        RegistryError::PreviousCommitmentMismatch
    );
    Ok(())
}

#[derive(Accounts)]
pub struct InitializeConfig<'info> {
    #[account(
        init,
        payer = admin,
        space = 8 + RegistryConfig::INIT_SPACE,
        seeds = [CONFIG_SEED],
        bump
    )]
    pub config: Account<'info, RegistryConfig>,
    #[account(mut)]
    pub admin: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct RotateAdmin<'info> {
    #[account(mut, seeds = [CONFIG_SEED], bump, has_one = admin @ RegistryError::InvalidAuthority)]
    pub config: Account<'info, RegistryConfig>,
    pub admin: Signer<'info>,
}

#[derive(Accounts)]
#[instruction(batch_ref: [u8; 32], _commitment: [u8; 32])]
pub struct RegisterBatch<'info> {
    #[account(
        init,
        payer = farmer,
        space = 8 + BatchAnchor::INIT_SPACE,
        seeds = [BATCH_SEED, batch_ref.as_ref()],
        bump
    )]
    pub batch: Account<'info, BatchAnchor>,
    #[account(
        init,
        payer = farmer,
        space = 8 + BatchRevision::INIT_SPACE,
        seeds = [REVISION_SEED, batch_ref.as_ref(), &0_u64.to_le_bytes()],
        bump
    )]
    pub revision: Account<'info, BatchRevision>,
    #[account(mut)]
    pub farmer: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
#[instruction(batch_ref: [u8; 32], revision_number: u64, _previous_commitment: [u8; 32], _commitment: [u8; 32])]
pub struct AppendRevision<'info> {
    #[account(seeds = [CONFIG_SEED], bump, has_one = admin @ RegistryError::InvalidAuthority)]
    pub config: Account<'info, RegistryConfig>,
    #[account(
        mut,
        seeds = [BATCH_SEED, batch_ref.as_ref()],
        bump
    )]
    pub batch: Account<'info, BatchAnchor>,
    #[account(
        init,
        payer = admin,
        space = 8 + BatchRevision::INIT_SPACE,
        seeds = [REVISION_SEED, batch_ref.as_ref(), &revision_number.to_le_bytes()],
        bump
    )]
    pub revision: Account<'info, BatchRevision>,
    #[account(mut)]
    pub admin: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[account]
#[derive(InitSpace)]
pub struct RegistryConfig {
    pub admin: Pubkey,
}

#[account]
#[derive(InitSpace)]
pub struct BatchAnchor {
    pub batch_ref: [u8; 32],
    pub authority: Pubkey,
    pub latest_revision: u64,
    pub latest_commitment: [u8; 32],
    pub created_at: i64,
}

#[account]
#[derive(InitSpace)]
pub struct BatchRevision {
    pub batch_ref: [u8; 32],
    pub revision: u64,
    pub commitment: [u8; 32],
    pub previous_commitment: [u8; 32],
    pub authority: Pubkey,
    pub created_at: i64,
}

#[event]
pub struct ConfigInitialized {
    pub admin: Pubkey,
}

#[event]
pub struct AdminRotated {
    pub previous_admin: Pubkey,
    pub next_admin: Pubkey,
}

#[event]
pub struct BatchRegistered {
    pub batch_ref: [u8; 32],
    pub commitment: [u8; 32],
    pub farmer: Pubkey,
    pub revision: u64,
    pub slot: u64,
}

#[event]
pub struct RevisionAppended {
    pub batch_ref: [u8; 32],
    pub revision: u64,
    pub previous_commitment: [u8; 32],
    pub commitment: [u8; 32],
    pub authority: Pubkey,
    pub slot: u64,
}

#[error_code]
pub enum RegistryError {
    #[msg("The caller is not the configured registry administrator")]
    InvalidAuthority,
    #[msg("Batch references cannot be empty")]
    InvalidBatchReference,
    #[msg("Record commitments cannot be empty")]
    InvalidCommitment,
    #[msg("Revision numbers must increase by exactly one")]
    InvalidRevision,
    #[msg("The supplied previous commitment does not match the current revision")]
    PreviousCommitmentMismatch,
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn accepts_next_revision_linked_to_current_commitment() {
        assert!(validate_revision_transition(2, [7; 32], 3, [7; 32]).is_ok());
    }

    #[test]
    fn rejects_skipped_revision_number() {
        assert!(validate_revision_transition(2, [7; 32], 4, [7; 32]).is_err());
    }

    #[test]
    fn rejects_revision_with_wrong_previous_commitment() {
        assert!(validate_revision_transition(2, [7; 32], 3, [8; 32]).is_err());
    }
}