# Riddra Native Stock Chart Post-Repair Audit Report

Date: 2026-05-01  
Scope: native chart verification after the 40-symbol `2026-04-30` quarantine-and-repair run

## Executive Summary

Post-repair chart status: `PASS`

The earlier shared RELIANCE dry-run fixture candle is no longer present in the audited repaired symbols. The native chart API is now returning distinct, symbol-appropriate `1D` candles again for the repaired names.

## Repair Dependency Status

The post-repair audit was run only after the quarantine-and-repair flow completed successfully:

- active quarantine rows inserted earlier: `80`
- quarantine rows resolved after verified repair: `80`
- active quarantine rows still remaining for the repaired set: `0`

## Native Chart API Recheck

Audited `1D` native chart routes:

1. `/api/stocks/reliance-industries/chart?range=1D`
2. `/api/stocks/tcs/chart?range=1D`
3. `/api/stocks/infosys/chart?range=1D`
4. `/api/stocks/20-microns-limited/chart?range=1D`
5. `/api/stocks/sonal-mercantile-limited/chart?range=1D`

### Results

#### RELIANCE

- status: `200`
- duration: `6049ms`
- point count: `1`
- returned candle:
  - `open = 1409`
  - `high = 1437`
  - `low = 1393.099976`
  - `close = 1430.800049`
  - `adjustedClose = 1430.800049`
  - `volume = 30957881`

#### TCS

- status: `200`
- duration: `2177ms`
- point count: `1`
- returned candle:
  - `open = 2479`
  - `high = 2491`
  - `low = 2438`
  - `close = 2473.899902`
  - `adjustedClose = 2473.899902`
  - `volume = 3970446`

#### INFY

- status: `200`
- duration: `2000ms`
- point count: `1`
- returned candle:
  - `open = 1167.5`
  - `high = 1189.800049`
  - `low = 1159.599976`
  - `close = 1181.800049`
  - `adjustedClose = 1181.800049`
  - `volume = 12205669`

#### 20MICRONS

- status: `200`
- duration: `2562ms`
- point count: `1`
- returned candle:
  - `open = 179.550003`
  - `high = 179.820007`
  - `low = 175.410004`
  - `close = 176.889999`
  - `adjustedClose = 176.889999`
  - `volume = 53904`

#### SONAL

- status: `200`
- duration: `1404ms`
- point count: `1`
- returned candle:
  - `open = 99.5`
  - `high = 104.5`
  - `low = 99.5`
  - `close = 104.400002`
  - `adjustedClose = 104.400002`
  - `volume = 123`

## Public Stock Route Health

Public route recheck:

- `/stocks/reliance-industries` -> `200` in `8143ms`
- `/stocks/tcs` -> `200` in `5035ms`
- `/stocks/infosys` -> `200` in `5107ms`
- `/stocks/20-microns-limited` -> `200` in `4492ms`
- `/stocks/sonal-mercantile-limited` -> `200` in `3974ms`

No route-level crash was observed in the audited repaired pages.

## Shared RELIANCE Fixture Verification

The previous suspicious `2026-04-30` shared candle:

- `open = 1343.6`
- `high = 1356.8`
- `low = 1337.2`
- `close = 1350.75`
- `adjustedClose = null`
- `volume = 5320000`

is no longer returned by the native chart API for:

- `RELIANCE`
- `TCS`
- `INFY`
- `20MICRONS`

I also verified directly in DB that the repaired `40`-symbol scope has:

- remaining matching suspicious rows: `0`

## Final Verdict

- quarantine-first repair status: `PASS`
- symbol-specific raw payload verification: `PASS`
- suspicious shared fixture candle remaining in repaired set: `0`
- native chart post-repair audit: `PASS`

## Remaining Note

This audit confirms the repaired 40-symbol slice is clean. It does not automatically certify unrelated same-day data outside that quarantined scope.
