# Riddra 50-Stock Historical Import Report

Last updated: 2026-04-29 IST

## Scope

Controlled initial Yahoo Finance historical-only import for the first 50 active NSE stocks in `stocks_master`.

Settings used:

- modules: `historical_prices` only
- request pace: `1 request/sec`
- workers: `1`
- import-only-missing-data: `true`
- duplicate mode: `skip_existing_dates`
- no quote/statistics
- no financial statements

Execution path:

- durable Yahoo batch API: `/api/admin/market-data/import/yahoo-batch`
- batch job id: `a045d52c-330e-47a8-b5a8-3239e5ec73a6`

## Time Taken

| Metric | Value |
|---|---:|
| Started at | `2026-04-29T02:59:06.457Z` |
| Completed at | `2026-04-29T03:04:48.770Z` |
| Total duration | `342.313 seconds` |
| Total duration | `5m 42.3s` |
| Average time per stock | `6.85s` |

## High-Level Result

| Metric | Value |
|---|---:|
| Stocks targeted | `50` |
| Stocks completed successfully | `50` |
| Stocks failed | `0` |
| Stocks skipped | `0` |
| Success rate | `100%` |
| Stocks completed with warnings | `46` |
| Stocks completed cleanly | `4` |
| Batch final status | `completed_with_errors` |

Important note:

- the batch landed in `completed_with_errors` because the importer classifies historical gap warnings as warnings
- there were **no actual Yahoo request failures** and **no stock-level import failures**

## Rows Imported

### Durable totals

| Table / metric | Count |
|---|---:|
| `raw_yahoo_imports` rows saved | `50` |
| `stock_price_history` rows inserted | `13208` |
| `stock_import_coverage` rows updated | `50` |
| `stock_import_reconciliation` rows written | `50` |
| Raw records fetched across all stocks | `14176` |
| Normalized records written | `13208` |
| Unmapped records | `968` |

### Reconciliation summary

| Status | Count |
|---|---:|
| `completed` | `45` |
| `completed_with_warnings` | `5` |

Interpretation:

- `14176` raw historical candles were fetched from Yahoo
- `13208` normalized daily rows were written to `stock_price_history`
- `968` raw records were not normalized, which is expected for non-trading gaps / upstream candle-shape differences in long historical series

## Activity / Coverage Summary

Step-level activity log verification:

| Step | Count |
|---|---:|
| `fetch_completed` | `50` |
| `normalization_completed` | `50` |
| `coverage_updated` | `50` |
| `reconciliation_completed` | `50` |

Coverage result:

- module completion for `historical_prices`: `100%`
- historical data completion percentage: `100%`

## Errors

| Metric | Value |
|---|---:|
| `stock_import_errors` rows created during this run | `0` |
| Failed Yahoo requests | `0` |
| Failed stock imports | `0` |
| Retry-triggered failures | `0` |

Operational note:

- the long-running initial POST client timed out while waiting on the HTTP response
- the durable batch job itself continued server-side and completed successfully
- final verification was done from durable batch tables and the batch report endpoint

## Yahoo Block Signals

No Yahoo blocking or rate-limit behavior was observed in this run.

Evidence:

- raw response count: `50`
- raw response status set: `completed:200`
- cooldown triggered: `no`
- last Yahoo error: `null`
- failed symbols: `0`
- consecutive Yahoo failures at end of run: `0`

Guardrails remained active throughout:

- `YAHOO_FINANCE_REQUESTS_PER_SECOND = 1`
- `YAHOO_FINANCE_MAX_CONCURRENT_WORKERS = 1`
- `YAHOO_FINANCE_MAX_RETRIES` remained bounded
- cooldown window remained available but unused

## Warning Pattern

Most warnings were historical gap warnings such as:

- `Detected 5930 weekday gaps in the Yahoo historical series.`

Warning summary:

- unique warning variants: `41`
- most repeated warning: `Detected 5930 weekday gaps in the Yahoo historical series.` (`6` stocks)

These warnings did **not** block import and did **not** create `stock_import_errors` rows.

## Largest Historical Inserts

| Symbol | Inserted rows |
|---|---:|
| `AADHARHFC.NS` | `484` |
| `ACEINTEG.NS` | `461` |
| `ABCAPITAL.NS` | `454` |
| `ABDL.NS` | `452` |
| `AARVI.NS` | `449` |

## Route Health Check

Verified after completion:

| Route | Result |
|---|---|
| `/admin/market-data/stocks` | `200` |

## Conclusion

This controlled 50-stock historical pilot was successful.

- historical-only import is stable at `1 req/sec`
- one-worker mode behaved correctly
- no Yahoo block signals appeared
- no stock-level failures occurred
- durable raw save, normalization, coverage, and reconciliation all completed

The main operational caveat is that very long-running HTTP clients should rely on durable job polling rather than waiting on a single open request for the whole batch.
