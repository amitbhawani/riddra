# Riddra Yahoo Delta Import Upgrade Report

Last updated: 2026-04-29

## Scope

This change upgrades the existing Yahoo importer to be more delta-aware and less wasteful without starting any new batch import in this step.

Validated in this pass:

- `npm run lint` -> PASS
- `npx tsc --noEmit` -> PASS

Not executed in this pass:

- No live Yahoo batch import
- No new dry-run import

## What changed

### 1. Historical prices are now delta-aware

The historical importer now chooses a fetch mode before it calls Yahoo:

- `full_initial`
  - used when no `stock_price_history` rows exist for the stock
  - fetches full `max` history
- `backfill_missing`
  - used when existing history has detectable weekday gaps
  - fetches a targeted date window starting before the first detected gap
- `update_recent`
  - used when history already exists and no gap is detected
  - fetches only a recent date window instead of full history
- `force_rebuild`
  - used only when `force=true`
  - allows the importer to rebuild from the requested period again

Additional safety rules now enforced:

- existing history is **not overwritten** unless `force=true`
- non-force imports use effective duplicate mode `skip_existing_dates`
- the importer now returns and records:
  - selected mode
  - effective duplicate mode
  - targeted fetch window
  - existing rows reused
  - requests avoided

### 2. Quote snapshot is now day-aware

The quote/statistics importer now checks whether today’s snapshot already exists in `stock_market_snapshot` before it fetches Yahoo.

Behavior:

- if today’s snapshot exists and `force=false` and `refresh=false`
  - skip the Yahoo request
  - reuse the existing snapshot
  - log the skip reason in `stock_import_activity_log`
  - mark:
    - `skipped_existing_snapshot`
    - `savedRequestsAvoided=1`
    - `existingDataReused=1`
- if `refresh=true` or `force=true`
  - the importer may refresh today’s snapshot
  - when refreshing the same day, it reuses the same `snapshot_at` row identity so it does not create same-day snapshot duplicates

### 3. Financial statements are now blocked from live batch mode

Financial statements remain available for manual single-stock testing, but they are now disabled for normal multi-stock batch flows.

This was applied in:

- the Yahoo batch importer defaults
- the admin stock import dashboard action route
- the batch route help metadata
- the admin Yahoo guide copy

Current policy:

- batch default modules now exclude `financial_statements`
- requesting `financial_statements` in batch mode now fails fast with a clear message
- older/stale batch items for `financial_statements` are skipped as `skipped_blocked_module`
- admin dashboard multi-stock import no longer automatically runs financial statements

### 4. Raw Yahoo failed-response dedupe

`raw_yahoo_imports` now avoids saving the same failed response repeatedly on the same day for the same stock/module/request shape.

Implementation:

- added `response_hash`
- failed raw responses are hashed from:
  - response status
  - error message
  - raw payload
- before inserting a failed raw row, the importer now checks whether an equivalent failed response already exists today
- if a matching failed raw row already exists:
  - no new raw row is inserted
  - the existing raw row is reused
  - the importer returns that existing raw row id as the linked raw record

This reduces:

- repeated duplicate failed raw rows
- raw table growth from identical protected-endpoint failures
- useless evidence duplication

### 5. Import job skip counters and avoided-request reporting

Batch/job metadata now records:

- `skippedExistingHistoryCount`
- `skippedExistingSnapshotCount`
- `skippedBlockedModuleCount`
- `skippedDuplicateRawResponseCount`
- `savedRequestsAvoided`
- `existingDataReused`
- `moduleDisabledStatus`

### 6. Admin dashboard improvements

`/admin/market-data/stocks` now exposes the new operational signals:

- saved requests avoided
- existing data reused
- skip breakdown:
  - existing history
  - existing snapshot
  - blocked modules
  - duplicate failed raw responses
- disabled module policy:
  - `financial_statements: manual_single_stock_only`

## Files changed

### Code

- `lib/yahoo-finance-service.ts`
- `lib/yahoo-finance-import.ts`
- `lib/yahoo-finance-batch-import.ts`
- `lib/admin-stock-import-dashboard.ts`
- `components/admin/admin-stock-import-dashboard-client.tsx`
- `app/api/admin/market-data/import/yahoo-historical/route.ts`
- `app/api/admin/market-data/import/yahoo-batch/route.ts`
- `app/api/admin/market-data/stocks/import/route.ts`
- `app/admin/market-data/stocks/page.tsx`
- `app/admin/market-data/yahoo-import-guide/page.tsx`

### Migration

- `db/migrations/0049_yahoo_delta_import_guardrails.sql`

## Behavior summary after this upgrade

### Historical imports

- safer for already-populated stocks
- smaller fetch windows on repeat runs
- no overwrite unless explicitly forced
- clearer mode reporting

### Quote imports

- snapshot fetch is skipped when today’s snapshot already exists
- repeated same-day quote imports are now much cheaper
- degraded snapshot behavior remains intact when quote endpoint is blocked

### Financial statements

- protected from accidental large-scale batch usage
- still available for manual single-stock testing

### Raw import storage

- duplicate failed raw responses are now suppressed per stock/module/day

## Remaining limitations

This change improves efficiency and safety, but it does **not** change the underlying Yahoo endpoint reality:

- `historical_prices` remains the only clearly reliable Yahoo module in this runtime
- `quote_statistics` remains operational mainly because latest snapshot can degrade safely
- protected quote-summary/fundamental modules still depend on Yahoo behavior and can remain unavailable
- `financial_statements` are intentionally not reopened for multi-stock live batch use

## Recommendation

Next safe use after this upgrade:

- continue using `historical_prices` for staged expansion
- use quote snapshot imports conservatively with the new same-day skip logic
- keep financial statements in manual single-stock test mode only
- apply migration `0049_yahoo_delta_import_guardrails.sql` before relying on failed raw-response dedupe in the live database
