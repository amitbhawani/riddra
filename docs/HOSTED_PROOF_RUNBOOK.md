# Hosted Proof Runbook

## Goal

Execute one strict hosted-proof pass from the cleaned codebase without deployment-time guesswork, preview fallback, or admin leakage.

## Blocker classifications

- `Config blocker`
  - Missing or incorrect environment/config values.
- `Migration blocker`
  - Hosted DB schema is missing a required migration.
- `Backfill blocker`
  - Hosted DB table exists but required proof rows are absent or incomplete.
- `Auth blocker`
  - Real sign-in, callback, session continuity, or protected-route enforcement fails.
- `Access-control blocker`
  - Public route leaks internal surfaces or admin route is reachable without real admin access.
- `CMS blocker`
  - Published/unpublished content boundaries are wrong.
- `API blocker`
  - Required API route fails, returns malformed data, or leaks unauthorized access.
- `Runtime blocker`
  - Hosted runtime uses local JSON, local bypass, or dev fallback behavior.
- `Provider blocker`
  - External provider dependency is disabled or misconfigured.

## Execution order

### 1. Config verification

#### 1.1 Runtime mode and anti-bypass config
- Verify:
  - `RIDDRA_RUNTIME_MODE=hosted`
  - `RIDDRA_DURABLE_DATA_RUNTIME=hosted_db`
  - `LOCAL_AUTH_BYPASS=false`
  - `OPEN_ADMIN_ACCESS=false`
  - `DEV_PUBLISHABLE_FALLBACK=false`
- Expected pass:
  - Hosted runtime is explicit.
  - Local JSON, open admin access, and dev publishable fallback are all disabled.
- Expected fail:
  - Any of the above is unset, contradictory, or points to local/dev behavior.
- Blocker classification:
  - `Runtime blocker`

#### 1.2 Core hosted app config
- Verify:
  - `NEXT_PUBLIC_SITE_URL`
  - `NEXT_PUBLIC_SUPABASE_URL`
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
  - `SUPABASE_SERVICE_ROLE_KEY`
  - `NEXT_PUBLIC_LAUNCH_MODE`
- Expected pass:
  - All required hosted app values exist and match the intended hosted environment.
- Expected fail:
  - Missing site URL, Supabase keys, or launch mode.
- Blocker classification:
  - `Config blocker`

#### 1.3 Search, worker, and provider config
- Verify:
  - `MEILISEARCH_HOST`
  - `MEILISEARCH_API_KEY`
  - `MEILISEARCH_INDEX_PREFIX`
  - `TRIGGER_SECRET_KEY`
  - `TRIGGER_PROJECT_REF`
  - `MARKET_DATA_PROVIDER_URL`
  - `MARKET_DATA_PROVIDER_TOKEN`
  - `MARKET_DATA_REFRESH_SECRET` or `CRON_SECRET`
- Expected pass:
  - Search, jobs, and market-data refresh can run in hosted mode without local fallbacks.
- Expected fail:
  - Any required value is missing or still points to local-only tooling.
- Blocker classification:
  - `Config blocker`

#### 1.4 Email/support config if enabled
- Verify only if support/email proof is in scope:
  - `RESEND_API_KEY`
  - `RESEND_FROM_EMAIL`
  - support destination config such as `NEXT_PUBLIC_SUPPORT_EMAIL`
- Expected pass:
  - Hosted support and outbound email can be exercised.
- Expected fail:
  - Email/provider values are absent or clearly placeholder-only.
- Blocker classification:
  - `Provider blocker`

### 2. Hosted DB migrations

Apply migrations in this exact order:

1. `db/migrations/0011_market_data_durability.sql`
2. `db/migrations/0016_benchmark_ohlcv_history.sql`
3. `db/migrations/0018_fund_composition_snapshots.sql`
4. `db/migrations/0019_sector_performance_snapshots.sql`
5. `db/migrations/0020_index_component_weight_snapshots.sql`
6. `db/migrations/0021_mutual_funds_benchmark_index_slug.sql`
7. `db/migrations/0022_mutual_fund_nav_history.sql`
8. `db/migrations/0023_public_data_snapshot_tables.sql`

- Expected pass:
  - All migrations apply cleanly and the durable public tables exist in hosted DB.
- Expected fail:
  - Migration error, missing table, missing index, or partial schema state.
- Blocker classification:
  - `Migration blocker`

### 3. Hosted durable-lane backfill

