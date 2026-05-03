# Riddra Missing Snapshot Import Report

Date: 2026-04-29  
Scope: missing-only latest snapshot import for active NSE stocks in `stocks_master`  
Mode: chart-only snapshot import, no protected Yahoo quoteSummary modules, no financial statements  

## Run configuration

- Universe: active NSE stocks from `stocks_master`
- Eligible scope: only stocks missing `stock_market_snapshot` data
- Worker count: `1`
- Request pace: `0.5` requests/second (`1` request every `2` seconds)
- Import mode: missing-only
- Protected modules: not called
- Financial statements: not run
- Stop condition: automatic stop on repeated Yahoo/provider block signals

## Final result

The missing-only latest snapshot import completed successfully.

- Eligible stocks: `1656`
- Processed stocks: `1656`
- New snapshots created: `1656`
- Skipped existing snapshots: `0`
- Failed snapshots: `0`
- Requests avoided: `0`
- Raw responses saved by the run: `1656`
- Provider block failures: `0`
- Stopped early: `No`

## Duration

- Started at: `2026-04-29T15:23:52.454Z`
- Completed at: `2026-04-29T17:39:43.191Z`
- Total duration: `8,150,737 ms`
- Human duration: `2h 15m 50.7s`

## Why skipped/request-avoided counts stayed at zero

This run selected the true no-snapshot gap only. Because the importer was pointed only at stocks with no existing `stock_market_snapshot` row:

- no same-day snapshot rows had to be skipped
- no Yahoo requests were avoided by reusing existing snapshot rows

That is the expected result for a pure missing-only snapshot backfill.

## Durable verification

### Snapshot coverage after completion

| Metric | Value |
| --- | ---: |
| Active NSE stocks in `stocks_master` | `2157` |
| `stock_import_coverage` rows for `latest_market_snapshot` | `2157` |
| Total `stock_market_snapshot` rows | `2158` |

Notes:
- Coverage is now present for the full active NSE universe.
- `stock_market_snapshot` row count is `2158`, slightly above the active stock count, because at least one stock already has more than one day-level snapshot row retained.

### Raw, activity, reconciliation, and errors

| Metric | Value |
| --- | ---: |
| Raw responses saved by the run summary | `1656` |
| Broad DB time-window chart raw rows after start time | `1659` |
| `stock_import_activity_log` rows for `latest_market_snapshot` during this run | `11592` |
| `stock_import_reconciliation` rows for `latest_market_snapshot` during this run | `1656` |
| `stock_import_errors` rows for `quote_statistics` during this run | `0` |

Operational note:
- The authoritative run summary recorded `1656` raw responses for the run itself.
- The broader raw-table time-window count was slightly higher because it is not isolated to this one operation with a dedicated run id.

## Snapshot normalization quality

All snapshot jobs completed safely, but they completed in warning mode rather than perfect-complete mode.

### Normalization summary

| Metric | Value |
| --- | ---: |
| Normalization events | `1656` |
| Inserted snapshots | `1656` |
| Updated snapshots | `0` |
| Skipped snapshots | `0` |
| Status `warning` | `1656` |
| Average fill percentage | `90.91%` |
| Average missing fields | `1` |

### Job status summary

| Metric | Value |
| --- | ---: |
| Snapshot-only quote jobs | `1656` |
| Job status `completed_with_errors` | `1656` |
| Failed jobs | `0` |

### Meaning of the warnings

These were non-fatal field-coverage warnings from the chart-only snapshot lane.

- The chart-derived snapshot path is intentionally safer because it avoids protected Yahoo quote/statistics modules.
- The tradeoff is that one field on average remains unmapped compared with the broader quote/statistics model.
- That is why every job completed as `completed_with_errors` even though:
  - the snapshot row was saved
  - coverage was updated
  - reconciliation was written
  - no import failure occurred

## Yahoo safety outcome

The requested safety rules were respected:

- `1` worker only
- `1` request every `2` seconds
- no parallel fetches
- no protected Yahoo quoteSummary financial/statistics modules
- no financial statements
- automatic stop logic available, but not triggered

Observed Yahoo/provider safety result:

- block signals detected: `0`
- cooldown triggered: `No`
- repeated provider failure loop: `No`

## Route checks after completion

| Route | Result |
| --- | --- |
| `/admin/market-data/import-control-center` | `200` |
| `/admin/market-data/stocks` | `200` |
| `/stocks/reliance-industries` | `200` |

## Conclusion

The missing latest-snapshot gap is now filled across the active NSE stock universe.

What is now true:

- historical prices are complete across the active universe
- latest snapshot coverage is now also complete across the active universe
- the safe chart-only snapshot lane scaled cleanly
- no Yahoo/provider block signals interrupted the rollout
- no fatal snapshot import errors were recorded

What is still true:

- protected Yahoo fundamentals remain unsuitable for batch rollout
- snapshot jobs still complete with one missing field on average in chart-only mode
- financial statements remain out of batch scope
