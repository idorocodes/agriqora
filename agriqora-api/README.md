# AgriQora API

Express + TypeScript agricultural marketplace API backed by PostgreSQL through Prisma. Existing response payloads are preserved; persisted JSON payloads retain the current frontend field names while relational/indexed columns enforce uniqueness and speed common lookups.

## Local development

Requirements: Node.js 20+, npm, Docker Compose.

```bash
npm install
cp .env.example .env
docker compose up -d postgres
npm run migrate:dev -- --name init
npm run seed
npm run dev
```

Open `http://localhost:3000/api/health`. To build/run production locally:

```bash
npm run build
npm start
```

`DATABASE_URL`, `PORT`, and `CORS_ORIGIN` are the supported environment variables. `CORS_ORIGIN` accepts one origin or a comma-separated allowlist. For Railway/Render, provision PostgreSQL and set `DATABASE_URL` to the provider's connection string; set `CORS_ORIGIN` to the deployed frontend origin. Run `npm run migrate` as a release/deploy step, then `npm run seed` once for demo data. Keep database credentials private.

## Scripts

- `npm run dev` — TypeScript watch server.
- `npm run build` — generate Prisma client and compile TypeScript.
- `npm start` — run compiled server.
- `npm run migrate:dev -- --name <name>` — create/apply a development migration.
- `npm run migrate` — apply committed migrations in deployment.
- `npm run seed` — idempotently fill empty demo tables from `src/data/seed/*`.
- `npm run db:studio` — open Prisma Studio.

The seed script does not overwrite tables that already contain data. To reseed a disposable development database, clear its tables first and run the seed script again.

## API

All routes remain under `/api` and retain the `{ success, data?, error? }` response convention. Existing routes include health, produce CRUD, traceability and correction append, requests, users, farm records, community posts, learning modules, notifications, and admin statistics.

## Persistence and ledger

The repository in `src/data/store.ts` is the data-access layer. The `data` JSON column on each entity preserves the existing public response shape; indexed columns hold fields used for uniqueness, filtering, sorting, and ledger integrity. Users have a unique phone number; produce batch IDs and ledger block numbers/hashes are unique. Category/status and other query fields are indexed.

Produce creation and correction append both lock the singleton `LedgerState` row inside a serializable PostgreSQL transaction, read the next block number and previous hash, insert the ledger block, and advance the state. That prevents concurrent writes from choosing the same block number or branching from the same previous hash. Ledger rows are append-only by application convention; database permissions/triggers can further enforce this in production. The legacy seeded blocks retain their original demo hashes and have no historical previous-hash values, because the old in-memory demo did not store them.

## Image storage

`src/utils/imageStorage.ts` deliberately isolates image handling. Today it returns the provided base64 data URL or existing fallback path unchanged. For Cloudinary/S3, replace `persistImage` with an upload adapter: validate MIME type and byte size, upload the bytes to a private/public bucket as appropriate, and return a stable HTTPS URL. Prefer signed uploads or server-side upload credentials in environment variables; do not persist large base64 payloads in PostgreSQL long term. Existing records can be migrated by reading their data URLs and uploading them in a one-off script.

## Authentication follow-up

The schema already includes nullable `User.passwordHash`, `User.authVersion`, `OtpChallenge` (phone, hashed OTP, expiry, attempt count, consumedAt), and `AuthSession` (userId, hashed refresh token, expiry, revokedAt, device metadata), so the core password/OTP/JWT-session storage does not require another schema migration. Keep OTPs and refresh tokens hashed at rest. Add JWT authentication middleware and explicit role/ownership authorization middleware to every write route; never trust role, phone, or user ID from the request body. Passwords should be hashed with Argon2id or bcrypt, and OTP delivery should be rate-limited. Admin creation should remain an operator-controlled process rather than public signup.

## Deployment notes

Use a managed PostgreSQL service from Railway, Render, or Neon. Set `DATABASE_URL`, `PORT`, and `CORS_ORIGIN` in the service environment. Run migrations during deployment (`npm run migrate`) before switching traffic. For Neon, use the provider's pooled URL for runtime if recommended by its current docs and a direct connection URL for migration commands if the provider requires it.

## Authentication and authorization

The API now supports phone/password authentication with short-lived JWT access tokens and rotating opaque refresh tokens. All mutating marketplace endpoints are protected by default and require a bearer access token plus an allowed role. Public reads remain public. Signup is available at `POST /api/auth/register`; the legacy `POST /api/users` endpoint is now admin-only so it cannot be used to create accounts without credentials.

### Endpoints

- `POST /api/auth/register` — body: `{ "name": "Ada", "phone": "+2348012345678", "password": "at-least-10-characters", "role": "farmer" }`; optional profile fields match the existing user object. Only `farmer` and `buyer` can self-register, and new accounts start unverified.
- `POST /api/auth/login` — body: `{ "phone": "+2348012345678", "password": "..." }`; returns `{ success: true, data: { accessToken, refreshToken, user } }`.
- `POST /api/auth/refresh` — body: `{ "refreshToken": "..." }`; rotates the refresh token and returns a new access token.
- `POST /api/auth/logout` — body: `{ "refreshToken": "..." }`; revokes that refresh session.
- `GET /api/auth/me` — requires `Authorization: Bearer <accessToken>`.

Send `Authorization: Bearer <accessToken>` with every write request. Role policy: farmers/admins can manage produce and farm records; buyers/admins can create purchase requests; farmers/admins can respond to requests; only admins can correct traceability records, verify users, or use the legacy user-creation endpoint; authenticated farmers, buyers, and admins can create community posts. All other write endpoints are denied unless explicitly added to the policy.

Access tokens expire after 15 minutes. Refresh tokens expire after 30 days, are stored only as SHA-256 hashes, and rotate on refresh. Passwords are hashed with bcrypt. Set `AUTH_ACCESS_SECRET` to a unique, random secret in production. The development fallback is intentionally not suitable for production. Set `DEMO_ADMIN_PASSWORD` and `DEMO_BUYER_PASSWORD` before running the first seed; defaults are provided for local demos only. The seeded admin phone is `+234 800 000 7711`; Hauwa's buyer phone is `+234 805 441 9023`. The demo passwords are the values of those environment variables (defaults: `AgriQoraAdmin!2026` and `HauwaBuyer!2026`). Existing users in a database that was already seeded before this auth change will not have passwords assigned automatically; use a controlled admin password-reset workflow or re-create the local demo database and seed it again.

OTP login is not wired yet because it needs an SMS/WhatsApp delivery provider and provider credentials. The schema's `OtpChallenge` model is reserved for that extension; do not return real OTP codes from production endpoints.
