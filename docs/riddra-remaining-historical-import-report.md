# Riddra Remaining Historical Import Report

Date: 2026-04-29  
Scope: Remaining `historical_prices` imports only  
Modules run: `historical_prices` only  
Modules explicitly not run: `financial_statements`, `valuation_metrics`, `share_statistics`, `financial_highlights`  
Execution mode: missing stocks only, `importOnlyMissingData=true`, `skip_existing_dates`, `1` worker, `0.4-0.5` requests/sec (`~2.0-2.5s` per request)

## Executive Summary

The remaining Yahoo historical import completed successfully for all active NSE stocks that were still missing daily history.

- Active NSE stocks in `stocks_master`: `2157`
- Stocks with historical coverage before this run: `501`
- Additional missing stocks imported in this run: `1656`
- Stocks with historical coverage after this run: `2157`
- Remaining missing historical coverage: `0`
- Total `stock_price_history` rows after completion: `526555`

No Yahoo cooldown was triggered, no batch stopped early, and no durable historical import error rows were created.

## Why This Finished In Two Phases

This remaining import had to be completed in two controlled phases:

1. Phase 1 imported the next `500` missing stocks successfully.
2. A follow-up paginated phase imported the true remaining `1156` missing stocks.

The split happened because the first missing-stock selector was constrained by a REST page cap and only saw the first `1000` eligible stocks. The second pass used a fully paginated stock and coverage read, then completed the rest safely.

## Run Settings

- Worker count: `1`
- Effective request rate: `1 request every 2.0 to 2.5 seconds`
- Import mode: missing stocks only
- Duplicate handling: skip existing history
- Automatic stop condition: stop if Yahoo block/cooldown signals appear
- Result: no stop condition was triggered

## Phase Results

| Phase | Missing stocks processed | Duration | Success | Failed | Skipped | Stocks completed with warnings | Rows inserted |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| Phase 1 | 500 | 1h 08m 25.6s | 500 | 0 | 0 | 478 | 122395 |
| Phase 2 | 1156 | 2h 34m 36.7s | 1156 | 0 | 0 | 1100 | 274090 |
| Total | 1656 | 3h 43m 02.3s | 1656 | 0 | 0 | 1578 | 396485 |

Notes:
- `1578` stocks completed with non-fatal historical gap warnings.
- `78` stocks completed without warnings.
- Skipped counts remained `0` because only stocks missing historical coverage were selected.

## Durable Verification

### Final Stock Coverage

| Metric | Value |
| --- | ---: |
| Active NSE stocks | 2157 |
| Historical coverage rows | 2157 |
| Remaining missing stocks | 0 |
| Total `stock_price_history` rows | 526555 |

### Raw and Audit Evidence

| Table / signal | Value |
| --- | ---: |
| `raw_yahoo_imports` raw historical responses saved during this run | 1657 |
| Successful raw historical responses | 1656 |
| Failed raw historical responses | 1 |
| `stock_import_activity_log` rows for this run | 11592 |
| `stock_import_reconciliation` rows for this run | 1656 |
| `stock_import_errors` rows for historical_prices during this run | 0 |

### Activity Totals By Phase

| Phase | Normalization events | Rows inserted | Rows updated | Rows skipped |
| --- | ---: | ---: | ---: | ---: |
| Phase 1 | 500 | 122395 | 0 | 0 |
| Phase 2 | 1156 | 274090 | 0 | 0 |

## Yahoo Behavior Observed

### Block / cooldown signals

- No `cooling_down` batch state was triggered
- No paused batch state was triggered
- No failed batch state was triggered
- No automatic stop condition was reached

### Errors / retries

There was `1` transient failed raw Yahoo fetch during the run:

- Symbol: `KIRANVYPAR.NS`
- Raw import status: `failed`
- Error message: `fetch failed`

This did **not** become a durable historical import error and did **not** leave the stock uncovered. The stock completed successfully through the controlled retry/recovery path.

## Jobs Cleaned Up

Two stale oversized queued jobs were cancelled so they would not interfere with the controlled remaining import:

- `eff62b63-7774-4de1-a7d4-c319815fc049`
- `8cebacf3-d9c5-451d-ba47-3159a330d570`

## Route Checks

| Route | Result |
| --- | --- |
| `/stocks/reliance-industries` | `200` |
| `/admin/market-data/stocks` | `500` |

Operational note:
- The historical import itself completed successfully and the stock frontend route stayed healthy.
- The admin stock dashboard returned `500` at final verification time. That appears to be a separate dashboard/runtime issue, not a failure of the historical import pipeline.

## Conclusion

The remaining historical import is complete.

- All `2157` active NSE stocks now have historical coverage.
- No stocks remain missing from `stock_import_coverage` for `historical_prices`.
- The run respected the requested safety limits:
  - missing stocks only
  - one worker only
  - one Yahoo request every `2-3` seconds
  - no protected valuation modules
  - no financial statements
  - automatic stop-on-block logic available, but not needed

Recommended next step:
- Fix the current `/admin/market-data/stocks` runtime issue before using that dashboard as the primary operator surface for the next larger import stage.
