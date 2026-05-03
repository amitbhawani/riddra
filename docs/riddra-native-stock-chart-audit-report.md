# Riddra Native Stock Chart Audit Report

Date: 2026-05-01  
Scope: native `/api/stocks/[slug]/chart` backend + stock-page chart integration

## Stocks audited

1. `RELIANCE.NS` -> `/stocks/reliance-industries`
2. `TCS.NS` -> `/stocks/tcs`
3. `INFY.NS` -> `/stocks/infosys`
4. `20MICRONS.NS` -> `/stocks/20-microns-limited`
5. `SONAL.NS` -> `/stocks/sonal-mercantile-limited`

`SONAL.NS` was selected as the shorter-history small-cap sample because it currently has only `4` stored daily candles.

## Executive summary

- Native chart route stability: `PASS`
- Frontend route stability: `PASS`
- Duplicate-date handling in chart API: `PASS`
- Stored-history-backed tooltip consistency: `PASS`
- Data accuracy for several large-cap `2026-04-30` candles: `FAIL / HIGH SEVERITY`

The chart API is behaving consistently and the frontend is not crashing. The main issue is not in the chart implementation itself. The issue is that some stored `stock_price_history` rows for `2026-04-30` appear to be reused across unrelated stocks, so the chart is accurately rendering suspicious underlying data.

## Route health

- `GET /stocks/reliance-industries` -> `200`
- `GET /stocks/tcs` -> `200`
- `GET /stocks/infosys` -> `200`
- `GET /stocks/20-microns-limited` -> `200`
- `GET /stocks/sonal-mercantile-limited` -> `200`

No frontend crash was observed from route-level rendering for the audited pages.

## API response time and range coverage

Measured locally against `http://127.0.0.1:3000/api/stocks/[slug]/chart`.

### RELIANCE

- `1D` -> `200`, `1296.64ms`, `1` point, `2026-04-30 -> 2026-04-30`
- `7D` -> `200`, `1354.15ms`, `5` points, `2026-04-24 -> 2026-04-30`
- `1M` -> `200`, `1321.59ms`, `21` points, `2026-03-30 -> 2026-04-30`
- `6M` -> `200`, `1336.89ms`, `126` points, `2025-10-30 -> 2026-04-30`
- `1Y` -> `200`, `1338.96ms`, `254` points, `2025-04-30 -> 2026-04-30`
- `5Y` -> `200`, `1768.74ms`, `1258` points, `2021-04-30 -> 2026-04-30`
- `MAX` -> `200`, `4205.30ms`, `7736` points, `1996-01-01 -> 2026-04-30`

### TCS

- `1D` -> `200`, `1234.99ms`, `1` point
- `7D` -> `200`, `1309.18ms`, `5` points
- `1M` -> `200`, `1319.87ms`, `21` points
- `6M` -> `200`, `1353.30ms`, `126` points
- `1Y` -> `200`, `1328.44ms`, `254` points
- `5Y` -> `200`, `1826.28ms`, `1258` points
- `MAX` -> `200`, `3860.86ms`, `5981` points, `2002-08-26 -> 2026-04-30`

### INFY

- `1D` -> `200`, `1194.17ms`, `1` point
- `7D` -> `200`, `1279.15ms`, `5` points
- `1M` -> `200`, `1284.38ms`, `21` points
- `6M` -> `200`, `1278.88ms`, `126` points
- `1Y` -> `200`, `1293.18ms`, `254` points
- `5Y` -> `200`, `1784.94ms`, `1258` points
- `MAX` -> `200`, `4687.97ms`, `7739` points, `1996-01-01 -> 2026-04-30`

### 20MICRONS

- `1D` -> `200`, `1247.46ms`, `1` point
- `7D` -> `200`, `1278.73ms`, `5` points
- `1M` -> `200`, `1286.23ms`, `21` points
- `6M` -> `200`, `1286.67ms`, `126` points
- `1Y` -> `200`, `1327.27ms`, `254` points
- `5Y` -> `200`, `1759.95ms`, `1258` points
- `MAX` -> `200`, `3024.08ms`, `4397` points, `2008-10-20 -> 2026-04-30`

### SONAL

