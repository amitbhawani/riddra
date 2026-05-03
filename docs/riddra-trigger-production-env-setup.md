# Riddra Trigger.dev Production Env Setup

## Purpose

This runbook covers the exact production wiring needed for the Yahoo `daily_same_day_only` cron lane to queue durable Trigger.dev work safely.

It is based on the current repo code paths:

- [trigger/market-data/yahoo-daily-update-cron.ts](/Users/amitbhawani/Documents/Ai%20FinTech%20Platform/trigger/market-data/yahoo-daily-update-cron.ts)
- [app/api/cron/yahoo-daily-update/_shared.ts](/Users/amitbhawani/Documents/Ai%20FinTech%20Platform/app/api/cron/yahoo-daily-update/_shared.ts)
- [app/api/cron/yahoo-daily-update/worker/route.ts](/Users/amitbhawani/Documents/Ai%20FinTech%20Platform/app/api/cron/yahoo-daily-update/worker/route.ts)
- [lib/durable-jobs.ts](/Users/amitbhawani/Documents/Ai%20FinTech%20Platform/lib/durable-jobs.ts)
- [trigger.config.ts](/Users/amitbhawani/Documents/Ai%20FinTech%20Platform/trigger.config.ts)

## Current code truth

- The cron entry routes authenticate using:
  - `x-riddra-refresh-secret: <MARKET_DATA_REFRESH_SECRET>`
  - `Authorization: Bearer <CRON_SECRET>`
- The app queues Trigger work only when both are present:
  - `TRIGGER_SECRET_KEY`
  - `TRIGGER_PROJECT_REF`
- The worker task id is:
  - `yahoo-daily-update-cron-worker`
- The worker is intentionally bounded to:
  - `25` stocks per invocation
- The worker progress is surfaced in the Import Control Center from durable metadata:
  - `processedStocks`
  - `totalStocks`
  - `pendingStocks`
  - `nextCursor`
  - `lastProcessedSymbol`
  - `nextPendingSymbol`

## Required Vercel Production env vars

### Cron auth

At least one of these must be present:

- `MARKET_DATA_REFRESH_SECRET`
- `CRON_SECRET`

Recommended:

- keep `MARKET_DATA_REFRESH_SECRET` as the primary operator header secret
- keep `CRON_SECRET` only if you also want bearer-token manual triggering

### Trigger app wiring

Both of these are required:

- `TRIGGER_SECRET_KEY`
- `TRIGGER_PROJECT_REF`

What they do:

- `TRIGGER_SECRET_KEY`
  - used by [lib/trigger-auth.ts](/Users/amitbhawani/Documents/Ai%20FinTech%20Platform/lib/trigger-auth.ts) and [lib/durable-jobs.ts](/Users/amitbhawani/Documents/Ai%20FinTech%20Platform/lib/durable-jobs.ts) to authenticate the SDK for `tasks.trigger(...)` and `runs.list(...)`
- `TRIGGER_PROJECT_REF`
  - used by [lib/trigger-config.ts](/Users/amitbhawani/Documents/Ai%20FinTech%20Platform/lib/trigger-config.ts) and [trigger.config.ts](/Users/amitbhawani/Documents/Ai%20FinTech%20Platform/trigger.config.ts) to target the correct Trigger.dev project for task deployment and run listing

### Trigger worker runtime envs

The Trigger task runtime also needs the envs required by the Yahoo worker code it executes.

Minimum required today:

- `NEXT_PUBLIC_SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`

Why:

- the worker ultimately uses [lib/yahoo-finance-batch-import.ts](/Users/amitbhawani/Documents/Ai%20FinTech%20Platform/lib/yahoo-finance-batch-import.ts), which writes durable job state and market data through [lib/supabase/admin.ts](/Users/amitbhawani/Documents/Ai%20FinTech%20Platform/lib/supabase/admin.ts)

Not currently required by the worker path itself:

- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

It is still part of normal hosted app baseline, but it is not the minimum blocker for this Trigger worker lane.

## Where to get the Trigger values

### `TRIGGER_SECRET_KEY`

Source:

- Trigger.dev dashboard
- open the correct project
- open the **API Keys** page
- copy the production secret key

Expected format from Trigger.dev docs:

- production keys typically start with `tr_prod_`

Reference:

