# Trigger.dev Durable Jobs

## Purpose

This repo now uses Trigger.dev as the durable background job layer for the current private-beta critical path.

This batch covers:

- market data refresh
- market data provider sync
- reconciliation jobs
- notification follow-up jobs
- support follow-up jobs
- search index rebuild jobs

This batch does **not** change billing flows.

## Folder structure

Trigger tasks live under `/trigger` and follow a stable family-first naming convention:

- `/trigger/market-data/provider-sync.ts`
- `/trigger/market-data/snapshot-refresh.ts`
- `/trigger/reconciliation/portfolio-reconciliation.ts`
- `/trigger/notifications/notification-follow-up.ts`
- `/trigger/support/support-follow-up.ts`
- `/trigger/search/search-index-rebuild.ts`

Shared app-side durable job helpers live in:

- `/lib/durable-jobs.ts`

## Required environment variables

Add these to `.env.local` for local development:

```bash
TRIGGER_SECRET_KEY=tr_dev_your_secret_here
TRIGGER_PROJECT_REF=your_trigger_project_ref
MARKET_DATA_REFRESH_SECRET=your_market_refresh_secret
CRON_SECRET=your_cron_secret
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
NEXT_PUBLIC_SUPPORT_EMAIL=support@example.com
ADMIN_EMAILS=you@example.com
```

Recommended when you want real market-data writes:

```bash
MARKET_DATA_PROVIDER_URL=https://your-provider-endpoint
MARKET_DATA_PROVIDER_TOKEN=your_provider_token
```

Optional for the next delivery phase but not required for this batch:

```bash
RESEND_API_KEY=your_resend_key
```

## Trigger.dev setup

1. Log into Trigger.dev:

```bash
npx trigger.dev login
```

2. Confirm the project reference and place it in `TRIGGER_PROJECT_REF`.

3. Start the app and Trigger worker in separate terminals:

```bash
npm run dev
npm run trigger:dev
```

## Where jobs are triggered from

### Market data

- `/api/market-data/provider-sync`
- `/api/admin/market-data/provider-sync`
- `/api/market-data/refresh`
- `/api/admin/market-data/refresh`

### Reconciliation

- `/api/portfolio/reconciliations`

### Notification follow-up

- `/api/account/consents/events`

### Support follow-up

- `/api/account/support/follow-up`
- subscriber UI trigger on `/account/support`

### Search rebuild

- `/api/admin/search-index/rebuild`
- admin UI trigger on `/admin/search-screener-truth`

### Run visibility

- `/api/admin/durable-jobs`
- `/api/admin/durable-jobs?format=csv`
- `/api/admin/durable-jobs?family=search&format=csv`
- `/api/admin/durable-jobs?family=support&format=csv`

## Current behavior

### Market data provider sync

Queues a Trigger job which:

1. fetches the provider payload
2. validates the payload through existing ingest logic
3. writes snapshots through the existing ingestion path

### Market data snapshot refresh

Queues a Trigger job which:

1. runs the existing refresh path
2. writes the current first-wave snapshot coverage

### Portfolio reconciliation checkpoint

Queues a Trigger job which:

1. replays the protected user reconciliation payload
2. creates the checkpoint inside the existing portfolio memory lane

### Notification follow-up

Queues a Trigger job which:

1. reads the saved notification event context from the request payload
2. advances delivery posture based on consent and channel
3. updates the shared notification event lane

### Support follow-up

Queues a Trigger job which:

1. creates a follow-up request row in the local support-follow-up lane
2. schedules or flags the callback through Trigger
3. updates the request with current follow-up posture and job id

### Search index rebuild

Queues a Trigger job which:

1. rebuilds the current route-backed search posture
2. refreshes lane counts and next steps from registry/query/review signals

## Logging and failure visibility

- Each Trigger task uses `logger.info(...)` for start and completion logs.
- Failed Trigger runs are visible through `/api/admin/durable-jobs`.
- The search and support surfaces now show recent Trigger-backed run history.

## First end-to-end verification

Use search rebuild first because it does not depend on external market-data providers.

1. Start the app:

```bash
npm run dev
```

2. Start Trigger locally:

```bash
npm run trigger:dev
```

3. Open `/admin/search-screener-truth`.

4. Click `Queue rebuild`.

5. Confirm the API returns a job id.

6. Watch the Trigger terminal for:

- task picked up
- task completed

7. Open `/api/admin/durable-jobs?family=search` and confirm the latest run moved to `Succeeded`.

8. Refresh `/admin/search-screener-truth` and confirm:

- the durable job summary changed
- the recent Trigger run appears
- search-index lane timestamps or notes were refreshed

## Notes

- Trigger.dev is the durable execution layer in this batch.
- Search rebuilds now target the Meilisearch document layer while the broader canonical asset graph still continues to mature underneath.
- Support follow-up, public contact acknowledgements, notification summary emails, and account-change alerts now route through Resend-backed durable jobs. Live provider verification still requires a real Resend API key and verified sender.
- Billing remains deferred and untouched in this implementation.
