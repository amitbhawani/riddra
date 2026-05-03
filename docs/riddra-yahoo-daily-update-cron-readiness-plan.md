# Riddra Yahoo Daily Update Cron Readiness Plan

Date: 2026-04-30

## Purpose

This document defines when the Yahoo daily chart update is safe to move from manual operation to cron-style scheduled execution.

It is intentionally limited to the **daily chart-based update lane**:

- recent historical daily price updates
- latest snapshot refresh using chart fallback only

It does **not** cover:

- `quoteSummary`
- valuation metrics
- share statistics
- financial highlights
- financial statements
- holders
- protected Yahoo fundamentals

Cron is **not** being enabled in this step.

## 1. Recommended run time

Recommended production run window:

- once per trading day
- after Indian market close
- after Yahoo chart data for the day has had time to settle

Recommended operator target:

- between `8:00 PM IST` and `11:00 PM IST`

Why:

- it avoids racing with intraday partial candles
- it gives Yahoo chart/history enough time to stabilize
- it leaves overnight time for retries if a small subset fails

Do not schedule the full daily run:

- during live market hours
- multiple times per day by default
- immediately after midnight without verifying the prior trading session is reflected upstream

## 2. Safe command

Recommended cron command:

```bash
npm run yahoo:daily-update
```

For a bounded recovery slice only:

```bash
npm run yahoo:daily-update -- --stocks=RELIANCE.NS,TCS.NS,INFY.NS --max-items=20
```

For resuming an already-created queued job:

```bash
npm run yahoo:daily-update -- --job-id=<existing_job_id> --max-items=50
```

Do not use `force=true` in cron.

## 3. Environment variables

Recommended safe env for cron execution:

- `YAHOO_FINANCE_REQUESTS_PER_SECOND=1`
- `YAHOO_FINANCE_MAX_REQUESTS_PER_HOUR=2000`
- `YAHOO_FINANCE_MAX_REQUESTS_PER_DAY=15000`
- `YAHOO_FINANCE_MAX_CONCURRENT_WORKERS=1`
- `YAHOO_FINANCE_FAILURE_COOLDOWN_MINUTES=45`
- `YAHOO_FINANCE_MAX_RETRIES=3`
- `YAHOO_HISTORY_WRITE_BATCH_SIZE=250`

Daily job profile assumptions already in code:

- `minimumRequestIntervalMs = 3000`
- `historicalPeriod = 1mo`
- `snapshotOnly = true`
- chart-only fallback mode
- same-day snapshot skip unless forced

Cron policy:

- keep `1` worker only
- keep one request paced every `3` seconds
- do not loosen these values for convenience

## 4. Expected duration

Universe size:

- active NSE stocks in `stocks_master`: `2157`

Per-stock module items in the daily lane:

- `historical_prices`
- `quote_statistics` in chart-fallback snapshot-only mode

Total parent items:

- `2157 * 2 = 4314`

Pacing-only lower bound at one processed item every three seconds:

- `4314 * 3 seconds = 12,942 seconds`
- about `3h 36m`

Practical expected duration:

- about `4` to `6` hours

Why the real duration is higher:

- Supabase writes
- coverage updates
- activity log writes
- reconciliation writes
- occasional warning handling
- some history batches writing much larger row sets than others

Pilot references:

- 25-stock live chart pilot completed in about `12m 25s`
- recent 5-stock live CLI pilot completed in about `3m 20s` after resume, with all history/snapshot items processed

## 5. Monitoring checklist

Before cron is ever enabled, monitoring should be verified against these surfaces:

### Job health

- latest `stock_import_jobs` parent row exists
- `job_kind = yahoo_batch_import`
- `batchProfile = daily_chart_update`
- `controlState = active`

### Progress

- `processedItems` rising over time
- `pendingItems` trending to `0`
- `estimatedRemainingSeconds` decreasing
- `activeWorkerId` present while running and cleared at finish

### Request safety

- `requestsUsedCurrentHour` under cap
- `requestsUsedToday` under cap
- `cooldownUntil = null`
- `lastYahooError = null` or understood

### Skip/reuse behavior

