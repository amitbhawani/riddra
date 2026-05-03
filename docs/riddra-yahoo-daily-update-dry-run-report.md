# Riddra Yahoo Daily Update Dry-Run Report

Last updated: 2026-04-30

## Goal

Run a no-network dry validation of the new Yahoo daily chart-update job and prove:

1. no Yahoo network call happens
2. existing same-day rows can be skipped
3. missing same-day rows can be inserted
4. recent-history update mode reuses existing rows safely
5. no duplicate normalized rows are created
6. durable activity, reconciliation, and raw-import evidence are written
7. admin surfaces stay up

## Scope Used

10 unique stocks from `stocks_master`:

1. `AXISBANK.NS`
2. `HDFCBANK.NS`
3. `ICICIBANK.NS`
4. `INFY.NS`
5. `ITC.NS`
6. `KOTAKBANK.NS`
7. `LT.NS`
8. `SBIN.NS`
9. `ULTRACEMCO.NS`
10. `WIPRO.NS`

Target dry-run trade date:

- `2026-04-30`

## Important Fixes Applied Before the Dry Run

To make the daily updater testable in true no-network mode, I added:

1. dry-run propagation through the daily batch profile
2. chart-fallback snapshot behavior even in dry-run mode
3. existing same-day snapshot skip support during dry runs
4. explicit `stocks_master` lookup for `yahooSymbols` in the admin action route

Files updated during this task:

- [lib/yahoo-finance-import.ts](/Users/amitbhawani/Documents/Ai%20FinTech%20Platform/lib/yahoo-finance-import.ts)
- [lib/yahoo-finance-batch-import.ts](/Users/amitbhawani/Documents/Ai%20FinTech%20Platform/lib/yahoo-finance-batch-import.ts)
- [lib/yahoo-finance-dry-run-fixtures.ts](/Users/amitbhawani/Documents/Ai%20FinTech%20Platform/lib/yahoo-finance-dry-run-fixtures.ts)
- [app/api/admin/market-data/import-control-center/actions/route.ts](/Users/amitbhawani/Documents/Ai%20FinTech%20Platform/app/api/admin/market-data/import-control-center/actions/route.ts)
- [scripts/import-yahoo-daily-update.mjs](/Users/amitbhawani/Documents/Ai%20FinTech%20Platform/scripts/import-yahoo-daily-update.mjs)
- [scripts/run-yahoo-daily-update-dry-run-check.mjs](/Users/amitbhawani/Documents/Ai%20FinTech%20Platform/scripts/run-yahoo-daily-update-dry-run-check.mjs)
- [scripts/collect-yahoo-daily-update-dry-run-metrics.mjs](/Users/amitbhawani/Documents/Ai%20FinTech%20Platform/scripts/collect-yahoo-daily-update-dry-run-metrics.mjs)

## How the Dry Run Was Simulated

The dry validation used three no-network daily-update jobs:

1. Preseed existing-today case
   - job: `f19eff7f-d1a5-40bd-b897-70c9e495c6f3`
   - stocks processed: `3`
   - purpose: create same-day rows first so the next run can prove skip behavior

2. Mixed skip + insert run
   - job: `b1dca5cf-685c-42e0-9f0a-7c16070360ec`
   - stocks processed: `5`
   - result:
     - `3` stocks skipped because same-day snapshot already existed
     - `2` stocks inserted fresh same-day data

3. Second insert-only slice
   - job: `6521e47f-8cbb-422c-9421-dd24f70ae8a3`
   - stocks processed: `5`
   - result:
     - all `5` inserted fresh same-day data

This gave a final verified sample of `10` unique stocks, with both:

- existing same-day row reuse
- missing same-day row insertion

## Before / After State

Before the dry validation, the 10 target stocks had:

- `historicalTodayCount = 0`
- `snapshotTodayCount = 0`

for trade date `2026-04-30`.

After the dry validation, all 10 target stocks had:

- `historicalTodayCount = 1`
- `snapshotTodayCount = 1`

