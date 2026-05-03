# Riddra Yahoo Import Current System Analysis

Last updated: 2026-04-29  
Prepared from: live Supabase database state + completed execution reports already in this repo  
Scope: audit only, no new Yahoo import executed in this step

## Evidence sources

This analysis is based on:

- Live database counts and duplicate checks from the current Supabase project used by the app
- Completed reports already committed in `docs/`, especially:
  - `riddra-yahoo-real-reliance-import-report.md`
  - `riddra-yahoo-quote-financials-401-fix-report.md`
  - `riddra-50-stock-historical-import-report.md`
  - `riddra-50-stock-quote-import-report.md`
  - `riddra-scaling-import-report.md`
  - `riddra-financials-import-attempt-report.md`
  - `riddra-final-pre-reset-readiness-report.md`
  - `riddra-stock-universe-build-report.md`

## 1. Current import progress

### Universe and normalized-data coverage

| Metric | Current value | Notes |
|---|---:|---|
| Total active stocks in `stocks_master` | 2157 | Entire current stock universe is marked `active` |
| Stocks with historical price data | 500 | Based on distinct `stock_id` in `stock_price_history` |
| Stocks with market snapshot data | 500 | Based on distinct `stock_id` in `stock_market_snapshot` |
| Stocks with valuation data | 0 | `stock_valuation_metrics` currently empty |
| Stocks with share statistics data | 0 | `stock_share_statistics` currently empty |
| Stocks with financial highlights data | 0 | `stock_financial_highlights` currently empty |
| Stocks with financial statement data | 0 | No rows in income statement, balance sheet, or cash flow tables |

### Total row counts

| Table | Current rows |
|---|---:|
| `stock_price_history` | 122335 |
| `stock_market_snapshot` | 500 |
| `raw_yahoo_imports` | 5089 |
| `stock_import_activity_log` | 12353 |
| `stock_import_reconciliation` | 2587 |
| `stock_import_errors` | 4074 |
| `stock_import_coverage` | 2530 |
| `stock_import_jobs` | 1039 |
| `stock_import_job_items` | 4100 |

### What this means right now

- Historical daily price imports are live and materially populated for `500` stocks.
- Latest market snapshot imports are live for the same `500` stocks.
- Valuation, share-statistics, financial-highlights, and financial-statement normalization are still effectively not live in the target runtime.

## 2. Module-wise status

| Module | Current status | Live evidence |
|---|---|---|
| `historical_prices` | Working in production | `500` stocks covered, `122335` normalized rows, coverage bucket `historical_prices:current=500` |
| `quote_statistics` | Working only in degraded mode | `500` stocks have snapshot rows, but protected quote/summary fields are not normalizing live |
| `financial_statements` | Blocked / unavailable live | Normalized statement tables remain empty |
| `valuation_metrics` | Disabled effectively by Yahoo behavior | Coverage shows `missing` for `500` stocks |
| `share_statistics` | Disabled effectively by Yahoo behavior | Coverage shows `missing` for `500` stocks |
| `financial_highlights` | Disabled effectively by Yahoo behavior | Coverage shows `missing` for `500` stocks |

### Coverage table state by bucket

| Coverage bucket | Status | Count |
|---|---|---:|
| `historical_prices` | `current` | 500 |
| `latest_market_snapshot` | `partial` | 500 |
| `valuation_metrics` | `missing` | 500 |
| `share_statistics` | `missing` | 500 |
| `financial_highlights` | `missing` | 500 |
| `income_statement_annual` | `missing` | 5 |
| `income_statement_quarterly` | `missing` | 5 |
| `balance_sheet_annual` | `missing` | 5 |
| `balance_sheet_quarterly` | `missing` | 5 |
| `cash_flow_annual` | `missing` | 5 |
| `cash_flow_quarterly` | `missing` | 5 |

### Reconciliation status highlights

| Module | Dominant reconciliation result | Notes |
|---|---|---|
| `historical_prices` | `completed` / `completed_with_warnings` | Working, with some gap warnings |
| `latest_market_snapshot` | mostly `completed_with_warnings` | Snapshot fallback works, but protected quote fields are incomplete |
| `valuation_metrics` | mostly `no_data` | Protected summary modules unavailable live |
| `share_statistics` | mostly `no_data` | Protected summary modules unavailable live |
| `financial_highlights` | mostly `no_data` | Protected summary modules unavailable live |
| Financial statements buckets | `no_data` for attempted stocks | Controlled runs confirmed blocked fundamentals |

## 3. Actual Yahoo behavior observed

### Endpoints that work

| Endpoint / path type | Observed behavior | Result |
|---|---|---|
| Yahoo chart/history endpoint | Stable enough for live use | Works with `200` responses for historical price imports |

### Endpoints that return `401`

