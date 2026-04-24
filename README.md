# Riddra

Phase 0 foundation for `riddra.com`.

## What this includes

- Next.js App Router structure
- Homepage
- Pricing page
- Login and signup shells
- SEO-ready route families for stocks, IPOs, and mutual funds
- Screener shell
- Sitemap, robots, manifest, and health route

## Planned stack

- Next.js on Vercel
- Supabase for auth and database
- Redis for hot cache and queues
- Dedicated ingest workers outside Vercel for live data pipelines

## Setup

1. Install Node.js 20 or newer.
2. Run `npm install`.
3. Copy `.env.example` to `.env.local`.
4. Run `npm run dev`.

## Supabase setup

1. Create a Supabase project.
2. Add `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, and `SUPABASE_SERVICE_ROLE_KEY` to `.env.local`.
3. Run the SQL in `db/migrations/0001_phase_0_1_foundation.sql`.
4. Run the SQL in `db/seeds/0001_seed_foundation.sql`.
5. In Supabase Auth, enable Google and email OTP or magic-link auth, then add the callback URL for `/auth/callback`.
6. Visit `/signup`, `/login`, and `/account`.

## Phase 0 next tasks

1. Wire Supabase auth on `/login` and `/signup`.
2. Add the first shared database schema.
3. Replace mock route data with seed records.
4. Connect plan gating for premium routes.
5. Deploy the shell to Vercel.

## Project control files

1. `docs/MASTERPLAN.md` keeps the single source of truth
2. `docs/PROGRESS.md` tracks actual delivery progress
3. `docs/ENGINEERING_STANDARDS.md` keeps design, code, and source decisions standardized
4. `data/source_registry.csv` keeps the official source registry per domain
