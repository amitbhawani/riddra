# Riddra Data Freshness Guard Report

Date: 2026-04-30

## Goal

Add a daily data freshness validation job so Riddra can flag stocks missing today's normalized Yahoo chart data without auto-fixing them.

Required checks:

1. `stock_price_history` has today's row
2. `stock_market_snapshot` has today's row
3. stocks missing either one are flagged stale

## Files changed

- [db/migrations/0055_stock_data_freshness.sql](/Users/amitbhawani/Documents/Ai%20FinTech%20Platform/db/migrations/0055_stock_data_freshness.sql)
- [scripts/generate-stock-data-freshness.mjs](/Users/amitbhawani/Documents/Ai%20FinTech%20Platform/scripts/generate-stock-data-freshness.mjs)
- [package.json](/Users/amitbhawani/Documents/Ai%20FinTech%20Platform/package.json)
- [lib/admin-import-control-center.ts](/Users/amitbhawani/Documents/Ai%20FinTech%20Platform/lib/admin-import-control-center.ts)
- [components/admin/admin-import-control-center-client.tsx](/Users/amitbhawani/Documents/Ai%20FinTech%20Platform/components/admin/admin-import-control-center-client.tsx)
- [app/admin/market-data/import-control-center/page.tsx](/Users/amitbhawani/Documents/Ai%20FinTech%20Platform/app/admin/market-data/import-control-center/page.tsx)

## New durable table

Added migration:

- [db/migrations/0055_stock_data_freshness.sql](/Users/amitbhawani/Documents/Ai%20FinTech%20Platform/db/migrations/0055_stock_data_freshness.sql)

Table:

- `stock_data_freshness`

Fields:

- `stock_id`
- `has_today_price`
- `has_today_snapshot`
- `last_price_date`
- `last_snapshot_date`
- `is_stale`
- `checked_at`

Notes:

- one row per stock
- `stock_id` is the primary key
- this is a validation/output table, not an auto-repair table

## New validation job

Added manual generator script:

- [scripts/generate-stock-data-freshness.mjs](/Users/amitbhawani/Documents/Ai%20FinTech%20Platform/scripts/generate-stock-data-freshness.mjs)

New command:

```bash
npm run stocks:generate-freshness
```

What it does:

- uses the current IST date
- checks `stock_price_history` for today's `1d` Yahoo row
- checks `stock_market_snapshot` for today's Yahoo snapshot row
- uses coverage lanes for `last_price_date` and `last_snapshot_date`
- upserts one freshness row per active stock into `stock_data_freshness`
- prints a summary including stale count and sample stale stocks

## Control Center changes

The Import Control Center now exposes freshness in the `System Health Monitor`.

New freshness surface:

- stale stock count
- checked time
- source:
  - `durable`
  - `runtime_fallback`
- stale stock list with:
  - stock name
  - symbol
  - Yahoo symbol
  - whether today's price exists
  - whether today's snapshot exists
  - last price date
  - last snapshot date
  - link to stock page

## Runtime fallback

The control center will still work even if `stock_data_freshness` has not been generated yet.

Fallback behavior:

- checks today's `stock_price_history` rows directly
- checks today's `stock_market_snapshot` rows directly
- uses coverage metadata for latest known dates
- labels the freshness source as `runtime_fallback`

This keeps the UI useful before the daily validation job is scheduled or run.

## Important behavior

- this does **not** auto-fix stale stocks
- it only flags and exposes them
- stale means:
  - missing today's price row
  - or missing today's snapshot row

## Validation

- `node --check scripts/generate-stock-data-freshness.mjs` -> PASS
- `npm run lint` -> PASS
- `npx tsc --noEmit` -> PASS