- `1D` -> `200`, `1065.48ms`, `1` point
- `7D` -> `200`, `1558.00ms`, `3` points
- `1M` -> `200`, `1846.94ms`, `4` points
- `6M` -> `200`, `1303.02ms`, `4` points
- `1Y` -> `200`, `1354.38ms`, `4` points
- `5Y` -> `200`, `1338.48ms`, `4` points
- `MAX` -> `200`, `1301.84ms`, `4` points, `2026-04-22 -> 2026-04-30`

## Accuracy checks

### Point count and date windows

- Range windows were internally consistent for all five stocks.
- `1D` returned exactly the latest stored candle.
- `7D`, `1M`, `6M`, `1Y`, `5Y`, and `MAX` all returned date spans that matched the expected stored-history window behavior.

### Tooltip value consistency against `stock_price_history`

The native chart tooltip path is consistent with stored history. For all five audited stocks, the `1D` API candle exactly matched the DB row for `2026-04-30` on:

- `open`
- `high`
- `low`
- `close`
- `adjustedClose` / `adj_close`
- `volume`

That means the chart frontend and chart API are faithfully rendering the stored data.

### Duplicate dates

- API duplicate dates for every tested stock and range: `0`
- DB duplicate dates for the audited stocks in stored daily history: `0`

So the chart API is not introducing duplicate-point distortion.

## High-severity data issue found

### Problem

Several unrelated stocks share the exact same `2026-04-30` candle in `stock_price_history`.

The repeated signature is:

- `open = 1343.6`
- `high = 1356.8`
- `low = 1337.2`
- `close = 1350.75`
- `adj_close = null`
- `volume = 5320000`

This exact signature appears at least `40` times in the sampled `2026-04-30` set and includes:

- `RELIANCE`
- `TCS`
- `INFY`
- `20MICRONS`
- `AXISBANK`
- `BHARTIARTL`
- `HDFCBANK`
- `ICICIBANK`
- `ITC`
- `KOTAKBANK`
- `LT`
- `RELIANCE`
- `SBIN`
- `ULTRACEMCO`
- `WIPRO`
- and many others

### Impact

- The native chart is visually correct relative to the DB, but the underlying candle data for those stocks is likely wrong for `2026-04-30`.
- Any tooltip, latest-close badge, or same-day range view that relies on that row will be misleading.
- This is a **data ingestion integrity issue**, not a frontend chart rendering issue.

### Severity

- `HIGH`

### Likely origin

Most likely a same-day update/import path inserted a shared placeholder or repeated last-day payload across multiple symbols during recent daily-update runs.

## Frontend behavior

### No frontend crash

- Stock pages returned `200`
- Native chart API returned `200`
- Sparse-history stock (`SONAL`) still returned a clean chart payload and should fall into the chart’s limited-point lane safely

### Mobile layout

Best-effort audit result:

- the native chart component uses `w-full`, responsive heights, and no hard-coded desktop-only width containers inside the chart body
- no route-level crash or layout-breaking response was observed

Limitation:

- full browser device-emulation verification was not available in this terminal-only pass, so this is a code-path and route-health confirmation rather than a pixel-perfect mobile QA signoff

## Performance findings

- `1D` to `1Y` ranges are roughly `1.1s - 1.35s` locally
- `5Y` is roughly `1.75s - 1.83s`
- `MAX` is the main heavy path:
  - `RELIANCE` -> `4.2s`
  - `TCS` -> `3.86s`
  - `INFY` -> `4.69s`
  - `20MICRONS` -> `3.02s`

### Performance conclusion

- Normal interactive ranges are acceptable for local admin/dev validation but still not especially fast
- `MAX` is the clear slow lane and may need further pagination/caching/index tuning if it becomes a frequent default or public high-traffic path

## Final verdict

### Chart implementation

- `PASS`

### Chart data accuracy

- `CONDITIONALLY FAIL`

The native chart system is working correctly as software, but the stored same-day candle data for some stocks is suspicious. The chart should stay in place, but the ingestion/data-quality issue for `2026-04-30` needs investigation before using those same-day chart values as trusted market truth.

## Recommended next actions

1. Audit the same-day-only importer for `2026-04-30` writes and identify how the repeated OHLCV signature was inserted across unrelated stocks.
2. Backfill or repair the affected `stock_price_history` rows for the impacted symbols.
3. Add a post-import anomaly check:
   - flag when too many different stocks share the exact same OHLCV + volume signature for the same trade date
4. Consider caching or precomputing `MAX` chart responses for heavy long-history stocks if public usage grows.
