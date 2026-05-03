# Riddra 50-Stock Quote Statistics Import Report

Last updated: 2026-04-29 IST

## Scope

Controlled Yahoo Finance `quote_statistics` import for the same first `50` active NSE stocks used in the historical pilot.

Settings used:

- modules: `quote_statistics` only
- request pace: `1 request/sec`
- workers: `1`
- import-only-missing-data: `true`
- duplicate mode: `skip_existing_dates`
- safe fallback / degraded mode: `enabled`
- no financial statements
- no parallel fetch

Execution path:

- durable Yahoo batch API: `/api/admin/market-data/import/yahoo-batch`
- batch job id: `b874d3bc-f479-431b-8290-096a37166421`

## Time Taken

| Metric | Value |
|---|---:|
| Started at | `2026-04-29T03:08:42.688Z` |
| Completed at | `2026-04-29T03:34:32.810Z` |
| Total duration | `1550.122 seconds` |
| Total duration | `25m 50.1s` |
| Average time per stock | `31.00s` |

## High-Level Result

| Metric | Value |
|---|---:|
| Stocks targeted | `50` |
| Stocks completed successfully | `50` |
| Stocks failed | `0` |
| Stocks skipped | `0` |
| Success rate | `100%` |
| Stocks completed with warnings | `50` |
| Stocks completed cleanly | `0` |
| Batch report status | `completed` |
| Parent job status | `completed_with_errors` |
| Module completion for `quote_statistics` | `100%` |

Important interpretation:

- this run was **successful in degraded mode**
- all `50` stocks completed without fatal import failure
- the parent job is `completed_with_errors` only because Yahoo protected endpoints failed and the importer correctly recorded warnings instead of crashing

## Degraded Mode Behavior

The importer followed the expected safe fallback path:

1. attempted Yahoo latest quote endpoint
2. attempted Yahoo quote summary statistics modules
3. detected protected-endpoint failure (`401` / `Invalid Crumb`)
4. fell back to Yahoo chart/history data for latest market snapshot
5. wrote latest snapshot data
6. recorded missing valuation/share/highlights fields as warnings
7. completed the stock import instead of failing it

This means:

- `latest_market_snapshot` normalized successfully for all `50` stocks
- `valuation_metrics`, `share_statistics`, and `financial_highlights` were treated as unavailable data, not fatal errors

## Raw Yahoo Request Summary

Time window analyzed:

- `2026-04-29T03:08:42.688Z`
- `2026-04-29T03:34:32.810Z`

| Raw request type | Status | Count |
|---|---|---:|
| `quote_latest` / `quote` | `failed` / `401` | `200` |
| `quote_summary` / `summaryDetail,defaultKeyStatistics,financialData,price` | `failed` / `401` | `200` |
| `historical_prices` / `chart` | `completed` / `200` | `50` |
| **Total raw responses saved** |  | **`450`** |

Interpretation:

- each stock hit protected Yahoo quote/statistics endpoints that returned `401`
- the fallback chart request succeeded for each stock
- raw responses were still durably saved for every attempt

## Rows Imported / Updated

| Table / metric | Count |
|---|---:|
| `stock_market_snapshot` rows touched | `50` |
| `stock_valuation_metrics` rows touched | `0` |
| `stock_share_statistics` rows touched | `0` |
| `stock_financial_highlights` rows touched | `0` |
| `stock_import_coverage` rows updated | `200` |
| `stock_import_job_items` written | `50` |
| `stock_import_reconciliation` rows written | `200` |
| `stock_import_activity_log` rows written | `850` |

Coverage row interpretation:

- `50` stocks x `4` quote-stat buckets = `200` coverage rows
- only the snapshot bucket had normalized writes in this live run
- the other three buckets were recorded as `no_data` / unavailable with explicit coverage and reconciliation evidence

## Field Fill Percentage

### Latest Market Snapshot

| Metric | Value |
|---|---:|
| Total mapped fields | `550` |
| Filled fields | `500` |
| Missing fields | `50` |
| Average fill percentage | `90.91%` |

Common missing field:

- `market_cap` was missing for all `50` stocks in chart-fallback mode

### Valuation Metrics

| Metric | Value |
|---|---:|
| Total mapped fields | `550` |
| Filled fields | `0` |
| Missing fields | `550` |
| Average fill percentage | `0%` |

### Share Statistics

| Metric | Value |
|---|---:|
| Total mapped fields | `500` |
| Filled fields | `0` |
| Missing fields | `500` |
| Average fill percentage | `0%` |

