# Riddra Market Data Row Quarantine Implementation Report

Date: 2026-05-01

## Scope

Implemented the market-data row quarantine system described in:

- `/Users/amitbhawani/Documents/Ai FinTech Platform/docs/riddra-same-day-row-quarantine-plan.md`

This implementation adds the quarantine registry, updates read paths to exclude active quarantined rows, and exposes quarantine status in the Import Control Center.

It does **not** quarantine any rows yet.

## What was added

### 1. Durable quarantine registry migration

New migration:

- `/Users/amitbhawani/Documents/Ai FinTech Platform/db/migrations/0064_market_data_row_quarantine.sql`

This migration creates:

- `public.market_data_row_quarantine`

Supported target tables:

- `stock_price_history`
- `stock_market_snapshot`

Stored fields include:

- `stock_id`
- `yahoo_symbol`
- `table_name`
- `row_date`
- `reason`
- `evidence`
- `status`
- `created_at`
- `resolved_at`

Additional operational fields included for safer targeting:

- `row_id`

Safety controls included:

- table-name check constraint
- status check constraint
- unique active quarantine per row when `row_id` is known
- unique active quarantine per `table_name + stock_id + row_date` when only date-level targeting is used
- RLS enabled
- `REVOKE ALL` from `anon` and `authenticated`

## 2. Shared quarantine helper

Added:

- `/Users/amitbhawani/Documents/Ai FinTech Platform/lib/market-data-row-quarantine.ts`

This helper now provides:

- active quarantine row loading
- normalization of durable quarantine rows
- lookup building by `row_id` and `stock_id + row_date`
- row-level quarantine checks for read paths

## 3. Native chart reads now exclude quarantined history rows

Updated:

- `/Users/amitbhawani/Documents/Ai FinTech Platform/lib/native-stock-chart.ts`

Changes:

- loads active quarantines for `stock_price_history` scoped to the requested stock
- finds the latest **non-quarantined** candle for `1D` and range cutoff logic
- filters quarantined history rows out of returned chart points

Effect:

- quarantined `stock_price_history` rows will no longer be used by:
  - `/api/stocks/[slug]/chart`
  - the native frontend stock chart

## 4. Snapshot reads now exclude quarantined snapshot rows

Updated:

- `/Users/amitbhawani/Documents/Ai FinTech Platform/lib/content.ts`

Changes:

- `readCanonicalStockSnapshotRowsForStocks(...)`
  - now excludes active quarantined `stock_market_snapshot` rows before choosing the latest row per stock
- `readCanonicalStockMarketSnapshotPayload(...)`
  - no longer trusts `limit(1)` blindly
  - now pages recent snapshots and returns the first **non-quarantined** row

Effect:

- public stock discovery and stock detail snapshot surfaces will not use active quarantined snapshot rows

## 5. Import Control Center quarantine visibility

Updated:

- `/Users/amitbhawani/Documents/Ai FinTech Platform/lib/admin-import-control-center.ts`
- `/Users/amitbhawani/Documents/Ai FinTech Platform/components/admin/admin-import-control-center-client.tsx`
- `/Users/amitbhawani/Documents/Ai FinTech Platform/app/admin/market-data/import-control-center/page.tsx`

New control-center visibility includes:

- active quarantined row count
- affected stock count
- latest quarantine reason
- list of active quarantine rows
- sort controls for the quarantine list

Each visible quarantine row shows:

- company
- symbol / Yahoo symbol
- affected table
- row date
- reason
- detection time
- stock-page link when available
- evidence-key preview

## Files changed

- `/Users/amitbhawani/Documents/Ai FinTech Platform/db/migrations/0064_market_data_row_quarantine.sql`
- `/Users/amitbhawani/Documents/Ai FinTech Platform/lib/market-data-row-quarantine.ts`
- `/Users/amitbhawani/Documents/Ai FinTech Platform/lib/native-stock-chart.ts`
- `/Users/amitbhawani/Documents/Ai FinTech Platform/lib/content.ts`
- `/Users/amitbhawani/Documents/Ai FinTech Platform/lib/admin-import-control-center.ts`
- `/Users/amitbhawani/Documents/Ai FinTech Platform/components/admin/admin-import-control-center-client.tsx`
- `/Users/amitbhawani/Documents/Ai FinTech Platform/app/admin/market-data/import-control-center/page.tsx`
- `/Users/amitbhawani/Documents/Ai FinTech Platform/docs/riddra-market-data-row-quarantine-implementation-report.md`

## Important behavior notes

- no rows were quarantined in this step
- no source data was deleted
- `raw_yahoo_imports` evidence remains untouched
- the system is ready to **honor** active quarantines once rows are inserted into `market_data_row_quarantine`

## Validation

- `npm run lint` -> PASS
- `npx tsc --noEmit` -> PASS

## Next safe step

If you approve quarantine execution later, the next step is to insert the suspicious `2026-04-30` price and snapshot rows into `market_data_row_quarantine` with:

- `reason = same_day_fixture_contamination_suspected`
- evidence linked back to:
  - `/Users/amitbhawani/Documents/Ai FinTech Platform/docs/riddra-same-day-candle-corruption-investigation.md`

That future step can be done without deleting or rewriting the underlying market-data rows first.
