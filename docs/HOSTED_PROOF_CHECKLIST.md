# Hosted Proof Checklist

## Goal

Run one strict hosted-proof pass after durable lane conversion, without mixing local preview behavior into production verification.

## Required environment and config assumptions

- `NEXT_PUBLIC_SITE_URL` is the final hosted origin and is HTTPS.
- `NEXT_PUBLIC_LAUNCH_MODE` is set explicitly for the hosted environment.
- `LOCAL_AUTH_BYPASS=false`
- `OPEN_ADMIN_ACCESS` is unset or `false`
- `DEV_PUBLISHABLE_FALLBACK` is unset or `false`
- `RIDDRA_DURABLE_DATA_RUNTIME` is unset or explicitly `hosted_db`
- `NEXT_PUBLIC_SUPABASE_URL` is present
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` is present
- `SUPABASE_SERVICE_ROLE_KEY` is present
- Google OAuth is configured in launch config and provider console
- `TRIGGER_SECRET_KEY` is present
- `TRIGGER_PROJECT_REF` is present
- `MEILISEARCH_HOST` is present
- `MEILISEARCH_API_KEY` is present
- `MEILISEARCH_INDEX_PREFIX` is present
- `MARKET_DATA_PROVIDER_URL` is present
- `MARKET_DATA_PROVIDER_TOKEN` is present
- `MARKET_DATA_REFRESH_SECRET` or `CRON_SECRET` is present
- `RESEND_API_KEY` is present if email/support proof is included
- `RESEND_FROM_EMAIL` is present if email/support proof is included
- support destination fields are configured:
  - `NEXT_PUBLIC_SUPPORT_EMAIL`
  - or hosted contact/support inbox values in launch config
- admin email list is configured in launch config
- beta-approved email list is configured if beta-protected surfaces remain enabled

## Runtime branching pass/fail rules

### Pass

- Hosted auth uses real Supabase session cookies.
- Hosted public pages do not use local auth bypass.
- Hosted admin pages require real admin identity.
- Hosted publishable content does not use development fallback records.
- Hosted durable data reads use DB-backed lanes only.
- Hosted worker and job flows use real hosted runtime config.
- Hosted public pages do not expose internal/admin-only links as user-facing calls to action.

### Fail

- Any hosted route resolves through local JSON or local memory fallback for a public durable lane.
- Any hosted route uses `LOCAL_AUTH_BYPASS`, `OPEN_ADMIN_ACCESS`, or `DEV_PUBLISHABLE_FALLBACK`.
- Any admin route is reachable without a verified admin session.
- Any public surface visibly links users into `/admin` routes.
- Any durable public lane is empty because migrations or hosted ingestion were skipped.

## Pages to verify

### Public flagship proof

- `/stocks/tata-motors`
- `/mutual-funds/hdfc-mid-cap-opportunities`
- `/nifty50`
- `/markets`

Expected:
- no localhost/dev wording
- real DB-backed public data
- no preview override
- no internal route leakage

### Public family proof

- `/learn/what-is-open-interest`
- `/learn/events/tata-motors-results`
- `/learn/tracks/beginner-investor-track`
- `/newsletter/investor-weekly`
- `/etfs`
- `/pms`
- `/aif`
- `/sif`
- `/reports`

Expected:
- shared public shell renders correctly
- clean truth wording
- no admin/operator UI exposed as public CTA

### Auth and continuity proof

- `/login`
- `/signup`
- `/auth/callback`
- `/account`
- `/account/workspace`

Expected:
- sign-in works with bypass off
- refresh/reload continuity survives
- protected pages redirect correctly when unauthenticated

### Admin proof

- `/admin`
- `/admin/auth-activation`
- `/admin/launch-config-console`
- `/admin/market-data`
- `/admin/search-screener-truth`
- `/admin/public-launch-qa`

Expected:
- admin session required
- non-admin users redirected away
- no open-access behavior in hosted runtime

## APIs to verify

### Public and auth

- `GET /auth/callback`
- auth actions under `app/(auth)/actions.ts`

Expected:
- callback succeeds with hosted site URL and Supabase keys
- login/signup flows do not expose development fallback messaging

### Market and durable data

- `POST /api/market-data/refresh`
- tradingview datafeed routes:
  - `/api/tradingview/datafeed/search`
  - `/api/tradingview/datafeed/resolve`
  - `/api/tradingview/datafeed/bars`

Expected:
- hosted runtime reads DB-backed market data
- refresh route rejects missing hosted secrets cleanly

### Admin-protected APIs

- `/api/admin/payment-events`
- `/api/admin/research-archive-records`
- `/api/admin/email-delivery-log`
- `/api/admin/broker-sync-registry`

Expected:
- non-admin requests fail
- admin requests succeed with real session

## CMS proof steps

1. Verify one published public record exists for each family:
- stock
- mutual fund
- newsletter
- research article

2. Verify public route resolves from publishable CMS record only.

3. Verify unpublished or missing slugs return `notFound()` behavior instead of development fallback.

4. Verify admin/operator CMS mutations require service-role runtime and admin identity.

5. Verify hosted environment has `DEV_PUBLISHABLE_FALLBACK=false`.

## Source and truth proof steps

### Benchmark and public market data

1. Confirm hosted DB contains rows for:
- `benchmark_ohlcv_history`
- `mutual_fund_nav_history`
- `fund_factsheet_snapshots`
- `fund_holding_snapshots`
- `fund_sector_allocation_snapshots`
- `stock_fundamental_snapshots`
- `stock_shareholding_snapshots`
- `sector_performance_snapshots`
- `index_component_weight_snapshots`

2. Confirm representative public pages render from those rows.

3. Confirm a missing DB row yields explicit unavailable/not-connected copy, not development preview.

4. Confirm benchmark history never falls back to preview in hosted runtime.

### Trust copy

1. Confirm public pages do not show:
- local preview auth wording
- private operator notes
- raw backend errors

2. Confirm admin-only footer and admin-only links remain hidden on public pages.

## Worker and email/support proof steps

### Worker/jobs

1. Verify Trigger runtime config exists in hosted env.
2. Run one durable market refresh job.
3. Run one search rebuild or equivalent durable job.
4. Confirm worker logs and output state are visible in admin surfaces.

### Email/support

1. Verify Resend config is present.
2. Submit one hosted support/contact flow.
3. Confirm queued -> sent or queued -> failed state is visible.
4. Confirm user-facing support wording matches real delivery posture.

## Current blockers before hosted proof

- Some public routes still contain visible `/admin` links and should be cleaned before hosted proof, because public pages must not leak internal surfaces.
- Runtime hosting detection still exists in some non-data helpers through `isHostedRuntimeEnvironment()` and should be treated as a proof target during hosted verification.
- The new durable tables and readers are conversion-ready, but hosted migrations and row backfill must happen before proof.
- Auth proof still depends on bypass-off verification with real Google OAuth and real session cookies.
- Email/support proof still depends on live Resend and support destination configuration.