- [Trigger.dev API keys docs](https://trigger.dev/docs/apikeys)

### `TRIGGER_PROJECT_REF`

Source:

- Trigger.dev dashboard
- open the correct project
- open project settings or the project reference shown for management APIs
- copy the exact project ref used by that project

Important:

- use the exact value shown by Trigger.dev for this project
- do not invent a slug from memory
- docs examples for management APIs show an external project ref like `proj_...`

Reference:

- [Trigger.dev env var management docs](https://trigger.dev/docs/management/envvars/retrieve)

### `MARKET_DATA_REFRESH_SECRET` and `CRON_SECRET`

Source:

- Riddra operator-managed secret inventory
- not from Trigger.dev

## Redeploy order

### 1. Update Vercel Production envs

Add or confirm:

- `MARKET_DATA_REFRESH_SECRET` or `CRON_SECRET`
- `TRIGGER_SECRET_KEY`
- `TRIGGER_PROJECT_REF`

### 2. Redeploy the web app

After envs are saved, redeploy Production so the Next.js app sees them.

Acceptable paths:

- Vercel dashboard redeploy
- `vercel --prod`

### 3. Deploy Trigger tasks to the correct Trigger project

The app env alone is not enough. The Trigger tasks must exist in the target Trigger project too.

Deploy from the repo with the correct Trigger auth:

```bash
npm run trigger:deploy
```

This uses:

- [trigger.config.ts](/Users/amitbhawani/Documents/Ai%20FinTech%20Platform/trigger.config.ts)
- `TRIGGER_PROJECT_REF`

### 4. Add the worker runtime envs inside Trigger.dev

In Trigger.dev, make sure the deployed task environment has:

- `NEXT_PUBLIC_SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`

Reference:

- [Trigger.dev deploy environment variable docs](https://trigger.dev/docs/deploy-environment-variables)

## How to test safely

### Fast readiness check

Use the authenticated diagnostics fast path:

```bash
curl -s \
  -H "x-riddra-refresh-secret: <MARKET_DATA_REFRESH_SECRET>" \
  "https://www.riddra.com/api/cron/yahoo-daily-update?diagnostics=1"
```

Expected status:

- `200`

Expected JSON shape:

```json
{
  "ok": true,
  "mode": "diagnostics",
  "cronWindow": "primary",
  "source": "cron_get",
  "targetDate": "2026-04-30",
  "readiness": {
    "configured": true,
    "executionSecretReady": true,
    "executionAuthMode": [
      "x-riddra-refresh-secret",
      "authorization: bearer"
    ],
    "cronWindows": ["primary", "retry"],
    "worker": {
      "taskId": "yahoo-daily-update-cron-worker",
      "route": "/api/cron/yahoo-daily-update/worker",
      "maxItemsPerRun": 25
    },
    "durableJobs": {
      "configured": true,
      "triggerSecretReady": true,
      "triggerSecretSource": "env",
      "triggerProjectReady": true,
      "missingEnv": []
    },
    "controlCenter": {
      "route": "/admin/market-data/import-control-center",
      "activeCronProgressVisible": true,
      "durableJobsRoute": "/api/admin/durable-jobs?family=market_data"
    }
  }
}
```

### Queue-entry check

After diagnostics pass:

```bash
curl -s \
  -H "x-riddra-refresh-secret: <MARKET_DATA_REFRESH_SECRET>" \
  "https://www.riddra.com/api/cron/yahoo-daily-update"
```

Expected behavior:

- returns quickly
- does not process the full universe in one HTTP request
- returns `ok: true`
- returns a durable `jobId`
- returns `durableTaskRunId` when a Trigger task was queued

Expected response shape:

```json
{
  "ok": true,
  "cronWindow": "primary",
  "source": "cron_get",
  "targetDate": "2026-04-30",
  "mode": "created_or_resumed_or_already_running",
  "jobId": "job_...",
  "created": true,
  "reused": false,
  "requestedCount": 2157,
  "queueWorker": true,
  "dispatchCursor": 0,
  "lastProcessedSymbol": null,
  "nextPendingSymbol": "RELIANCE.NS",
  "durableTaskRunId": "run_..."
}
```

### Retry-lane check

Use the same pattern on:

- `/api/cron/yahoo-daily-update-retry`

Expected behavior:

- same quick response
- only remainder work path should be prepared for retry

### Control Center check

Open:

- `/admin/market-data/import-control-center`

Expected visible proof:

- cron status enabled
- last cron run time
- last cron result
- active cron job progress
- processed vs total stocks
- next pending symbol

## Blocked state meaning

If diagnostics returns any of the following, the cron lane is not production-ready yet:

- `executionSecretReady: false`
- `durableJobs.configured: false`
- `durableJobs.triggerSecretReady: false`
- `durableJobs.triggerProjectReady: false`
- non-empty `durableJobs.missingEnv`

## Final operator note

Do not treat a successful cron auth response as proof that Trigger is ready.

Production is only truly ready when all three layers are aligned:

1. Vercel cron auth env is present
2. Vercel app has `TRIGGER_SECRET_KEY` and `TRIGGER_PROJECT_REF`
3. Trigger.dev has the deployed worker task and its required runtime envs
