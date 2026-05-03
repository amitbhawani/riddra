# Riddra Cron Timeout Queue Fix Report

Date: 2026-05-01  
Scope: Fix `FUNCTION_INVOCATION_TIMEOUT` on the production Yahoo daily same-day cron route without running a full live import.

## Problem

The production cron route authenticated correctly, but it still tried to process the full strict `daily_same_day_only` universe inside one Vercel request. That meant the route stayed open long enough to hit `FUNCTION_INVOCATION_TIMEOUT`.

## What Changed

### 1. Cron starter is now fast and durable

Updated:

- `/Users/amitbhawani/Documents/Ai FinTech Platform/app/api/cron/yahoo-daily-update/_shared.ts`

The primary and retry cron routes now:

- authenticate
- resolve the expected Indian trading date
- create or reuse a durable parent `stock_import_jobs` row for the strict same-day lane
- queue a Trigger durable worker task
- return quickly with `jobId`, queue state, cursor state, and pending-symbol state

They no longer try to process the whole stock universe inside the Vercel route itself.

### 2. Same-day cron jobs are now resumable parent jobs

Updated:

- `/Users/amitbhawani/Documents/Ai FinTech Platform/lib/yahoo-finance-batch-import.ts`

Added a durable same-day cron preparation path that:

- creates or reuses a strict same-day parent batch job
- scopes the primary lane to stocks still missing the expected trading-date price or snapshot
- scopes the retry lane to stale/failed/pending remainder only
- persists durable metadata including:
  - `jobId`
  - `targetDate`
  - `cronWindow`
  - `requestedStocks`
  - `processedStocks`
  - `pendingStocks`
  - `nextCursor`
  - `lastProcessedSymbol`
  - `nextPendingSymbol`

### 3. Worker slices are bounded

Updated:

- `/Users/amitbhawani/Documents/Ai FinTech Platform/lib/yahoo-finance-batch-import.ts`
- `/Users/amitbhawani/Documents/Ai FinTech Platform/trigger/market-data/yahoo-daily-update-cron.ts`

Added a dedicated same-day cron worker that:

- processes a bounded slice only
- defaults to `25` stocks per invocation
- uses the existing strict `runYahooDailySameDayOnlyImport(...)` per stock
- preserves the `1 worker` and `1 request every 3 seconds` safety defaults
- stops early on:
  - Yahoo cooldown signals
  - write-timeout style failures
  - duplicate-key failures

Trigger now re-queues the next slice only when:

- the current slice made forward progress
- pending stocks remain
- the job is not paused, cooling down, completed, stopped, or failed

### 4. Manual bounded resume endpoint added

Created:

- `/Users/amitbhawani/Documents/Ai FinTech Platform/app/api/cron/yahoo-daily-update/worker/route.ts`

This route:

- uses the same cron auth
- requires `jobId` and `targetDate`
- processes one bounded slice only
- is intended for manual resume or operational recovery without running the full universe inside one request

### 5. Control Center now shows active cron progress

Updated:

- `/Users/amitbhawani/Documents/Ai FinTech Platform/lib/admin-import-control-center.ts`
- `/Users/amitbhawani/Documents/Ai FinTech Platform/components/admin/admin-import-control-center-client.tsx`
- `/Users/amitbhawani/Documents/Ai FinTech Platform/app/admin/market-data/import-control-center/page.tsx`

The Import Control Center now reads the active same-day cron parent job and shows:

- active cron job status
- `jobId`
- processed vs total stocks
- pending stock count
- `nextCursor`
- `lastProcessedSymbol`
- `nextPendingSymbol`

This is sourced from durable job metadata, not only from final activity logs.

### 6. Durable job registry now includes the cron worker

Updated:

- `/Users/amitbhawani/Documents/Ai FinTech Platform/lib/durable-jobs.ts`

Added Trigger durable task definition:

- `yahoo-daily-update-cron-worker`

## Files Changed

- `/Users/amitbhawani/Documents/Ai FinTech Platform/app/api/cron/yahoo-daily-update/_shared.ts`
- `/Users/amitbhawani/Documents/Ai FinTech Platform/app/api/cron/yahoo-daily-update/worker/route.ts`
- `/Users/amitbhawani/Documents/Ai FinTech Platform/trigger/market-data/yahoo-daily-update-cron.ts`
- `/Users/amitbhawani/Documents/Ai FinTech Platform/lib/yahoo-finance-batch-import.ts`
- `/Users/amitbhawani/Documents/Ai FinTech Platform/lib/admin-import-control-center.ts`
- `/Users/amitbhawani/Documents/Ai FinTech Platform/components/admin/admin-import-control-center-client.tsx`
- `/Users/amitbhawani/Documents/Ai FinTech Platform/app/admin/market-data/import-control-center/page.tsx`
- `/Users/amitbhawani/Documents/Ai FinTech Platform/lib/durable-jobs.ts`

## Expected Behavior Now

### Primary cron route

`/api/cron/yahoo-daily-update`

- auths via existing secret headers
- prepares a strict same-day parent job
- queues a durable worker slice
- returns in a few seconds

### Retry cron route

`/api/cron/yahoo-daily-update-retry`

- auths via existing secret headers
- prepares a retry-only remainder job
- targets only missing/stale/failed remainder
- queues a durable worker slice
- returns quickly

### Worker execution

Each durable invocation processes only a bounded slice, updates durable progress metadata, and re-queues the next slice only if needed.

## Safety Notes

- No full production import was run during this fix.
- No schema, RLS, or grants were changed.
- The primary route now avoids Vercel request timeouts by design.
- The retry lane no longer starts a full-universe run.

## Validation

- `npm run lint` → PASS
- `npx tsc --noEmit` → PASS
