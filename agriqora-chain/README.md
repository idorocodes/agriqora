# AgriQora Solana Registry

Anchor program for server-relayed, privacy-preserving produce batch commitments.

## On-chain data

- An opaque 32-byte batch reference derived from the public AgriQora batch ID.
- A salted SHA-256 commitment to an off-chain produce snapshot.
- The platform registry authority, revision number, and chain timestamp.
- Append-only revision accounts; the configured admin wallet authorizes revisions.

Names, phone numbers, email addresses, farm addresses, the snapshot, and the random salt remain in PostgreSQL. The browser and API must never send those private values as instruction arguments. The API verifies the signature, signer, program-owned PDA, current snapshot, and commitment before reporting a batch as verified.

## Build and test

Requirements: Rust, Solana CLI with SBF tools, and Anchor CLI 1.1.x.

```sh
cargo test -p agriqora_registry
cargo build-sbf --manifest-path programs/agriqora_registry/Cargo.toml
```

The devnet program is deployed at `HfnLEJnmphpMcuUALQAYNfTeybGSbQKCQmFPhTCLNDJA`. The upgrade keypair must stay on the operator's machine and must not be committed or shared.

```sh
solana config set --url devnet
anchor build
anchor deploy --provider.cluster devnet
```

Program upgrades require the configured upgrade authority. Batch anchors are submitted by the API's configured server signer.

Set `SOLANA_PROGRAM_ID` and `SOLANA_RPC_URL` in the API environment. Set `SOLANA_AUTHORITY_KEYPAIR_PATH` to a secret-mounted keypair file available only to the API, or use the secret `SOLANA_AUTHORITY_KEYPAIR` variable. Never put the signer in web configuration. Apply the API database migrations before starting the API:

```sh
pnpm --dir ../agriqora-api migrate
```

The API submits batches using a server-side devnet authority. The Anchor registry config is initialized automatically on first submission, provided its admin matches that server authority. Farmers do not connect a Solana wallet. The on-chain append-revision instruction is implemented and tested, but the current admin correction UI still records corrections only in the PostgreSQL platform audit ledger; it does not yet submit an on-chain revision.

## Transaction behavior

The farmer asks AgriQora to anchor the batch. The server signer pays account rent and transaction fees, submits the transaction, waits for confirmed commitment, and verifies the created PDA. The server keypair must be mounted only in the API environment; never put it in web variables, source control, logs, or user-facing UI. If submission fails, the database entry remains retryable.

This is a hackathon MVP program, not audited financial software. It performs no token transfers and stores no private farmer data on-chain.