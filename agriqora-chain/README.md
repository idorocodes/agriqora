# AgriQora Solana Registry

Anchor program for farmer-authorized, privacy-preserving produce batch commitments.

## On-chain data

- An opaque 32-byte batch reference derived from the public AgriQora batch ID.
- A salted SHA-256 commitment to an off-chain produce snapshot.
- The signing farmer wallet, revision number, and chain timestamp.
- Append-only revision accounts; the configured admin wallet authorizes revisions.

Names, phone numbers, email addresses, farm addresses, the snapshot, and the random salt remain in PostgreSQL. The browser and API must never send those private values as instruction arguments. The API verifies the signature, signer, program-owned PDA, current snapshot, and commitment before reporting a batch as verified.

## Build and test

Requirements: Rust, Solana CLI with SBF tools, and Anchor CLI 1.1.x.

```sh
cargo test -p agriqora_registry
cargo build-sbf --manifest-path programs/agriqora_registry/Cargo.toml
```

The repository intentionally contains a placeholder program address. Before deployment, create a local program deploy keypair in `target/deploy/`, run `anchor keys sync`, and review the generated address in both `Anchor.toml` and `src/lib.rs`. The keypair must stay on the operator's machine and must not be committed or shared.

```sh
solana config set --url devnet
anchor build
anchor deploy --provider.cluster devnet
```

Deployment and registry initialization require a funded devnet operator wallet and explicit operator approval. No deployment or transactions have been performed by this repository setup.

After deployment, set the exact program address in both `SOLANA_PROGRAM_ID` for the API and `VITE_SOLANA_PROGRAM_ID` for the web build. Set `SOLANA_RPC_URL` and `VITE_SOLANA_RPC_URL` to devnet RPC URLs. Apply the API database migration before starting the API:

```sh
pnpm --dir ../agriqora-api migrate
```

The admin PDA configuration must be initialized once before using `append_revision`. Initial farmer batch registration does not require that configuration. The on-chain append-revision instruction is implemented and tested, but the current admin correction UI still records corrections only in the PostgreSQL platform audit ledger; it does not yet submit an on-chain revision.

## Transaction behavior

The farmer reviews the devnet, public batch reference, commitment, fee payer, and initialized account before choosing **Sign and anchor**. The wallet signs and pays account rent plus transaction fees. The app simulates before requesting the signature and waits for confirmed commitment. If submission fails, the database entry remains pending and can be retried.

This is a hackathon MVP program, not audited financial software. It performs no token transfers and stores no private farmer data on-chain.