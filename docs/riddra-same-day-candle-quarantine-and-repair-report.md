# Riddra Same-Day Candle Quarantine And Repair Report

Date: 2026-05-01  
Target date: `2026-04-30`

## Scope

This run targeted only the `40` affected symbols identified in:

- [docs/riddra-same-day-candle-corruption-investigation.md](/Users/amitbhawani/Documents/Ai%20FinTech%20Platform/docs/riddra-same-day-candle-corruption-investigation.md)

Rules followed:

- quarantined first
- no hard deletes
- `daily_same_day_only` repair only
- `chart/history` only
- `1` worker
- `1` request every `4` seconds
- verification of symbol-specific raw payloads after repair

## Repair Runner

Scoped runner used:

- [scripts/quarantine-and-repair-same-day-candles.mjs](/Users/amitbhawani/Documents/Ai%20FinTech%20Platform/scripts/quarantine-and-repair-same-day-candles.mjs)

It performs:

1. target-stock resolution for the exact `40` symbols
2. corruption detection for `stock_price_history`
3. related `stock_market_snapshot` capture for the same stocks/date
4. active quarantine inserts into `market_data_row_quarantine`
5. strict same-day-only reimport with `force=true`
6. raw-payload verification after write
7. automatic quarantine resolution only if verification passes

## Live Preconditions

Verified before execution:

- `market_data_row_quarantine` queryable in the connected Supabase project
- affected stock resolution check: `40 / 40`

## Important Fix Discovered During Repair

The first live repair attempt quarantined the rows successfully but did **not** replace the corrupted historical candles.

Root cause:

- strict same-day history writes were still calling the historical writer with `duplicateMode = "skip_existing_dates"` even when `force=true`
- that caused the quarantined `stock_price_history` rows to be treated as existing and skipped

Fix applied:

- [lib/yahoo-finance-import.ts](/Users/amitbhawani/Documents/Ai%20FinTech%20Platform/lib/yahoo-finance-import.ts)

Behavior change:

- strict same-day history writes now use:
  - `replace_matching_dates` when `force=true`
  - `skip_existing_dates` otherwise

This preserved the intended “do not overwrite unless force=true” behavior while allowing the quarantined repair lane to work.

## Final Execution Result

### Quarantine

- corrupted history rows detected: `40`
- related snapshot rows quarantined: `40`
- active quarantine rows inserted on first pass: `80`
- active quarantine rows inserted on final successful pass: `0`
  - because the same `80` rows were already active from the first pass

### Repair

Final successful repair pass:

- requested stocks: `40`
- processed: `40`
- completed: `40`
- failed: `0`
- warnings: `0`
- history rows inserted: `0`
- history rows updated: `40`
- history rows skipped: `0`
- snapshot rows inserted/refreshed: `40`
- snapshot rows skipped: `0`
- `no_data`: `0`
- used latest available trading date fallback: `0`
- stopped early: `No`

### Verification

- repaired history rows verified against symbol-specific raw payloads: `40 / 40`
- repaired snapshot rows verified against symbol-specific raw payloads: `40 / 40`
- invalid history payload links: `0`
- invalid snapshot payload links: `0`
- suspicious shared RELIANCE fixture rows remaining in repaired history set: `0`
- quarantine rows resolved after successful verification: `80`
- active quarantine rows remaining for this 40-symbol repair set: `0`

## Shared RELIANCE Fixture Clearance

I reran a direct DB check for the exact repeated suspicious signature on `2026-04-30` across the repaired `40`-symbol set:

- remaining matching rows: `0`

Cleared signature:

- `open = 1343.6`
- `high = 1356.8`
- `low = 1337.2`
- `close = 1350.75`
- `adj_close = null`
- `volume = 5320000`

## What This Means

The corrupted same-day RELIANCE dry-run fixture contamination has been repaired for the targeted `40` symbols without deleting history.

Operationally:

- bad rows were quarantined first
- corrected same-day history/snapshot rows were written from symbol-specific raw chart payloads
- quarantines were only resolved after verification passed

## Files Changed For This Repair

- [scripts/quarantine-and-repair-same-day-candles.mjs](/Users/amitbhawani/Documents/Ai%20FinTech%20Platform/scripts/quarantine-and-repair-same-day-candles.mjs)
- [lib/yahoo-finance-import.ts](/Users/amitbhawani/Documents/Ai%20FinTech%20Platform/lib/yahoo-finance-import.ts)
- [docs/riddra-same-day-candle-quarantine-and-repair-report.md](/Users/amitbhawani/Documents/Ai%20FinTech%20Platform/docs/riddra-same-day-candle-quarantine-and-repair-report.md)

## Validation

- `node --check scripts/quarantine-and-repair-same-day-candles.mjs` -> PASS
- live quarantine-and-repair runner -> PASS on second pass after force-path fix
- `npm run lint` -> pending rerun after final code/doc updates in this step
- `npx tsc --noEmit` -> pending rerun after final code/doc updates in this step