- `savedRequestsAvoided` increases when same-day snapshots already exist
- `existingDataReused` increases where current history already exists
- `skipBreakdown.skippedExistingSnapshot` is non-zero on repeat same-day runs

### Output health

- `stock_import_errors` not spiking unexpectedly
- `stock_import_activity_log` receiving step rows
- `stock_import_reconciliation` receiving completed rows
- `/admin/market-data/import-control-center` returns `200`
- `/stocks/reliance-industries` returns `200`

## 6. Failure handling

If the cron-run job fails partially:

1. Inspect the parent row in `stock_import_jobs`
2. Check `stock_import_job_items` for:
   - `failed`
   - `warning`
   - `skipped`
3. Check `stock_import_errors`
4. Check `stock_import_activity_log`
5. Check `stock_import_reconciliation`

Treat failures in these categories differently:

### A. Yahoo/provider blocking

Examples:

- repeated `401`
- repeated `429`
- cooldown activated

Action:

- do not rerun immediately
- let cooldown expire
- retry only a small subset later

### B. Supabase write-path issues

Examples:

- insert/upsert timeout
- large historical batch write timeout

Action:

- verify batching settings
- retry only the failed symbols
- do not rerun the whole universe

### C. Warning-only outcomes

Examples:

- weekday gap warnings from Yahoo historical series
- chart-fallback snapshot warnings with protected fields missing

Action:

- do not treat these as fatal
- track trend, not single occurrence

## 7. Retry policy

Cron retry policy should stay conservative.

### Automatic retry policy

- allow the existing per-batch retry logic only
- keep `YAHOO_FINANCE_MAX_RETRIES=3`
- retries should apply to the failed write/fetch batch only, not the whole stock or full universe

### Operator retry policy

- retry only missing/failed stock slices
- prefer `--stocks=...` targeted reruns
- use `--job-id=...` to resume queued jobs safely
- avoid `force=true` except for single-stock repair work

### Do not do

- do not immediately rerun all `2157` stocks because a small subset failed
- do not schedule a second full cron pass as a blanket retry
- do not retry blocked fundamental modules

## 8. Pause / disable method

If cron later gets enabled, the shutdown path should be simple.

### Immediate pause

- disable the cron entry at the scheduler level
- do not change importer code first

### In-flight stop

- use existing job control where available
- or stop the terminal/runner process if the job is manually launched

### Longer-term disable

- remove or pause the scheduler definition
- keep the CLI/manual path available for operator recovery

Recommended control flags to inspect:

- `stock_import_jobs.metadata.controlState`
- `stock_import_jobs.metadata.cooldownUntil`
- `stock_import_jobs.metadata.activeWorkerId`

## 9. No-go conditions

Do **not** enable cron yet if any of these are true:

1. `stock_import_jobs` daily pilot runs still show repeated write timeout failures
2. cooldown is being triggered during small pilot runs
3. `requestsUsedCurrentHour` is regularly close to cap in normal operation
4. `/admin/market-data/import-control-center` is unstable
5. public stock routes are unstable
6. duplicate-key protection is not verified after recent importer changes
7. skip/reuse behavior is not visible in durable logs
8. activity or reconciliation tables are failing to populate
9. write batching is still showing unresolved large-history timeout patterns
10. operators do not yet have a clear retry-and-resume playbook

## 10. Why quoteSummary / fundamentals must stay disabled

These modules must remain out of cron scope:

- `quoteSummary`
- valuation metrics
- share statistics
- financial highlights
- financial statements
- holders

Reason:

- Yahoo protected fundamentals are still unreliable in this runtime
- earlier investigations showed protected endpoints can return `401` and `429`
- chart/history works, but protected fundamentals do not have the same operational stability
- daily cron must be predictable and low-risk

Current safe production posture:

- history updates from chart/history
- latest snapshot from chart fallback
- protected fundamentals disabled by design

This is not a temporary wording issue. It is an operational guardrail.

## Cron readiness verdict

Current status:

- **manual daily chart update path is ready**
- **cron should remain manual-planned, not enabled yet**

Recommended next step before enabling cron:

1. complete a few consecutive clean daily manual runs
2. confirm no recurring Supabase write-timeout pattern on larger slices
3. confirm operator monitoring is stable from the import control center
4. only then promote the same safe command into a scheduler
