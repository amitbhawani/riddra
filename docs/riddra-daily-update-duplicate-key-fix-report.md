# Riddra Daily Update Duplicate-Key Fix Report

Date: 2026-04-30
Scope: fix for duplicate-key failures in the Yahoo daily historical update path

## Problem

The live `50`-stock daily chart update pilot failed on `18` historical items with:

`duplicate key value violates unique constraint "stock_price_history_unique"`

The affected unique key is:

1. `stock_id`
2. `interval_type`
3. `trade_date`
4. `source_name`

## Root Cause

The failure was happening in the historical daily write path inside [lib/yahoo-finance-import.ts](/Users/amitbhawani/Documents/Ai%20FinTech%20Platform/lib/yahoo-finance-import.ts).

The specific problem was:

- the importer preloaded existing historical `trade_date` rows before deciding which daily rows to insert
- that preload used a single unpaged Supabase read
- for larger historical windows, Supabase row paging meant the importer could miss existing dates beyond the default result window
- those missed existing dates were treated as new rows
- the insert batch then hit `stock_price_history_unique`

So the duplicate-key error was not caused by existing duplicate rows in the database. It was caused by incomplete pre-write duplicate detection in the importer.

## Fixes Made

### 1. Paged existing-date lookup

Added a paged historical existing-row loader:

- `loadExistingHistoricalTradeDatesInRange(...)`

This now reads all matching existing Yahoo daily dates in batches instead of relying on one partial result window.

### 2. Payload dedupe before write

The importer already deduped by `tradeDate`, but the fix now:

- explicitly tracks `duplicatePayloadRowsRemoved`
- counts them as skipped/reused rows
- records this as activity

### 3. Same-day and existing rows filtered before insert

For `skip_existing_dates` mode:

- existing rows are filtered out before insert
- existing same-day rows are skipped, not written
- existing rows are counted accurately in `skippedRows`

### 4. Batch-level duplicate fallback

If an `insert` batch still hits a duplicate-key error:

- the importer reloads existing dates only for that failed batch window
- filters the now-existing rows out of the batch
- retries only the remaining rows
- if nothing remains, it treats that batch as skipped/reused instead of failing the stock

This keeps the failure local to the batch and avoids failing the full stock import.

### 5. Accurate row accounting

The historical importer now keeps these counts aligned with actual write behavior:

- `insertedRows`
- `skippedRows`
- `updatedRows`
- `existingDataReused`

### 6. Activity log support for new historical write events

Added new intended activity events:

- `duplicate_payload_deduped`
- `skipped_existing_history_rows`
- `history_write_completed`

## Backward-Compatible Activity Logging

The live database still has the older `stock_import_activity_log_step_name_check` constraint from migration `0048`, which does not yet allow the new step names.

To avoid runtime breakage before schema rollout, I added a compatibility fallback:

- the importer first tries the exact new step name
- if the live DB rejects it on the old constraint, it retries with a safe legacy step name
- the intended new step name is preserved in `metadata.intendedStepName`

This means:

- the importer works now without runtime failure
- exact new step names will persist directly once [0056_extend_stock_import_activity_steps.sql](/Users/amitbhawani/Documents/Ai%20FinTech%20Platform/db/migrations/0056_extend_stock_import_activity_steps.sql) is applied

## Files Changed

- [lib/yahoo-finance-import.ts](/Users/amitbhawani/Documents/Ai%20FinTech%20Platform/lib/yahoo-finance-import.ts)
- [db/migrations/0056_extend_stock_import_activity_steps.sql](/Users/amitbhawani/Documents/Ai%20FinTech%20Platform/db/migrations/0056_extend_stock_import_activity_steps.sql)
- [scripts/verify-yahoo-historical-duplicate-fix.mjs](/Users/amitbhawani/Documents/Ai%20FinTech%20Platform/scripts/verify-yahoo-historical-duplicate-fix.mjs)

## Validation

### Static validation

- `npm run lint` -> PASS
- `npx tsc --noEmit` -> PASS
- `node --check scripts/verify-yahoo-historical-duplicate-fix.mjs` -> PASS

### Safe dry-run verification

I ran a direct no-network historical dry-run verification for the same `18` symbols that failed in the live pilot:

1. `3MINDIA.NS`
2. `21STCENMGM.NS`
3. `AAATECH.NS`
4. `360ONE.NS`
5. `3PLAND.NS`
6. `5PAISA.NS`
7. `AAVAS.NS`
8. `AARVI.NS`
9. `AARTIDRUGS.NS`
10. `63MOONS.NS`
11. `AARON.NS`
12. `20MICRONS.NS`
13. `3IINFOLTD.NS`
14. `AAREYDRUGS.NS`
15. `ABCAPITAL.NS`
16. `AARTIIND.NS`
17. `AARTISURF.NS`
18. `ABB.NS`

Result:

- all `18 / 18` completed successfully
- all `18 / 18` returned `jobStatus = completed`
- no duplicate-key failures were raised in the test run
- each dry run correctly reported:
  - `insertedRows = 0`
  - `skippedRows = 10`
  - `updatedRows = 0`
  - `mode = backfill_missing`

### Recent error verification

Checked `stock_import_errors` for the recent validation window:

- recent error rows in validation window: `0`
- recent duplicate-key errors in validation window: `0`

### Activity log verification

The validation also confirmed the backward-compatible activity logging path is working:

- recent activity rows were written successfully
- fallback rows now carry:
  - `metadata.intendedStepName`
  - `metadata.usedStepNameFallback = true`

Example intended step names observed through fallback metadata:

- `history_write_completed`
- `skipped_existing_history_rows`

## Remaining Follow-Up

Before the full operational picture is considered fully clean, one schema step is still recommended:

- apply [0056_extend_stock_import_activity_steps.sql](/Users/amitbhawani/Documents/Ai%20FinTech%20Platform/db/migrations/0056_extend_stock_import_activity_steps.sql)

That will let the live DB store the exact new activity step names directly instead of relying on compatibility fallback metadata.

## Conclusion

The duplicate-key bug in the daily historical update path is fixed at the importer level.

The safe dry validation for the same `18` previously failing symbols completed without any duplicate-key errors, which is the strongest current proof that the daily history dedupe/write path is now behaving correctly.

This removes one of the major blockers for cron readiness, but cron should still stay disabled until:

1. migration `0056` is applied
2. the live daily batch path is rerun at pilot scale
3. the daily pilot confirms both:
   - `0` duplicate-key history errors
   - durable activity/reconciliation behavior is acceptable
