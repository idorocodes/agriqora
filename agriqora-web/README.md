# AgriQora web (frontend)

React + Vite + TypeScript frontend for the AgriQora produce marketplace. It talks to the
`agriqora-api` backend and uses the designer's visual style (cream and forest green, Fraunces + Manrope).

## Status

This is a **partial MVP build**.

| Area | Status |
| --- | --- |
| Marketplace: search, category chips, sort, location filter | Done |
| Produce detail + buyer purchase request (`POST /api/requests`) | Done |
| Trace produce (batch ID lookup, journey, ledger hash, corrections) | Done |
| Solana devnet batch commitments | Implemented; requires program deployment and configuration |
| Learn (lessons) + community announcements | Done |
| Navbar, footer, mobile menu, loading/empty/error states | Done |
| Sign in (phone and password through the API) | Done |
| Join (farmer / buyer registration with password) | Done |
| Buyer dashboard (requests, profile, notifications) | Done |
| Admin dashboard (stats, verify users, listings, requests, ledger corrections, announcements) | Done |
| Farmer dashboard (add/edit/remove produce, reply to buyer requests, farm records, profile, notifications) | Done |

The links for the unbuilt pages show a "Coming in the next update" page.
The shared building blocks for them already exist: `src/lib/auth.tsx` (server-backed session),
`src/lib/api.ts` (every backend endpoint is already typed, including users, requests, records,
community and admin stats), `src/lib/image.ts` (photo compression) and the form components in `src/components/ui.tsx`.

## Run it

```bash
npm install
npm run dev      # http://localhost:5173, forwards /api to http://localhost:3000
```

Start the backend (`agriqora-api`) first. Its `CORS_ORIGIN` must include this site's address.

## Environment

`VITE_API_URL` is the server address (see `.env.example`). Leave it empty in development.
For production set it to your deployed API, for example `https://api.yourdomain.com`, then run
`npm run build`. Vite reads it at build time, so rebuild after changing it.

For Solana batch anchoring, the farmer does not need a Solana wallet: the API submits through
its server-only devnet authority. Configure `SOLANA_PROGRAM_ID`, `SOLANA_RPC_URL`, and
`SOLANA_AUTHORITY_KEYPAIR_PATH` or secret `SOLANA_AUTHORITY_KEYPAIR` on the API host, and
apply the `ProduceAnchor` migration. Do not put the signer in web variables. Private
snapshots and salts stay in PostgreSQL. The admin
correction UI currently writes only to the platform audit ledger and does not submit on-chain
revision transactions.

## Scripts

- `npm run dev`: development server
- `npm run build`: typecheck and production build into `dist/`
- `npm run preview`: serve the production build locally
- `npm test`: unit tests

Deploying `dist/` to Netlify or Vercel works as is (`public/_redirects` and `vercel.json` handle page refreshes).

## Notes on how it matches the backend

- Prices and quantities use the backend's own `priceDisplay` and `quantityLabel`.
- Listings are ordered by the backend ("Recently added" = newest `createdAt` first).
- Seed photos: the backend points to `/src/assets/images/<file>.jpg`. This app serves the same file names
  from `public/images/`. The four included photos were cropped from the designer's screen, so replace them
  with the original high-resolution files (same names) when you have them.
- The farmer's phone number is only shown to signed-in users, but the API itself still returns it to everyone.
- The backend has no login, passwords, profile pictures or "add lesson" endpoint. The sign-in design in
  `src/lib/auth.tsx` identifies users by registered phone number until real authentication exists on the server.


## Demo sign-in (seeded backend data)

- Farmer and buyer: register at /join, or use any seeded phone
- Buyer: Hauwa, 0805 441 9023
- Admin: 0800 000 7711 at /admin/login

Sign-in is a phone-number lookup and the admin page is only hidden in the browser. Do not treat it as secure until the API has real auth.
