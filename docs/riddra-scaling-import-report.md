# Riddra Yahoo Scaling Import Report

Last updated: 2026-04-29 IST

## Scope

Staged Yahoo Finance expansion using the production-safe batch importer.

Stages executed:

1. `50 -> 250` stocks
2. `250 -> 500` stocks

Modules executed:

- `historical_prices`
- `quote_statistics`

Safe settings used throughout:

- `importOnlyMissingData = true`
- `YAHOO_FINANCE_REQUESTS_PER_SECOND = 1`
- `YAHOO_FINANCE_MAX_CONCURRENT_WORKERS = 1`
- no parallel fetch
- no financial statements

## Stage Jobs

| Stage | Scope | Job ID | Effective status |
|---|---|---|---|
| `50 -> 250` | next `200` stocks (`51-250`) | `89dfd652-9ff0-46b4-ab75-ecabdcb3ffb4` | `completed` |
| `250 -> 500` | next `250` stocks (`251-500`) | `853a60e7-587f-47b8-8e0f-17c830e66aba` | `completed` |

Notes:

- stage 2 had one first-pass failure on `BESTAGRO.NS` for `quote_statistics`
- the failed item was requeued with the built-in retry control
- retry succeeded, so the final effective stage result is `250/250` completed

## Stage 1: 50 -> 250

### Time Taken

| Metric | Value |
|---|---:|
| Started at | `2026-04-29T03:43:04.408Z` |
| Completed at | `2026-04-29T05:58:12.450Z` |
| Duration | `8108.042 seconds` |
| Duration | `2h 15m 8.0s` |
| Average time per stock | `40.54s` |

### Outcome

| Metric | Value |
|---|---:|
| Stocks targeted | `200` |
| Stocks completed | `200` |
| Stocks failed | `0` |
| Success rate | `100%` |
| Historical completion | `100%` |
| Quote completion | `100%` |
| Warning items | `393` |

### Rows Imported

| Table / metric | Count |
|---|---:|
| `stock_price_history` inserted rows | `49,099` |
| `stock_market_snapshot` created rows | `200` |
| `stock_valuation_metrics` created rows | `0` |
| `stock_share_statistics` created rows | `0` |
| `stock_financial_highlights` created rows | `0` |
| `stock_import_coverage` created rows | `1,000` |
| `stock_import_activity_log` created rows | `4,800` |
| `stock_import_reconciliation` created rows | `1,000` |

### Raw Yahoo Responses

| Request pattern | Count |
|---|---:|
| `historical_prices | completed | 200` | `400` |
| `quote_latest | failed | 401` | `800` |
| `quote_summary | failed | 401` | `800` |
| **Total raw responses saved** | **`2,000`** |

Note:

- the `historical_prices | completed | 200` count includes both the dedicated historical-module chart calls and the chart fallback calls used by degraded `quote_statistics`

### Errors

| Error pattern | Count |
|---|---:|
| `quote_latest | 401` | `800` |
| `valuation_statistics | 401` | `800` |
| **Total `stock_import_errors` rows** | **`1,600`** |

Interpretation:

- all errors were non-fatal Yahoo protected-endpoint failures
- degraded quote mode handled them correctly
- no stock-level failure occurred in stage 1

## Stage 2: 250 -> 500

### Time Taken

| Metric | Value |
|---|---:|
| Started at | `2026-04-29T06:01:42.896Z` |
| Completed at | `2026-04-29T08:57:42.230Z` |
| Duration | `10559.334 seconds` |
| Duration | `2h 55m 59.3s` |
| Average time per stock | `42.24s` |

### Outcome

| Metric | Value |
|---|---:|
| Stocks targeted | `250` |
| Stocks completed | `250` |
| Stocks failed after retry | `0` |
| First-pass failed stocks | `1` |
| First-pass failed symbol | `BESTAGRO.NS` |
| Success rate after retry | `100%` |
| Historical completion | `100%` |
| Quote completion | `100%` |
| Warning items | `486` |

### Rows Imported

| Table / metric | Count |
|---|---:|
| `stock_price_history` inserted rows | `60,028` |
| `stock_market_snapshot` created rows | `250` |
| `stock_valuation_metrics` created rows | `0` |
| `stock_share_statistics` created rows | `0` |
| `stock_financial_highlights` created rows | `0` |
| `stock_import_coverage` created rows | `1,250` |
| `stock_import_activity_log` created rows | `6,002` |
| `stock_import_reconciliation` created rows | `1,250` |

### Raw Yahoo Responses

