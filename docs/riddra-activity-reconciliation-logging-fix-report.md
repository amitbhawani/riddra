# Riddra Activity And Reconciliation Logging Fix Report

Date: 2026-04-30
Scope: fix the activity/reconciliation logging mismatch that caused the 50-stock pilot to write `0` activity rows and `0` reconciliation rows for that daily run

## Problem

The earlier live `50`-stock daily pilot finished with:

- `0` `stock_import_activity_log` rows for that job
- `0` `stock_import_reconciliation` rows for that job

Root cause:

- the importer had started using new activity `step_name` values
- the live database constraint from [0048_yahoo_import_activity_and_reconciliation.sql](/Users/amitbhawani/Documents/Ai%20FinTech%20Platform/db/migrations/0048_yahoo_import_activity_and_reconciliation.sql) did not allow those newer values
- inserts into `stock_import_activity_log` failed on `stock_import_activity_log_step_name_check`
- reconciliation writes were then incomplete at the job level because the audit trail was partially broken

## Constraint Audit

### Original allowed step names from `0048`

- `fetch_started`
- `fetch_completed`
- `raw_saved`
- `normalization_started`
- `normalization_completed`
- `coverage_updated`
- `reconciliation_completed`
- `import_failed`

### Importer step names now needed

- `fetch_started`
- `fetch_completed`
- `raw_saved`
- `normalization_started`
- `normalization_completed`
- `history_write_completed`
- `snapshot_write_completed`
- `coverage_updated`
- `reconciliation_completed`
- `import_failed`
- `skipped_existing_history_rows`
- `skipped_existing_snapshot`
- `duplicate_payload_deduped`
- `write_batch_failed`

So the mismatch was real and reproducible.

## Fixes Made

### 1. Extended allowed step names

Updated [db/migrations/0056_extend_stock_import_activity_steps.sql](/Users/amitbhawani/Documents/Ai%20FinTech%20Platform/db/migrations/0056_extend_stock_import_activity_steps.sql) so the DB can safely allow the newer activity events, now including:

- `duplicate_payload_deduped`
- `skipped_existing_history_rows`
- `skipped_existing_snapshot`
- `history_write_completed`
- `snapshot_write_completed`
- `write_batch_failed`

### 2. Added backward-compatible activity fallback

Because `0056` may not yet be applied in the live database, [lib/yahoo-finance-import.ts](/Users/amitbhawani/Documents/Ai%20FinTech%20Platform/lib/yahoo-finance-import.ts) now:

- tries the exact intended step name first
- if the DB still rejects it on the old step-name constraint, retries with a safe legacy step name
- preserves the intended step in metadata:
  - `metadata.intendedStepName`
  - `metadata.usedStepNameFallback = true`
  - `metadata.stepConstraintError`

This means the importer logs safely now, even before the live migration is applied.

### 3. Wired explicit history and snapshot write events

The importer now emits explicit activity for:

- history path:
  - `history_write_completed`
  - `skipped_existing_history_rows`
  - `duplicate_payload_deduped`
- snapshot path:
  - `snapshot_write_completed`
  - `skipped_existing_snapshot`

### 4. Ensured reconciliation writes for both daily modules

Verified and preserved reconciliation writes for:

- `historical_prices` -> `stock_price_history`
- `latest_market_snapshot` -> `stock_market_snapshot`

Also added reconciliation for the snapshot-skip path when a same-day snapshot already exists.

## Files Changed

- [lib/yahoo-finance-import.ts](/Users/amitbhawani/Documents/Ai%20FinTech%20Platform/lib/yahoo-finance-import.ts)
- [db/migrations/0056_extend_stock_import_activity_steps.sql](/Users/amitbhawani/Documents/Ai%20FinTech%20Platform/db/migrations/0056_extend_stock_import_activity_steps.sql)

## 5-Stock Dry-Run Verification

I ran a no-network 5-stock dry-run using:

- `RELIANCE.NS`
- `TCS.NS`
- `INFY.NS`
- `HDFCBANK.NS`
- `ICICIBANK.NS`

Started at:

- `2026-04-30T11:04:12.346Z`

Dry-run result summary:

- all `5` historical jobs -> `completed`
- all `5` snapshot jobs -> `completed_with_errors`
  - expected because quote snapshot remains chart-fallback/degraded for protected fields
- all `5` snapshot jobs had `skippedExistingSnapshot = false` in that run

## Durable Activity Evidence

In the 5-stock dry-run evidence window:

- activity rows found: `260`

Step coverage counts from durable rows, using `metadata.intendedStepName` when fallback was used:

- `fetch_started` -> `20`
- `fetch_completed` -> `20`
- `raw_saved` -> `20`
- `normalization_started` -> `20`
- `normalization_completed` -> `55`
- `history_write_completed` -> `5`
- `snapshot_write_completed` -> `5`
- `coverage_updated` -> `55`
- `reconciliation_completed` -> `55`
- `import_failed` -> `0`
- `skipped_existing_history_rows` -> `5`
- `skipped_existing_snapshot` -> `0` in the 5-stock run itself

## Snapshot Skip Path Verification

I also ran an additional snapshot-only dry verification against `RELIANCE.NS` with:

- `allowExistingSnapshotSkipOnDryRun = true`

Result:

- `jobStatus = completed`
- `skippedExistingSnapshot = true`
- `savedRequestsAvoided = 1`

Durable activity evidence for that verification:

- row stored with fallback metadata:
  - `intendedStepName = skipped_existing_snapshot`
  - `usedStepNameFallback = true`

So the skip path is now confirmed too.

## Reconciliation Verification

In the 5-stock dry-run evidence window:

- reconciliation rows found: `55`

Relevant daily-module reconciliation rows:

- `historical_prices::stock_price_history` -> `5`
- `latest_market_snapshot::stock_market_snapshot` -> `5`

This confirms both required daily update modules are now writing reconciliation rows durably.

## Validation

- `npm run lint` -> PASS
- `npx tsc --noEmit` -> PASS

## Important Live Note

The importer is now safe even if the live DB still has the older `0048` step constraint, because the compatibility fallback keeps writes durable.

However, the cleanest final state is still to apply:

- [0056_extend_stock_import_activity_steps.sql](/Users/amitbhawani/Documents/Ai%20FinTech%20Platform/db/migrations/0056_extend_stock_import_activity_steps.sql)

Once applied, the live DB will store the exact new step names directly instead of relying on fallback metadata.

## Conclusion

The activity/reconciliation logging mismatch is fixed at the application level.

The 5-stock dry-run now proves:

1. activity rows are being written again
2. reconciliation rows are being written again
3. historical daily jobs emit explicit write-completion and skip activity
4. snapshot jobs emit explicit write-completion activity
5. snapshot skip behavior is also durably logged

This clears the logging mismatch as a blocker, while the migration `0056` remains the final schema cleanup step for exact step-name storage.
