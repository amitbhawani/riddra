# Riddra Post-Repair System Audit

Date: 2026-05-01  
Scope: read-only post-repair audit after the 40-symbol `2026-04-30` quarantine-and-repair run

## Executive Summary

The targeted same-day corruption repair landed cleanly in the repaired slice, and the core public chart surfaces for the audited symbols now look healthy again.

Current headline status:

- active stocks: `2157`
- historical coverage: `2155 / 2157`
- snapshot coverage: `2157 / 2157`
- active quarantine rows: `0`
- resolved quarantine rows: `80`
- suspicious identical latest candles across active stocks: `0`
- native chart API for the repaired audit names: healthy
- recent import errors in the last `24` hours: `0`

Main remaining operational note:

- the Import Control Center is currently loading with `200`, but it is still slow and showed one transient `500` during this audit before succeeding on retry

## 1. Active `stocks_master` Count

- active stocks in `stocks_master`: `2157`

## 2. Historical Coverage Count

- active stocks with historical coverage in `stock_data_quality_summary`: `2155`
- active stocks missing historical coverage: `2`

Remaining missing historical coverage:

- `3MINDIA` -> `/stocks/3m-india-limited`
- `ABBOTINDIA` -> `/stocks/abbott-india-limited`

## 3. Snapshot Coverage Count

- active stocks with latest snapshot coverage in `stock_data_quality_summary`: `2157`
- active stocks missing latest snapshot coverage: `0`

## 4. Active Quarantine Rows

- active rows in `market_data_row_quarantine`: `0`

## 5. Resolved Quarantine Rows

- resolved rows in `market_data_row_quarantine`: `80`

This matches the completed repair flow:

- `40` repaired `stock_price_history` rows
- `40` repaired `stock_market_snapshot` rows

## 6. Duplicate `stock_price_history` Rows

Exact whole-table duplicate counting through the current Supabase REST path is still constrained by statement timeouts for a full `stock_price_history` keyspace walk.

What was verified:

- repaired 40-symbol same-day slice duplicate posture: `0`
- repaired `2026-04-30` suspicious signature remaining: `0`
- schema still enforces the business-key uniqueness path:
  - `stock_price_history_unique`
  - [db/migrations/0046_stock_price_history_yahoo_daily_unique.sql](/Users/amitbhawani/Documents/Ai%20FinTech%20Platform/db/migrations/0046_stock_price_history_yahoo_daily_unique.sql)
- no recent import errors were recorded in the last `24` hours

Audit conclusion for duplicates:

- no duplicate signal was found in the repaired scope
- no live error signal suggests current duplicate creation
- exact whole-table duplicate count was not directly queryable through REST without timing out

## 7. Suspicious Identical Latest Candles Across Unrelated Symbols

Latest-candle grouping across the active universe returned:

- suspicious identical latest-candle groups: `0`

That means the earlier “shared RELIANCE fixture candle” pattern is no longer showing up in the latest available daily candle set for active stocks.

## 8. Native Chart API Health

Audited `1D` API routes:

### RELIANCE

- route: `/api/stocks/reliance-industries/chart?range=1D`
- status: `200`
- duration: `2867ms`
- point count: `1`
- candle:
  - `open = 1409`
  - `high = 1437`
  - `low = 1393.099976`
  - `close = 1430.800049`
  - `adjustedClose = 1430.800049`
  - `volume = 30957881`

### TCS

- route: `/api/stocks/tcs/chart?range=1D`
- status: `200`
- duration: `2249ms`
- point count: `1`
- candle:
  - `open = 2479`
  - `high = 2491`
  - `low = 2438`
  - `close = 2473.899902`
  - `adjustedClose = 2473.899902`
  - `volume = 3970446`

### INFY

- route: `/api/stocks/infosys/chart?range=1D`
- status: `200`
- duration: `1608ms`
- point count: `1`
- candle:
  - `open = 1167.5`
  - `high = 1189.800049`
  - `low = 1159.599976`
  - `close = 1181.800049`
  - `adjustedClose = 1181.800049`
  - `volume = 12205669`

### 20MICRONS

- route: `/api/stocks/20-microns-limited/chart?range=1D`
- status: `200`
- duration: `1598ms`
- point count: `1`
- candle:
  - `open = 179.550003`
  - `high = 179.820007`
  - `low = 175.410004`
  - `close = 176.889999`
  - `adjustedClose = 176.889999`
  - `volume = 53904`

Chart verdict:

- repaired symbol audit set: `PASS`

## 9. Admin Control Center Health

Current route check:

- `/admin/market-data/import-control-center` -> `200`
- latest measured duration: `11588ms`

Important nuance:

- one earlier fetch during this audit returned `500`
- an immediate follow-up fetch returned full HTML successfully with `200`

Operational read:

- current status: available
- reliability: not fully steady
- latency: still heavy / degraded

## 10. Import Errors In Last 24 Hours

- `stock_import_errors` rows in the last `24` hours: `0`

Latest error samples:

- none

## Final Read

What looks good:

- repaired 40-symbol corruption slice is clean
- quarantine registry is clear of active rows
- snapshot coverage is complete
- latest-candle anomaly scan is clean
- recent import-error window is clean
- native chart API for the repaired names is healthy

What still needs attention:

- historical coverage is still short by `2` stocks:
  - `3MINDIA`
  - `ABBOTINDIA`
- Import Control Center remains slow and showed one transient failure during audit
- exact full-universe duplicate counting is still awkward through REST because the table is large enough to trigger statement timeouts on deep duplicate-audit scans