#### 3.1 Generate the backfill pack
- Run:
```bash
npm run backfill:public-durable-sql > /tmp/public-durable-backfill.sql
```
- Expected pass:
  - Deterministic SQL is generated for all 9 durable public lanes.
- Expected fail:
  - Script fails or omits one of the required durable lanes.
- Blocker classification:
  - `Backfill blocker`

#### 3.2 Apply the backfill SQL to hosted DB
- Apply `/tmp/public-durable-backfill.sql` to hosted Postgres/Supabase.
- Expected pass:
  - Covered proof rows are inserted into all required public durable tables.
- Expected fail:
  - SQL execution fails or leaves any required proof lane empty.
- Blocker classification:
  - `Backfill blocker`

#### 3.3 Minimum hosted-proof coverage
- Verify hosted DB coverage for:
  - `benchmark_ohlcv_history`
    - `nifty50`, `sensex`, `banknifty`, `finnifty`
  - `mutual_fund_nav_history`
    - `hdfc-mid-cap-opportunities`, `sbi-bluechip-fund`
  - `fund_factsheet_snapshots`
    - the same 2 flagship funds
  - `fund_holding_snapshots`
    - the same 2 flagship funds
  - `fund_sector_allocation_snapshots`
    - the same 2 flagship funds
  - `stock_fundamental_snapshots`
    - `tata-motors`, `infosys`, `hdfc-bank`, `reliance-industries`
  - `stock_shareholding_snapshots`
    - `tata-motors`, `infosys`, `hdfc-bank`, `reliance-industries`
  - `sector_performance_snapshots`
    - `auto`, `it-services`, `banking`, `consumer`, `pharma`, `energy`
  - `index_component_weight_snapshots`
    - `nifty50`, `sensex`, `banknifty`, `finnifty`
- Expected pass:
  - Every required proof row exists before UI proof begins.
- Expected fail:
  - Any target slug/index/sector is missing from hosted DB.
- Blocker classification:
  - `Backfill blocker`

### 4. Auth proof

#### 4.1 Open `/login`
- Expected pass:
  - Login page loads without localhost/dev wording.
  - No indication that local bypass is active.
- Expected fail:
  - Page shows preview/dev auth wording, broken auth state, or missing provider config errors.
- Blocker classification:
  - `Auth blocker`

#### 4.2 Open `/signup`
- Expected pass:
  - Signup page loads without local preview auth wording.
  - Public copy is launch-safe.
- Expected fail:
  - Signup flow still implies local-only auth continuity or cannot initiate.
- Blocker classification:
  - `Auth blocker`

#### 4.3 Exercise `/auth/callback`
- Open the real provider login flow and let it return through `/auth/callback`.
- Expected pass:
  - Callback resolves cleanly into authenticated app state.
  - No callback misconfiguration error appears.
- Expected fail:
  - Redirect loop, callback error, missing site URL, or Supabase auth failure.
- Blocker classification:
  - `Auth blocker`

#### 4.4 Open `/account`
- Expected pass:
  - Authenticated user lands on account surface with a real hosted session.
- Expected fail:
  - Anonymous user is let in, or authenticated session is not preserved.
- Blocker classification:
  - `Auth blocker`

#### 4.5 Open `/account/workspace`
- Expected pass:
  - Protected workspace opens for the signed-in user.
  - Refreshing the page retains the hosted session.
- Expected fail:
  - Session continuity breaks on refresh or page incorrectly opens without auth.
- Blocker classification:
  - `Auth blocker`

### 5. Public route proof

#### 5.1 Open `/stocks/tata-motors`
- Expected pass:
  - Page renders from hosted DB-backed public lanes.
  - Stock fundamentals and shareholding are present for Tata Motors.
  - No local preview wording appears.
  - No admin/operator CTA is visible.
- Expected fail:
  - Missing durable data, preview override, admin leakage, or obvious JSON/dev behavior.
- Blocker classification:
  - `Runtime blocker`, `Backfill blocker`, or `Access-control blocker`

#### 5.2 Open `/mutual-funds/hdfc-mid-cap-opportunities`
- Expected pass:
  - NAV history, factsheet, holdings, allocation, and benchmark-backed comparisons render from hosted DB.
  - No preview override or generic read-failure state appears.
- Expected fail:
  - Scheme-history lane fails, factsheet/composition rows are absent, or benchmark lane is missing despite backfill.