That means:

- missing same-day rows were created successfully
- no stock ended up with more than one same-day normalized row

## Verification Results

### 1. No duplicate rows

Verified:

- duplicate `stock_price_history` keys by `stock_id + trade_date` for `2026-04-30`: `0`
- duplicate `stock_market_snapshot` keys by `stock_id + trade_date` for `2026-04-30`: `0`

### 2. Existing rows were skipped and logged

Verified from the mixed run `b1dca5cf-685c-42e0-9f0a-7c16070360ec`:

- `savedRequestsAvoided = 3`
- `skipBreakdown.skippedExistingSnapshot = 3`
- `skipBreakdown.skippedExistingHistory = 32`
- `existingDataReused = 35`

Durable evidence:

- `skippedExistingSnapshotActivityCount = 3`

### 3. Missing rows were inserted

Verified from durable DB state:

- all 10 target stocks now have one `2026-04-30` row in `stock_price_history`
- all 10 target stocks now have one `2026-04-30` row in `stock_market_snapshot`

### 4. Requests avoided were counted

Verified:

- mixed run saved requests avoided: `3`
- second insert-only slice saved requests avoided: `0`

This matches the intended scenario:

- some stocks already had same-day snapshot data and were skipped
- others still needed today’s snapshot and were inserted

### 5. Raw responses were saved

Verified:

- `raw_yahoo_imports` rows recorded for this dry-validation window: `23`

This aligns with the dry-run sequence:

- preseed run: historical + snapshot raw rows
- mixed run: historical for all processed stocks, snapshot only where not skipped
- second insert-only slice: historical + snapshot raw rows

### 6. Activity log and reconciliation were populated

Verified:

- `stock_import_activity_log` rows for the dry-validation window and stock set: `164`
- `stock_import_reconciliation` rows: `23`
- reconciliation statuses:
  - `completed_with_warnings`: `23`

The warning status is expected because chart-derived latest snapshots are missing one mapped optional field in the dry fixtures.

### 7. update_recent behavior was exercised

Historical rows already existed through `2026-04-29`, so the daily job:

- fetched only recent dry-run chart data
- inserted `2026-04-30` where missing
- reused existing daily history rows rather than rebuilding full history

Evidence:

- `skipBreakdown.skippedExistingHistory = 32` in the mixed run
- `existingDataReused = 35` in the mixed run
- second 5-stock slice still showed `existingDataReused = 5`

## Admin / Frontend Health

Verified:

- `GET /admin/market-data/import-control-center` on `http://localhost:3001` -> `200`
- `GET /stocks/reliance-industries` on `http://localhost:3001` -> `200`

Control-center note:

- the admin action route completed successfully for all dry-run slices
- the returned reports showed live values for:
  - `savedRequestsAvoided`
  - `existingDataReused`
  - `skipBreakdown`
  - `requestsUsedCurrentHour`
  - `requestsUsedToday`

That is the same durable data model the Control Center reads, so the admin surface is using the correct underlying activity after the run.

## Acceptance Check

### Passed

- no Yahoo network call happened
- skipped existing rows were logged
- missing same-day rows were inserted
- requests avoided were counted
- no duplicate normalized rows were created
- durable raw-import evidence was saved
- durable activity rows were saved
- durable reconciliation rows were saved
- admin control route remained healthy
- frontend stock page remained healthy

### Notes

- The first preseed slice initially exposed an admin-side explicit-symbol lookup issue. I fixed that by switching the route to a direct `stocks_master` query for requested `yahooSymbols`.
- Latest snapshot warnings are expected in this dry run because the chart-derived fixture intentionally leaves one optional mapped field missing.

## Final Verdict

The daily Yahoo chart-update job passed its no-network dry validation for a 10-stock sample.

It is now proven to:

- reuse existing same-day data safely
- insert missing same-day data safely
- avoid duplicate normalized rows
- count avoided requests
- write durable raw/activity/reconciliation evidence
- stay within the chart-only safe module boundary