### Financial Highlights

| Metric | Value |
|---|---:|
| Total mapped fields | `650` |
| Filled fields | `0` |
| Missing fields | `650` |
| Average fill percentage | `0%` |

## Most Common Missing Fields

Missing for all `50` stocks:

- `market_cap`
- `enterprise_value`
- `trailing_pe`
- `forward_pe`
- `peg_ratio`
- `price_to_book`
- `ev_to_revenue`
- `ev_to_ebitda`
- `trailing_eps`
- `forward_eps`
- `dividend_yield`
- `shares_outstanding`
- `float_shares`
- `implied_shares_outstanding`
- `shares_short`
- `shares_short_prior_month`
- `shares_short_ratio`
- `short_percent_float`
- `short_percent_shares_outstanding`
- `held_percent_insiders`
- `held_percent_institutions`

These were recorded as missing/unavailable fields, not fatal validation failures.

## Reconciliation Summary

| Module | Rows | Raw records | Normalized records | Unmapped | Status |
|---|---:|---:|---:|---:|---|
| `latest_market_snapshot` | `50` | `50` | `50` | `0` | `completed_with_warnings` |
| `valuation_metrics` | `50` | `0` | `0` | `0` | `no_data` |
| `share_statistics` | `50` | `0` | `0` | `0` | `no_data` |
| `financial_highlights` | `50` | `0` | `0` | `0` | `no_data` |

This confirms:

- raw-vs-normalized reconciliation is working
- missing protected-endpoint data is being classified deterministically
- no partial hidden failure occurred

## Errors and Retries

| Metric | Value |
|---|---:|
| `stock_import_errors` rows created during this run | `400` |
| Fatal stock import failures | `0` |
| Cooldown triggered | `no` |
| Final `lastYahooError` | `null` |
| Final `lastFailedModule` | `null` |
| Final `lastFailedSymbol` | `null` |

Top non-fatal upstream errors recorded:

| Module | Code | Message pattern | Count |
|---|---|---|---:|
| `quote_latest` | `401` | `User is unable to access this feature...` | `200` |
| `valuation_statistics` | `401` | `Invalid Crumb` | `200` |

Interpretation:

- these were expected protected-endpoint failures
- they were logged for auditability
- they did **not** escalate into fatal stock failures
- no uncontrolled retry loop was observed

## Activity Log Summary

Step-level activity logging was populated throughout the run.

By module:

| Module | Activity rows | Typical outcome |
|---|---:|---|
| `latest_market_snapshot` | `350` | chart fallback used, snapshot normalized |
| `valuation_metrics` | `150` | warning / skipped due to unavailable data |
| `share_statistics` | `150` | warning / skipped due to unavailable data |
| `financial_highlights` | `150` | warning / skipped due to unavailable data |
| `valuation_statistics` | `50` | fetch-start audit rows |

Representative per-stock pattern:

- `fetch_completed` with fallback note
- `normalization_completed` with `rows_inserted=1`
- warning activity for valuation/share/highlight buckets with missing field counts and upstream Yahoo error context

## Yahoo Block Signals

No Yahoo hard block / rate-limit event was observed in this run.

Evidence:

- cooldown remained `null`
- consecutive Yahoo failure guard did not trip
- no batch pause occurred
- no `429` or cooldown status ended the run
- all `50` fallback chart fetches completed successfully

Guardrails remained active throughout:

- `YAHOO_FINANCE_REQUESTS_PER_SECOND = 1`
- `YAHOO_FINANCE_MAX_CONCURRENT_WORKERS = 1`
- bounded retries stayed in place
- safe degraded completion behavior remained active

## Route Health Check

Verified after completion:

| Route | Result |
|---|---|
| `/admin/market-data/stocks` | `200` |
| `/stocks/reliance-industries` | `200` |

## Conclusion

This controlled 50-stock `quote_statistics` pilot was successful in degraded mode.

- all `50` stocks completed
- no stock failed
- latest market snapshots were normalized for all `50` stocks
- missing valuation/share/highlight fields were recorded explicitly and treated as non-fatal
- raw responses, coverage, activity logs, and reconciliation records were all written
- Yahoo protected endpoints still remain unavailable in this runtime, but the fallback path behaved correctly and safely

Operational conclusion:

- quote import is safe to run in degraded mode for snapshot coverage
- it is **not yet a full fundamentals import path** until Yahoo protected statistics modules become reliably accessible
- the importer currently handles that limitation correctly by finishing safely, logging warnings, and preserving audit evidence