- Blocker classification:
  - `Backfill blocker` or `Runtime blocker`

#### 5.3 Open `/nifty50`
- Expected pass:
  - Index chart and composition depth render from hosted benchmark and composition tables.
  - No placeholder-heavy or preview-backed benchmark behavior appears.
- Expected fail:
  - Chart or component blocks are empty because hosted benchmark/index rows were not read.
- Blocker classification:
  - `Backfill blocker` or `Runtime blocker`

#### 5.4 Open `/markets`
- Expected pass:
  - Benchmark board and sector-performance board render from hosted DB data.
  - No placeholder fallback is visible for the covered sectors/benchmarks.
- Expected fail:
  - Sector board or index cards are empty, stale, or clearly using local/dev behavior.
- Blocker classification:
  - `Backfill blocker` or `Runtime blocker`

#### 5.5 Open `/learn/what-is-open-interest`
- Expected pass:
  - Shared public product-page shell renders cleanly.
  - No admin/operator CTA is visible.
- Expected fail:
  - Legacy shell drift or internal/admin CTA leakage is still visible.
- Blocker classification:
  - `Access-control blocker`

#### 5.6 Open `/newsletter/investor-weekly`
- Expected pass:
  - Shared public product-page shell renders cleanly.
  - Editorial route does not expose admin/operator links or internal launch language.
- Expected fail:
  - Legacy shell drift or internal/admin CTA leakage remains visible.
- Blocker classification:
  - `Access-control blocker`

#### 5.7 Public no-leakage proof
- Spot-check these public routes:
  - `/screener`
  - `/reports/fii-dii`
  - `/ipo`
  - `/charts`
  - `/trader-workstation`
  - `/market-copilot`
  - `/option-chain`
  - `/mobile-app`
- Expected pass:
  - No visible user-facing CTA, helper link, or route suggestion points to `/admin`, `/api/admin`, `/build-tracker`, `/launch-readiness`, or operator-only tools.
- Expected fail:
  - Any public surface visibly exposes an internal/admin route.
- Blocker classification:
  - `Access-control blocker`

### 6. CMS proof

#### 6.1 Published content proof
- Open published routes already expected to resolve from CMS/public records:
  - `/stocks/tata-motors`
  - `/mutual-funds/hdfc-mid-cap-opportunities`
  - `/newsletter/investor-weekly`
  - one published reports/article route if present in hosted CMS
- Expected pass:
  - Pages resolve normally from published content.
- Expected fail:
  - Published route 404s or falls back to dev-only content behavior.
- Blocker classification:
  - `CMS blocker`

#### 6.2 Unpublished content privacy proof
- Open one intentionally unpublished or nonexistent slug in each relevant family:
  - stock
  - mutual fund
  - newsletter
  - learn/article if applicable
- Expected pass:
  - Route returns `not found` behavior.
  - No dev publishable fallback content appears.
- Expected fail:
  - Unpublished content leaks through a fallback path.
- Blocker classification:
  - `CMS blocker`

#### 6.3 Explicit no-dev-fallback proof
- Verify hosted runtime is not using development publishable fallback.
- Expected pass:
  - With `DEV_PUBLISHABLE_FALLBACK=false`, unpublished slugs never resolve.
- Expected fail:
  - Hidden or missing CMS content still resolves publicly.
- Blocker classification:
  - `Runtime blocker` or `CMS blocker`

### 7. Admin proof

#### 7.1 Open `/admin` while unauthenticated or as non-admin
- Expected pass:
  - Access is denied or redirected away from admin surfaces.
- Expected fail:
  - Public/non-admin user can open the admin home.
- Blocker classification:
  - `Access-control blocker`

#### 7.2 Open `/admin` as real admin
- Expected pass:
  - Admin home loads only for authenticated admin identity.
- Expected fail:
  - Valid admin cannot access, or access depends on local bypass.
- Blocker classification:
  - `Auth blocker` or `Access-control blocker`

#### 7.3 Open `/admin/market-data` as real admin
- Expected pass:
  - Market Data Ops surface opens with real admin runtime.
  - No open-access shortcut is required.
- Expected fail:
  - Route is blocked for real admin, or reachable for non-admin.
- Blocker classification:
  - `Access-control blocker`

### 8. API proof

#### 8.1 Open `GET /api/search/suggestions`
- Expected pass:
  - API returns a normal hosted search response and does not depend on local-only search behavior.
