# Riddra Yahoo Daily Update Production Runbook

Last updated: April 30, 2026

## Purpose

This runbook is for the **daily Yahoo chart-only update job** for Riddra stocks.

It is intentionally limited to:

- recent historical price refresh
- latest snapshot refresh using chart fallback only

It is **not** the runbook for fundamentals, valuation, holders, or financial statements.

## 1. When To Run The Job

Run the daily chart update:

- once per trading day
- after the market session has stabilized for the day
- preferably after Yahoo chart data for the day is consistently available

Recommended operator timing:

- once in the evening India time, after regular market close and after enough delay for upstream data to settle

Do not run it repeatedly during the same day unless:

- you are intentionally using `force=true`
- you are fixing a known failed/missing slice

## 2. Exact Command

Full manual daily run:

```bash
npm run yahoo:daily-update
```

Selected-symbol run:

```bash
npm run yahoo:daily-update -- --stocks=RELIANCE.NS,TCS.NS,INFY.NS --max-items=50
```

Force refresh for a specific stock only:

```bash
npm run yahoo:daily-update -- --force=true --stocks=RELIANCE.NS --max-items=2
```

Notes:

- the CLI path is the correct production operator entry point
- the admin action is useful for bounded slices, not for the full 2157-stock production run

## 3. Safe Env Settings

Use these guardrails for production-safe daily chart updates:

- `YAHOO_FINANCE_REQUESTS_PER_SECOND=1`
- `YAHOO_FINANCE_MAX_REQUESTS_PER_HOUR=2000`
- `YAHOO_FINANCE_MAX_REQUESTS_PER_DAY=15000`
- `YAHOO_FINANCE_MAX_CONCURRENT_WORKERS=1`
- `YAHOO_FINANCE_FAILURE_COOLDOWN_MINUTES=45`
- `YAHOO_FINANCE_MAX_RETRIES=3`

Daily chart-update job profile already enforces:

- `minimumRequestIntervalMs = 3000`
- `maxConcurrentWorkers = 1`
- `historicalPeriod = 1mo`
- `snapshotOnly = true`
- chart-only fallback mode

Operator rule:

- do not temporarily increase workers or pacing for production daily runs

## 4. Expected Duration For 2157 Stocks

### Theoretical lower bound

At 1 processed item every 3 seconds:

- each stock has 2 module items:
  - `historical_prices`
  - `quote_statistics` in snapshot-only chart mode
- total items for `2157` stocks = `4314`
- `4314 * 3 seconds = 12,942 seconds`
- minimum pacing-only duration = about `3h 36m`

### Practical expected window

Real runs include:

- Supabase writes
- reconciliation
- activity log writes
- coverage updates
- occasional warnings or retries

Expected practical duration:

- about `4` to `6` hours for the full `2157`-stock universe

Use the 25-stock live pilot as a sanity reference:

- `25` stocks completed in about `12m 25s`

## 5. How To Pause / Stop

Do not kill the database or manually edit rows unless necessary.

Preferred control path:

- use the admin import control center actions if available for bounded operational control
- if a full CLI run is executing in a terminal, stop the terminal process cleanly with `Ctrl+C`

System guardrails will also auto-pause if needed when:

- repeated Yahoo/provider failures are detected
- cooldown logic is triggered

Batch-state fields to inspect:

- `stock_import_jobs.metadata.controlState`
- `stock_import_jobs.metadata.cooldownUntil`
- `stock_import_jobs.metadata.cooldownReason`

If cooldown is active:

- do not immediately rerun the full daily job
- wait for cooldown expiry or retry only the failed slice later

## 6. How To Verify Completion

Primary durable verification:

- `stock_import_jobs` latest `yahoo_batch_import` row
- `stock_import_job_items` for item outcomes
- `stock_import_activity_log`
- `stock_import_reconciliation`
- `stock_import_coverage`

Completion checks:

1. Parent batch row status should be:
   - `completed`
   - or `completed_with_errors`
2. `pendingItems` should be `0`
3. `estimatedRemainingSeconds` should be `0`
4. `controlState` should still be healthy and not cooling down
5. `/admin/market-data/import-control-center` should load with `200`
6. sample stock pages should still load with `200`

Operational route checks:

- `GET /admin/market-data/import-control-center`
- `GET /admin/market-data/stocks`
- `GET /stocks/reliance-industries`

## 7. How To Inspect Errors

Inspect these tables first:

- `stock_import_jobs`
- `stock_import_errors`
- `stock_import_activity_log`
- `stock_import_reconciliation`

What to look for:

- failed child job kinds:
  - `historical_ohlcv_import`
  - `quote_statistics_import`
- repeated timeout errors
- cooldown reason
- symbols that failed
- whether the error is:
  - Yahoo/provider blocking
  - Supabase write timeout
  - data quality warning only

Known real example from the live 25-stock pilot:

- historical failures were caused by:
  - `Could not insert stock_price_history rows. Error: Supabase admin request timed out after 8000ms.`

That is a write-path issue, not a Yahoo block signal.

## 8. How To Retry Only Missing / Failed Rows

Use a **targeted** rerun, not a full-universe rerun.

### Retry only a small failed stock list

Example:

```bash
npm run yahoo:daily-update -- --stocks=3MINDIA.NS,ABBOTINDIA.NS --max-items=10
```

### Retry a single stock with force only if really needed

```bash
npm run yahoo:daily-update -- --force=true --stocks=RELIANCE.NS --max-items=2
```

Rules:

- prefer missing/failed symbol slices
- do not rerun all `2157` stocks just because 2 or 5 failed
- do not use `force=true` broadly
- daily updates should rely on the delta-aware importer and same-day snapshot skip behavior

## 9. What Not To Run

Do **not** include or enable these for the daily production job:

- `quoteSummary`
- valuation metrics
- share statistics
- financial highlights
- financial statements
- holders
- protected quote/statistics modules

Reason:

- Yahoo protected fundamentals remain unreliable in this runtime
- daily production should stay chart-only
- snapshot refresh should remain chart fallback only

## 10. Rollback And Cleanup Rules

This job should not require destructive rollback in normal operation.

Safe rollback rules:

1. Do not delete `raw_yahoo_imports`
2. Preserve activity, reconciliation, and error evidence
3. If a small stock subset was imported incorrectly, clean only the affected normalized rows
4. Prefer row-level cleanup by:
   - affected `stock_id`
   - affected `trade_date`
   - affected `job_id`
5. Never mass-delete the whole stock dataset for a daily-update issue

Cleanup scope if a bad run must be repaired:

- `stock_price_history` rows from the affected stock/date scope only
- `stock_market_snapshot` rows for the affected stock/date scope only
- leave:
  - `raw_yahoo_imports`
  - `stock_import_activity_log`
  - `stock_import_reconciliation`
  - `stock_import_errors`
  intact for auditability

## Operational Recommendation

The production daily job should remain:

- manual
- chart-only
- one worker
- 3-second pacing
- delta-aware

Do not enable cron yet.

Before turning this into a scheduled job, make sure:

1. a full daily universe run completes reliably
2. Supabase write timeouts are reduced or handled more robustly
3. operators are comfortable retrying only the failed symbol slice
