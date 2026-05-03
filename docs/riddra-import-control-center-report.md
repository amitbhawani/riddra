# Riddra Yahoo Import Control Center Report

Last updated: 2026-04-29

## Purpose

This report documents the new admin overview page for the full Yahoo import project:

- Route: `app/admin/market-data/import-control-center/page.tsx`
- Goal: give operators one fast executive view of Yahoo import progress, source posture, safety, quality, recent activity, module coverage, and bounded safe actions

## What Was Added

### 1. New admin overview route

Created:

- `app/admin/market-data/import-control-center/page.tsx`

This page now shows:

- project status
  - total active stocks
  - stocks with historical data
  - stocks with latest snapshot
  - stocks with valuation data
  - stocks with financial statements
  - overall import completion percentage
- data source status
  - Yahoo historical: active
  - Yahoo quote/statistics: degraded snapshot-only mode
  - Yahoo financial statements: disabled for batch
  - NSE: not active, backup/future only
- import safety status
  - current throttle
  - requests this hour
  - requests today
  - cooldown status
  - concurrent worker setting
  - disabled modules
  - saved requests avoided
  - existing data reused
- data quality
  - historical rows count
  - snapshot rows count
  - missing modules count
  - warning count
  - error count
  - reconciliation pass/fail count
- recent activity
  - last 20 activity log events
  - latest failed imports
  - latest skipped imports
  - latest reused-data events
- progress by module
  - historical_prices
  - quote_statistics
  - financial_statements
  - valuation_metrics
  - share_statistics
  - financial_highlights

### 2. Durable summary helper

Created:

- `lib/admin-import-control-center.ts`

This helper reuses the durable Yahoo admin system and safely aggregates:

- `stocks_master`
- `stock_import_coverage`
- `stock_import_activity_log`
- `stock_import_reconciliation`
- `stock_import_errors`
- `stock_price_history`
- `stock_market_snapshot`
- existing stock dashboard summary data

Important behavior:

- empty tables do not crash the page
- read failures become warnings instead of fatal page errors
- financial-statements batch disablement stays visible as an intentional state, not an accidental gap

### 3. Safe action layer

Created:

- `app/api/admin/market-data/import-control-center/actions/route.ts`
- `components/admin/admin-import-control-center-client.tsx`

The control center now exposes bounded, admin-safe actions:

- `Run safe dry-run`
- `Import missing historical data`
- `Refresh today’s snapshots`
- `Retry failed safe modules`

These actions do not auto-run on page load.

Safety design:

- dry-run uses the no-network RELIANCE flow
- import actions run bounded worker slices
- financial statements remain disabled for batch
- same-day snapshot skips and reused-data signals stay visible
- the page refreshes after action completion

## Navigation Added

Links to the new control center were added from:

- `app/admin/market-data/page.tsx`
- `app/admin/market-data/stocks/page.tsx`
- `app/admin/market-data/yahoo-import-guide/page.tsx`

## Functional Verification

### Route checks

- `GET /admin/market-data/import-control-center` -> `200`
- `GET /admin/market-data` -> `200`
- `GET /admin/market-data/stocks` -> `200`
- `GET /admin/market-data/yahoo-import-guide` -> `200`

### Safe action proof

Verified:

- `POST /api/admin/market-data/import-control-center/actions`
  - payload: `{ "action": "run_safe_dry_run" }`
  - result: `200`

Observed successful response:

- `ok: true`
- `mode: dry_run`
- `affectedSlugs: ["reliance-industries"]`
- job ids returned for:
  - historical
  - quote statistics
  - financial statements

Observed warnings were non-fatal and correctly surfaced:

- `stock_share_statistics is missing 2 of 10 mapped fields.`
- `stock_financial_highlights is missing 1 of 13 mapped fields.`
- `income_statement_quarterly is missing 1 of 28 mapped fields.`
- `balance_sheet_quarterly is missing 1 of 26 mapped fields.`
- `cash_flow_quarterly is missing 1 of 22 mapped fields.`

This confirms the control-center action path is not just visual; it can run a safe bounded operation and return admin-readable results.

## Validation

- `npm run lint` -> PASS
- `npx tsc --noEmit` -> PASS

## Outcome

The Yahoo import project now has one consolidated executive admin page that is safe, durable, warning-aware, and operationally honest. It gives non-developer operators a high-level command center without hiding the known degraded fundamentals state or triggering imports automatically.
