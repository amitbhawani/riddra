# Riddra Same-Day Import Source Isolation Fix Report

Date: 2026-05-01

## Goal

Prevent the `daily_same_day_only` Yahoo import path from ever allowing one stock to reuse another stock's chart payload without detection.

This fix focused on:

1. symbol-keyed request isolation
2. raw-import identity consistency
3. payload symbol/date validation before write
4. explicit no-cross-symbol reuse posture
5. anomaly detection that stops a batch when many unrelated symbols share one same-day candle signature

## What changed

### 1. Yahoo chart requests are now explicitly keyed by `yahoo_symbol`

Updated [lib/yahoo-finance-service.ts](/Users/amitbhawani/Documents/Ai%20FinTech%20Platform/lib/yahoo-finance-service.ts):

- `fetchYahooHistoricalPriceData(...)` now writes request-context isolation metadata:
  - `expectedYahooSymbol`
  - `responseIsolationScope = "yahoo_symbol"`
  - `responseIsolationKey = historical_prices:<symbol>`
- chart fetch validation now checks:
  - payload `meta.symbol`
  - request URL target symbol
  - expected symbol alignment before treating the response as valid

This does not add a new shared cache. It makes the request/response identity explicit and rejects symbol-mismatched chart payloads.

### 2. Raw response identity is validated before downstream use

The raw response persistence path already stored:

- `stock_id`
- `symbol`
- `yahoo_symbol`
- `request_url`

The new guard now ensures the fetched chart payload also agrees with that symbol identity before the import can continue successfully.

### 3. Same-day normalization validates symbol and date before writing

Updated [lib/yahoo-finance-import.ts](/Users/amitbhawani/Documents/Ai%20FinTech%20Platform/lib/yahoo-finance-import.ts):

- added `validateYahooSameDayHistoricalSourceIsolation(...)`
- added `effectiveHistoricalRow` to the same-day import result
- same-day imports now verify:
  - requested Yahoo symbol
  - resolved Yahoo symbol
  - raw import Yahoo symbol
  - chart payload `meta.symbol`
  - request URL symbol
  - effective row date is not after the target date

If any of those checks fail, the same-day import throws before historical normalization can proceed.

### 4. Cross-symbol same-day spike detection now stops the batch

Updated [lib/yahoo-finance-batch-import.ts](/Users/amitbhawani/Documents/Ai%20FinTech%20Platform/lib/yahoo-finance-batch-import.ts):

- added `detectSuspiciousSameDaySignatureSpike(...)`
- `runYahooDailySameDayOnlyUntilComplete(...)` now tracks newly written same-day candles
- if the same OHLCV signature appears across `3+` distinct symbols in one batch:
  - a warning is raised
  - the batch stops early
  - `stoppedEarly` and `stopReason` are returned

This is the critical second line of defense for the exact corruption pattern we investigated.

## Important nuance

The dry-run fixture system still intentionally patches only the symbol metadata while reusing RELIANCE-shaped candle values.

That means:

- symbol identity checks alone are not enough
- the anomaly spike detector is necessary

In other words:

- symbol isolation now blocks obvious cross-symbol identity mismatches
- signature-spike detection blocks suspicious many-symbol same-day candle reuse even when metadata has been patched to look valid

## 5-symbol dry-run-style verification

Added:

- [scripts/verify-yahoo-same-day-source-isolation.mjs](/Users/amitbhawani/Documents/Ai%20FinTech%20Platform/scripts/verify-yahoo-same-day-source-isolation.mjs)

It checks five distinct symbols:

- `RELIANCE.NS`
- `TCS.NS`
- `INFY.NS`
- `HDFCBANK.NS`
- `ICICIBANK.NS`

What it verifies:

1. fixture payload symbols are patched to the requested symbol
2. same-day source-isolation validation passes for symbol/date identity
3. all five still share one identical same-day candle signature
4. the anomaly detector correctly raises a stop condition

Observed output:

- `symbolCount = 5`
- `payloadSymbols = [RELIANCE.NS, TCS.NS, INFY.NS, HDFCBANK.NS, ICICIBANK.NS]`
- `uniqueSignatureCount = 1`
- anomaly detector:
  - `shouldStop = true`
  - threshold `3`
  - detected all `5` symbols in the same spike

This is the expected result and proves the new job-level guard would stop a contaminated same-day batch.

## Files changed

- [lib/yahoo-finance-service.ts](/Users/amitbhawani/Documents/Ai%20FinTech%20Platform/lib/yahoo-finance-service.ts)
- [lib/yahoo-finance-import.ts](/Users/amitbhawani/Documents/Ai%20FinTech%20Platform/lib/yahoo-finance-import.ts)
- [lib/yahoo-finance-batch-import.ts](/Users/amitbhawani/Documents/Ai%20FinTech%20Platform/lib/yahoo-finance-batch-import.ts)
- [scripts/verify-yahoo-same-day-source-isolation.mjs](/Users/amitbhawani/Documents/Ai%20FinTech%20Platform/scripts/verify-yahoo-same-day-source-isolation.mjs)

## Validation

- `npm run lint` -> PASS
- `npx tsc --noEmit` -> PASS
- `node scripts/verify-yahoo-same-day-source-isolation.mjs` -> PASS

Note:

- the verification script prints a Node warning about typeless package parsing because the repo is not marked as `"type": "module"`. That warning does not affect the check result.

## Practical outcome

After this fix:

- a chart payload with the wrong symbol should not proceed as a valid same-day import
- a suspicious repeated same-day OHLCV pattern across many distinct symbols will stop the batch
- same-day-only imports now have both identity validation and anomaly-based containment

## Remaining follow-up

This does not repair the already-corrupted `2026-04-30` rows. It prevents the same corruption pattern from spreading further.

The repair step should still be handled separately with a targeted rebuild of affected same-day rows after approval.