- Expected fail:
  - API errors because Meilisearch/config is missing or route is misconfigured.
- Blocker classification:
  - `API blocker` or `Config blocker`

#### 8.2 TradingView datafeed APIs
- Open:
  - `GET /api/tradingview/datafeed/config`
  - `GET /api/tradingview/datafeed/search`
  - `GET /api/tradingview/datafeed/resolve`
  - `GET /api/tradingview/datafeed/bars`
- Expected pass:
  - Datafeed routes respond successfully and return hosted market-data outputs backed by the intended hosted lane.
- Expected fail:
  - 4xx/5xx responses, malformed payloads, or missing hosted market data.
- Blocker classification:
  - `API blocker`, `Backfill blocker`, or `Config blocker`

#### 8.3 Admin market-data APIs as admin
- Open as real admin:
  - `POST /api/admin/market-data/refresh`
  - any additional admin market-data routes needed for provider sync proof
- Expected pass:
  - Hosted secrets are accepted and the route executes under admin control.
- Expected fail:
  - Missing secret/provider config, auth failure, or public access leakage.
- Blocker classification:
  - `API blocker`, `Provider blocker`, or `Access-control blocker`

### 9. Email/support proof if enabled

#### 9.1 Submit one hosted support/contact flow
- Open the hosted contact/support path used by the public app.
- Expected pass:
  - Submission is accepted and enters the expected queued/sent state.
- Expected fail:
  - Support flow cannot submit, or delivery state is absent.
- Blocker classification:
  - `Provider blocker` or `API blocker`

#### 9.2 Verify delivery/admin visibility
- Open the relevant admin/support delivery surface if enabled.
- Expected pass:
  - Result shows queued, sent, or explicit failure state without local placeholders.
- Expected fail:
  - No record exists or state tracking is broken.
- Blocker classification:
  - `Provider blocker`

## Explicit proof gates

### Hosted runtime uses DB only
- Proof target:
  - `/stocks/tata-motors`
  - `/mutual-funds/hdfc-mid-cap-opportunities`
  - `/nifty50`
  - `/markets`
- Pass:
  - Durable public data appears only after hosted DB migrations/backfill are applied.
  - No route continues working from local JSON when hosted DB rows are absent.
- Fail:
  - Hosted route still resolves from local JSON or preview fallback.
- Blocker classification:
  - `Runtime blocker`

### No dev JSON is active
- Proof target:
  - same flagship pages above plus one missing-row test route if available
- Pass:
  - Missing hosted rows produce honest unavailable/not-connected states.
- Fail:
  - Missing hosted rows silently resolve from dev JSON mirrors.
- Blocker classification:
  - `Runtime blocker`

### No public admin/operator leakage remains
- Proof target:
  - `/screener`
  - `/reports/fii-dii`
  - `/ipo`
  - `/charts`
  - `/trader-workstation`
  - `/market-copilot`
  - `/option-chain`
  - `/mobile-app`
  - `/learn/what-is-open-interest`
  - `/newsletter/investor-weekly`
- Pass:
  - No visible admin/operator routes are presented as normal user CTAs.
- Fail:
  - Any public page exposes `/admin`, `/api/admin`, launch/readiness consoles, or operator-only tooling.
- Blocker classification:
  - `Access-control blocker`

### Bypass is off
- Proof target:
  - `/login`
  - `/auth/callback`
  - `/account`
  - `/admin`
- Pass:
  - Public and admin auth both require real hosted identity and session continuity.
- Fail:
  - Access still depends on local bypass or open admin access.
- Blocker classification:
  - `Auth blocker` or `Runtime blocker`

### Unpublished CMS content does not leak
- Proof target:
  - one unpublished/nonexistent slug in stock, mutual fund, learn or newsletter families
- Pass:
  - Route does not resolve publicly.
- Fail:
  - Hidden/unpublished content leaks through dev fallback.
- Blocker classification:
  - `CMS blocker`

## Completion rule

Hosted proof passes only if:
- all required config is present
- migrations through `0023` are applied
- backfill completes for all 9 durable lanes
- auth continuity works with bypass off
- flagship public pages render from hosted DB-backed lanes
- `/admin` and `/admin/market-data` require real admin runtime
- `/api/search/suggestions` and TradingView datafeed APIs respond correctly
- unpublished CMS content does not leak
- no public admin/operator leakage remains

If any one of the above fails, hosted proof is blocked and should be recorded using the blocker classification from the failing step.