| Request pattern | Count |
|---|---:|
| `historical_prices | completed | 200` | `500` |
| `quote_latest | failed | 401` | `1,003` |
| `quote_summary | failed | 401` | `1,000` |
| `quote_latest | failed | no HTTP status` | `1` |
| **Total raw responses saved** | **`2,504`** |

Note:

- the `historical_prices | completed | 200` count includes both the dedicated historical-module chart calls and the chart fallback calls used by degraded `quote_statistics`

### Errors

| Error pattern | Count |
|---|---:|
| `quote_latest | 401` | `1,003` |
| `valuation_statistics | 401` | `1,000` |
| `quote_latest | NETWORK_OR_TIMEOUT` | `1` |
| `quote_statistics | no code` | `2` |
| **Total `stock_import_errors` rows** | **`2,006`** |

### Retry Result

The only first-pass failed item was:

- symbol: `BESTAGRO.NS`
- module: `quote_statistics`
- first-pass failure shape: transient `fetch failed`

Action taken:

- batch `retry` control was used
- worker was run again for the requeued item
- retry completed successfully

Final result:

- `BESTAGRO.NS` finished in degraded quote mode
- stage 2 ended at `250/250` completed

## Combined Result

### Total Time

| Metric | Value |
|---|---:|
| Stage 1 duration | `2h 15m 8.0s` |
| Stage 2 duration | `2h 55m 59.3s` |
| Combined active import time | `18667.376 seconds` |
| Combined active import time | `5h 11m 7.4s` |
| Average time per newly imported stock | `41.48s` |

### Combined Coverage

| Metric | Value |
|---|---:|
| New stocks processed in these stages | `450` |
| Final completed stocks | `450` |
| Final failed stocks | `0` |
| Historical completion | `100%` |
| Quote completion | `100%` |

### Combined Durable Writes

| Table / metric | Count |
|---|---:|
| `stock_price_history` inserted rows | `109,127` |
| `stock_market_snapshot` created rows | `450` |
| `stock_valuation_metrics` created rows | `0` |
| `stock_share_statistics` created rows | `0` |
| `stock_financial_highlights` created rows | `0` |
| `stock_import_coverage` created rows | `2,250` |
| `stock_import_activity_log` created rows | `10,802` |
| `stock_import_reconciliation` created rows | `2,250` |
| `raw_yahoo_imports` saved rows | `4,504` |
| `stock_import_errors` rows | `3,606` |

## Yahoo Block Signals

Observed at scale:

- Yahoo chart/history endpoint remained usable
- Yahoo protected quote/statistics endpoints continued returning `401`
- no batch cooldown was triggered
- no hard `429` batch pause occurred
- no hourly or daily guardrail threshold was breached

The dominant Yahoo pattern remained:

- `quote_latest` protected endpoint failure
- `quote_summary` protected endpoint failure
- chart/history fallback success

This is the same degraded mode pattern seen in the earlier smaller pilot, now proven across `450` newly imported stocks.

## What Worked

- `historical_prices` scaled cleanly across both ramps
- `quote_statistics` degraded mode remained stable at larger scale
- missing valuation/share/highlight fields stayed non-fatal
- raw capture, coverage, activity log, and reconciliation writes all kept working
- retry control recovered the only first-pass failed stock

## What Did Not Populate

These quote-derived normalized tables still did not receive rows in this runtime:

- `stock_valuation_metrics`
- `stock_share_statistics`
- `stock_financial_highlights`

Reason:

- Yahoo protected statistics modules remained unavailable
- the importer correctly preserved progress by writing market snapshots plus warning/coverage evidence instead of failing the stock

## Route Checks

Verified after staged expansion:

| Route | Result |
|---|---|
| `/admin/market-data/stocks` | `200` |
| `/stocks/reliance-industries` | `200` |
| `/stocks/best-agrolife-limited` | `404` |
| `/stocks/dhanlaxmi-bank-limited` | `404` |

Interpretation:

- the admin import dashboard remained healthy
- the established Reliance stock page still rendered
- newly imported universe members do **not** automatically become public stock pages
- public routing/content enablement remains a separate concern from Yahoo import durability

## Conclusion

This staged expansion was successful.

- `50 -> 250` completed at `200/200`
- `250 -> 500` completed at `250/250` after one targeted retry
- `historical_prices` is production-stable at this scale under the current guardrails
- `quote_statistics` degraded mode is also operationally stable at this scale
- Yahoo protected fundamentals endpoints are still unavailable, but the fallback path is robust and audit-friendly

Operational takeaway:

- it is safe to continue scaling `historical_prices` and degraded `quote_statistics`
- it is **not** yet a full valuation/statistics ingestion path until Yahoo protected modules become reliably accessible
