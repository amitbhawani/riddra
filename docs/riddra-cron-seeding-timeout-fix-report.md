# Riddra Cron Seeding Timeout Fix Report

Date: 2026-05-03  
Scope: Fix only the Yahoo daily cron seeding timeout without turning the cron route into a full import worker.

## Problem

The authenticated production cron route was getting past auth and durable job creation, but failed during job-item seeding with:

`Could not seed Yahoo batch job items. Error: Supabase admin request timed out after 4000ms.`

The timeout source was the cron seeding path in `/Users/amitbhawani/Documents/Ai FinTech Platform/lib/yahoo-finance-batch-import.ts`, where `insertParentBatchJob()` was still capable of attempting oversized seed work for `stock_import_job_items`.

## Root Cause

The cron preparation path was doing too much synchronous setup before returning:

1. It created the parent `stock_import_jobs` row.
2. It seeded the first set of `stock_import_job_items`.
3. It stored a large incremental cron payload in the parent job row.
4. It built a batch report in the cron prepare path before returning.

The actual timeout was on Supabase admin writes while seeding job items, but the route was also carrying extra latency from oversized payload persistence and report generation.

## Fix

### 1. Incremental seeding only

The cron path now seeds only the first slice and leaves the rest for worker continuation.

- Initial seed stock slice: `25`
- Seed item chunk size per insert: `25`
- Hard max supported by the incremental seed helper: `50`

This keeps the cron route in queue-first mode and avoids full-universe item creation during the request.

### 2. Chunked item inserts

`seedYahooBatchJobItemsSlice()` now inserts job items in bounded chunks instead of one oversized write.

### 3. Worker continues seeding

If the job still has unseeded remainder, the worker tops up pending rows before processing more items. The cron route no longer needs to finish full seeding synchronously.

### 4. Smaller cron job payloads

Incremental cron jobs now store a compact requested-stock payload instead of duplicating large arrays across metadata and raw payload. This reduces parent job row size and lowers prepare latency.

### 5. No report-building in the cron route

`prepareYahooDailySameDayCronJob()` no longer builds a full batch report during queue preparation for the cron route. The route now returns seed/progress metadata directly.

## Progress Metadata Added

The cron job metadata now explicitly tracks:

- `totalEligibleStocks`
- `seededItemCount`
- `remainingUnseededCount`
- `nextSeedCursor`

Related UI and route surfaces were updated so the Control Center can show seeded vs remaining progress while the worker continues.

## Files Changed

- `/Users/amitbhawani/Documents/Ai FinTech Platform/lib/yahoo-finance-batch-import.ts`
- `/Users/amitbhawani/Documents/Ai FinTech Platform/app/api/cron/yahoo-daily-update/_shared.ts`
- `/Users/amitbhawani/Documents/Ai FinTech Platform/app/api/cron/yahoo-daily-update/worker/route.ts`
- `/Users/amitbhawani/Documents/Ai FinTech Platform/lib/admin-import-control-center.ts`
- `/Users/amitbhawani/Documents/Ai FinTech Platform/components/admin/admin-import-control-center-client.tsx`
- `/Users/amitbhawani/Documents/Ai FinTech Platform/scripts/verify-cron-seeding-timeout-fix.mjs`

## Validation

### Static validation

- `npm run lint` -> PASS
- `npx tsc --noEmit` -> PASS

### Live Supabase seeding validation

Executed against live Supabase using the app's real `.env.local` Supabase envs through:

- `/Users/amitbhawani/Documents/Ai FinTech Platform/scripts/verify-cron-seeding-timeout-fix.mjs`

Fresh disposable proof:

- target date: `2099-01-03`
- result: durable cron job created successfully
- mode: `queued_job`
- created: `true`
- reused: `false`
- status after prepare: `queued`
- prepare duration: `8130ms`
- total eligible stocks: `1000`
- seeded item count: `25`
- remaining unseeded count: `975`
- next seed cursor: `25`
- next pending symbol: `ABCOTS.NS`
- actual `stock_import_job_items` rows present: `25`
- Supabase admin timeout: **not reproduced**

Reused-job proof:

- target date: `2099-01-01`
- mode: `queued_job`
- created: `false`
- reused: `true`
- prepare duration: `4164ms`
- seeded item count remained bounded at `25`

## Behavioral Outcome

The failure point is fixed:

- no full import happens inside the cron route
- the parent durable job is created or reused
- the first seed slice is created successfully
- the remaining workload stays deferred for the worker
- the previous `Supabase admin request timed out after 4000ms` seeding failure was not reproduced

## Honest Limitation

I did not perform a full authenticated HTTP call to the cron route from this local shell because this local runtime still does not carry the production cron/Trigger secrets needed for a truthful end-to-end route-auth proof. Instead, I exercised the exact post-auth seeding path directly against live Supabase through the real app code, which is the code path that was failing.

That means the seeding timeout fix itself is verified, and the queue-first behavior remains intact.