| Endpoint / path type | Observed behavior | Impact |
|---|---|---|
| Quote/latest endpoint | Repeated `401` in live runtime | Latest snapshot must degrade to chart-derived fallback |
| Quote summary / valuation-statistics modules | Repeated `401` | Valuation, share statistics, highlights not safely available |
| Financial statements modules | Repeated `401` | Income statement, balance sheet, cash flow not safely available |

### Endpoints that returned `429`

| Endpoint / path type | Observed behavior | Impact |
|---|---|---|
| Crumb / browser-style fallback probe | `429 Too Many Requests` in prior RELIANCE investigation | Browser-like protected scraping path should not be used as a primary production dependency |

### Raw import evidence summary

| Raw import bucket | Completed | Failed | Main failure code |
|---|---:|---:|---|
| `historical_prices` | 1012 | 0 | n/a |
| `quote_latest` | 5 | 2024 | `401` plus 1 network/timeout case |
| `valuation_statistics` | 5 | 2008 | `401` |
| `financial_statements` | 3 | 32 | `401` |

### Modules that should be disabled for now

Based on live behavior, the following should not be treated as production-ready data sources yet:

- `valuation_metrics`
- `share_statistics`
- `financial_highlights`
- `financial_statements`

Recommended runtime posture:

- Keep `historical_prices` enabled
- Keep `quote_statistics` only in safe degraded mode for latest snapshot fallback
- Keep the protected summary/fundamentals buckets disabled or warning-only until a reliable legal/safe source is available

## 4. Bugs and risks

### Duplicate risks

- `stock_price_history` currently looks safe for daily Yahoo rows because both the code and live data show no duplicate `(stock_id, trade_date)` daily rows.
- `stock_market_snapshot` currently has one row per stock in practice, but schema uniqueness is by `(stock_id, snapshot_at, source_name)`, so repeated inserts at different timestamps can still create row growth unless the importer intentionally stays latest-only.
- `raw_yahoo_imports` intentionally has no dedupe boundary. This preserves evidence, but it also means repeated protected-endpoint failures generate large amounts of duplicate raw traffic history.
- `stock_import_activity_log` is append-only and already shows semantic duplicates for the same step signature.
- `stock_import_reconciliation` is supposed to be upserted, but live data still shows duplicate semantic keys. That suggests either historic drift, inconsistent conflict targets, or rows created before the final constraint behavior.

### Overwrite risks

- `stock_import_coverage` uses one row per `(stock_id, bucket_key)`, so each rerun overwrites the latest coverage state. This is correct for “current state,” but it also means you lose bucket history unless you reconstruct it from activity or reconciliation logs.
- `stock_market_snapshot` current live behavior looks latest-only, but if the importer later changes to use varying `snapshot_at` values, the table can become a time series instead of a single latest record set.

### Repeated fetch waste

- Protected Yahoo endpoints are being retried and recorded repeatedly even though the failure mode is already well established.
- `raw_yahoo_imports` confirms this clearly: thousands of repeated `401` entries exist for quote/statistics paths.
- This creates:
  - request waste
  - warning noise
  - raw table growth without new business value

### Warning noise

- The current degraded-mode strategy is operationally safe, but it produces a high volume of warnings and error rows for modules that are known-unavailable in this runtime.
- This can bury real new problems under expected protected-endpoint noise.

### Blocked endpoint risk

- Protected quote/statistics and financial modules remain unreliable.
- Crumb/browser-like fallback also showed `429`, so forcing that path harder would likely make the system less safe, not more safe.

### Incomplete fundamentals risk

- Admins could assume “quote import completed” means valuation and financials are available, when live evidence says only the fallback snapshot is reliable.
- This is a reporting/UX risk as much as a data risk.

## 5. Duplicate-avoidance audit

### `stock_price_history`

Expected protection:

- Code upserts on `(stock_id, interval_type, trade_date, source_name)`
- Additional unique daily Yahoo index exists on `(stock_id, trade_date)` for `1d` + `yahoo_finance`

Live result:

- Duplicate full-key rows: `0`
- Duplicate `(stock_id, trade_date)` daily Yahoo rows: `0`

Conclusion:

- Daily historical price duplicate protection is working.

### `stock_market_snapshot`

Expected protection:

- Code upserts on `(stock_id, snapshot_at, source_name)`

Live result:

- Duplicate full-key rows: `0`
- Stocks with multiple snapshot rows: `0`

Conclusion:

- No duplicate snapshot rows are currently present.
- However, the schema does **not** enforce “one latest row per stock”; it only prevents exact timestamp duplicates.

### `raw_yahoo_imports`

Expected behavior:

- Preserve raw responses and failures before normalization

Live result:

- Duplicate request-shape keys: `1511`
- Duplicate rows represented by those repeated request shapes: `5088`

Conclusion:

- Raw storage is intentionally not deduplicated.
- This is acceptable for auditability, but expensive/noisy for repeated known failures.

### `stock_import_coverage`

Expected protection:

- Upsert on `(stock_id, bucket_key)`

Live result:

- Duplicate keys: `0`

Conclusion:

- Current overwrite behavior is consistent and safe for “latest coverage state.”

### `stock_import_activity_log`

Expected behavior:

- Append-only step log

Live result:

- Duplicate semantic step signatures detected: `73`
- Duplicate rows represented by those signatures: `272`

Conclusion:

- Activity logging is useful, but not idempotent.
- Replays and reruns can create duplicate timeline events.

### `stock_import_reconciliation`

Expected protection:

- Upsert on `(job_id, stock_id, module_name, target_table)`

Live result:

- Duplicate semantic keys detected: `11`
- Duplicate rows represented by those keys: `63`

Conclusion:

- Reconciliation is **not** fully idempotent in live data yet.
- This needs a pre-scale fix before much larger imports.

## 6. Recommended exact fixes before next large import

### Fix 1: Hard-disable protected Yahoo modules in normal batch runs

Do this now:

- Default large imports to `historical_prices` only
- Allow `quote_statistics` only in documented degraded mode
- Disable `valuation_metrics`, `share_statistics`, `financial_highlights`, and `financial_statements` in normal batch presets until a reliable source path exists

Why:

- Live evidence shows they mostly create warnings, raw duplicates, and error noise without producing normalized business value

### Fix 2: Make degraded quote mode explicit in admin UI and job reports

Do this now:

- Label quote-statistics runs as `latest snapshot fallback mode`
- Separate “snapshot completed” from “valuation completed”

Why:

- Prevents admins from assuming protected quoteSummary fields are live when they are not

### Fix 3: Reduce repeated fetch waste for known-blocked modules

Do this now:

- Add a symbol+module cooldown for repeated `401` outcomes
- Suppress repeat attempts for a fixed window once a module is confirmed blocked
- Keep one failure record and one raw payload sample per cooldown window rather than generating identical repeated evidence

Why:

- The raw/error tables already prove the problem; repeated identical retries are no longer informative

### Fix 4: Repair reconciliation idempotency

Do this now:

- Verify the live unique constraint on `stock_import_reconciliation`
- Confirm the importer’s `onConflict` columns exactly match the live constraint
- Clean up historical duplicate reconciliation rows carefully after confirmation

Why:

- Reconciliation should be a trustworthy current state record, not a partially duplicated ledger

### Fix 5: Add an idempotency key to activity logging

Do this now:

- Add an optional dedupe key such as `(job_id, job_item_id, stock_id, module_name, step_name, status)`
- Either upsert or suppress duplicates inside the same execution window

Why:

- This will reduce timeline noise while keeping the log operationally useful

### Fix 6: Decide and enforce snapshot storage semantics

Do this now:

- Choose one of:
  - latest-only snapshot table
  - time-series snapshot history table

Recommended:

- Keep `stock_market_snapshot` latest-only
- If history is ever needed, add a separate snapshot-history table instead of overloading current semantics

Why:

- Current live behavior is latest-only, but the schema does not enforce that meaning

### Fix 7: Tighten admin reporting around “real completion”

Do this now:

- Split dashboard completion into:
  - historical data completion
  - snapshot completion
  - protected fundamentals availability
- Treat “warnings due to blocked modules” separately from true job failures

Why:

- The current system is healthier than the raw warning counts suggest, but weaker than a naive “completed” label suggests

### Fix 8: Use a quieter large-scale rollout plan

Do this now:

- Continue scaling historical imports
- Do not expand blocked fundamentals at large scale yet
- Revisit a new fundamentals source before attempting 2,000-stock valuation/financial rollout

Why:

- Historical price imports are already proven
- Protected fundamentals are not

## Final assessment

### What is production-usable today

- `stocks_master` stock universe
- Yahoo historical daily price imports
- Snapshot fallback derived from working chart/history data
- Raw import evidence capture
- Coverage, activity, reconciliation, and error observability

### What is not production-usable today

- Live Yahoo valuation metrics
- Live Yahoo share statistics
- Live Yahoo financial highlights
- Live Yahoo financial statements

### Recommended next step

Before the next large import:

1. Treat the system as a **historical-prices + degraded-latest-snapshot importer**
2. Disable or cooldown the blocked protected modules in standard batch presets
3. Fix reconciliation idempotency and activity log duplication
4. Only then continue larger historical scaling

### Go / no-go

- **GO** for larger `historical_prices` expansion with current guardrails
- **GO** for latest snapshot fallback mode if the admin UI clearly labels it as degraded
- **NO-GO** for large-scale valuation/statistics/financial-statement rollout from Yahoo in the current runtime
