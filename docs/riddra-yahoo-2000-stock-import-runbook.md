# Riddra Yahoo Finance 2,000-Stock Import Runbook

Last updated: 2026-04-28

Status: Preparation only. Do not start the 2,000-stock import until every pre-check in this runbook is green.

Purpose: This runbook explains how to prepare, start, control, verify, and if necessary partially roll back a large Yahoo Finance stock import without losing the raw Yahoo backup layer.

## 1. Required Pre-Checks

The batch must not start unless all of these checks pass.

### A. Database and schema readiness

- Confirm the Yahoo schema verification is green in `docs/riddra-yahoo-db-verification-report.md`.
- Confirm the app can query these tables through the real target database path:
  - `stocks_master`
  - `raw_yahoo_imports`
  - `stock_price_history`
  - `stock_market_snapshot`
  - `stock_valuation_metrics`
  - `stock_financial_highlights`
  - `stock_income_statement`
  - `stock_balance_sheet`
  - `stock_cash_flow`
  - `stock_import_coverage`
  - `stock_import_errors`
  - `stock_import_jobs`
  - `stock_import_job_items`
- Confirm migrations `0044`, `0045`, `0046`, and `0047` are applied and visible to the app, not just present in the repo.

### B. Universe readiness

- Confirm the stock universe actually contains the intended active NSE `.NS` symbols.
- Confirm each stock has:
  - `stock_id`
  - canonical slug
  - Yahoo symbol
  - stable mapping into `stocks_master`
- Do not assume 2,000 are ready. Count them first.

### C. Application readiness

- Confirm `/admin/market-data/stocks` loads and shows Yahoo batch telemetry.
- Confirm `/admin/market-data/yahoo-import-guide` loads.
- Confirm sample frontend stock pages render without crashing for at least:
  - Reliance Industries
  - TCS
  - Infosys
  - HDFC Bank
  - ICICI Bank
- Confirm admin activity log is fresh and durable.

### D. Operational safety readiness

- Confirm the default worker count is `1`.
- Confirm the default throttle is `1 request per second`.
- Confirm hourly and daily request caps are active.
- Confirm repeated Yahoo/provider failures move the job into `cooling_down`.
- Confirm retry logic is limited and visible.
- Confirm raw Yahoo payloads are being saved before normalization.

### E. Pilot proof before 2,000

- Complete and sign off these before the 2,000-stock run:
  - 5-stock pilot
  - 50-stock pilot
  - at least one successful 250-stock staged run
- If any pilot was blocked by schema, UI, or provider problems, the 2,000-stock run is `NO-GO`.

## 2. Environment Variables

Use these values unless there is a deliberate approved reason to change them.

| Variable | Default | Purpose |
|---|---:|---|
| `YAHOO_FINANCE_REQUESTS_PER_SECOND` | `1` | Global Yahoo request throttle |
| `YAHOO_FINANCE_MAX_REQUESTS_PER_HOUR` | `2000` | Hourly safety cap |
| `YAHOO_FINANCE_MAX_REQUESTS_PER_DAY` | `15000` | Daily safety cap |
| `YAHOO_FINANCE_MAX_CONCURRENT_WORKERS` | `1` | Maximum active Yahoo workers |
| `YAHOO_FINANCE_FAILURE_COOLDOWN_MINUTES` | `45` | Cooldown after repeated failures |
| `YAHOO_FINANCE_MAX_RETRIES` | `3` | Maximum retries per request |
| `YAHOO_FINANCE_TIMEOUT_MS` | `12000` | Request timeout |
| `YAHOO_FINANCE_RETRY_BASE_MS` | `1000` | Retry backoff base |

Supporting environment requirements:

- Supabase public and admin credentials must be valid in the runtime actually running the importer.
- The runtime must point to the same target database used by the admin dashboard and stock pages.

## 3. Safe Throttling Settings

Use these settings for the first production rollout.

- Requests per second: `1`
- Concurrent workers: `1`
- Import only missing data: `true`
- Duplicate mode: `skip_existing_dates`
- Default modules for routine reruns:
  - `quote_statistics`
  - `financial_statements`
- Historical imports:
  - include `historical_prices` only when a stock has missing historical coverage or is being imported for the first time

Do not:

- run multiple Yahoo workers in parallel
- raise request pace before the 250-stock and 500-stock stages prove stable
- repeatedly rerun full historical imports for the same stocks

## 4. Batch Size Plan

Use staged rollout. Do not jump straight from pilot work to 2,000.

| Stage | Batch size | Goal | Modules | Stop if |
|---|---:|---|---|---|
| Stage 1 | `50` | Prove the production-safe batch flow on a small real cohort | `historical_prices`, `quote_statistics`, `financial_statements` | schema issues, frontend crashes, repeated provider blocks, coverage too low |
| Stage 2 | `250` | Prove stability over a longer run window | same as above, but historical only when missing | failure rate rises, cooldown repeats, dashboard drift appears |
| Stage 3 | `500` | Prove medium-scale runtime, monitoring, and recovery | same policy | request caps approach unexpectedly fast, errors cluster by module |
| Stage 4 | remaining | Finish the universe only after prior stages are signed off | missing-only by default | any earlier blocker reappears |

Recommended promotion rule:

- Move to the next stage only after the current stage shows acceptable completion, dashboard accuracy, and frontend stability.

## 5. How to Start a Batch

There are two safe start patterns.

### A. CLI

Create a job only:

```bash
npm run yahoo:batch -- create --stocks RELIANCE.NS,INFY.NS --modules historical_prices,quote_statistics,financial_statements
```

Create and run immediately:

```bash
npm run yahoo:batch -- --stocks RELIANCE.NS,INFY.NS --modules historical_prices,quote_statistics,financial_statements
```

Run an existing job:

```bash
npm run yahoo:batch -- run --job <job-id> --max-items 10
```

### B. Admin/API flow

Use `POST /api/admin/market-data/import/yahoo-batch` with:

- `stocks`
- `modules`
- `importOnlyMissingData`
- `duplicateMode`
- optional `runUntilComplete`
- optional `maxItemsPerRun`

Safe defaults:

- `importOnlyMissingData: true`
- `modules: ["quote_statistics", "financial_statements"]`

For first-time stocks, explicitly add `historical_prices`.

## 6. How to Pause, Resume, or Stop

### CLI

Pause:

```bash
npm run yahoo:batch -- pause --job <job-id>
```

Resume:

```bash
npm run yahoo:batch -- resume --job <job-id>
```

Stop:

```bash
npm run yahoo:batch -- stop --job <job-id>
```

### API

Use `POST /api/admin/market-data/import/yahoo-batch/<job-id>` with:

- `{ "action": "pause" }`
- `{ "action": "resume" }`
- `{ "action": "stop" }`

Operational rules:

- Pause when provider errors rise or dashboard percentages look wrong.
- Resume only after cooldown or root-cause review.
- Stop if the run is clearly unhealthy and should not continue.

## 7. How to Retry Failed Imports

Retry only after identifying the real cause.

### CLI

```bash
npm run yahoo:batch -- retry --job <job-id>
```

### API

Use `POST /api/admin/market-data/import/yahoo-batch/<job-id>` with:

```json
{ "action": "retry" }
```

Retry rules:

- Do not retry while the job is still `cooling_down`.
- Retry failed modules only after checking:
  - `stock_import_errors`
  - `raw_yahoo_imports`
  - dashboard last Yahoo error
- If the failure is symbol-specific, rerun only those stocks.

## 8. How to Import Only Missing Modules

Use missing-only mode for normal upkeep and for post-pilot scaling.

Recommended examples:

- Quote/statistics only:

```bash
npm run yahoo:batch -- create --stocks RELIANCE.NS,INFY.NS --modules quote_statistics --import-only-missing-data true
```

- Financial statements only:

```bash
npm run yahoo:batch -- create --stocks RELIANCE.NS,INFY.NS --modules financial_statements --import-only-missing-data true
```

- Historical only for incomplete stocks:

```bash
npm run yahoo:batch -- create --stocks RELIANCE.NS,INFY.NS --modules historical_prices --import-only-missing-data true
```

Routine rule:

- Never run full historical reimport across the whole universe unless there is a specific coverage repair or migration reason.

## 9. How to Verify Completion

Verify from four angles.

### A. Job report

Get the final job report:

```bash
npm run yahoo:batch -- report --job <job-id>
```

Check:

- total stocks
- completed stocks
- failed stocks
- skipped stocks
- estimated remaining time
- module-wise completion
- warnings

### B. Database checks

Confirm rows exist in:

- `raw_yahoo_imports`
- `stock_price_history`
- `stock_market_snapshot`
- `stock_valuation_metrics`
- `stock_financial_highlights`
- `stock_income_statement`
- `stock_balance_sheet`
- `stock_cash_flow`
- `stock_import_coverage`

### C. Admin checks

Confirm the admin stock import dashboard shows:

- correct completion percentages
- request pace
- requests used this hour
- requests used today
- cooldown state
- last Yahoo error

### D. Frontend checks

Open sample stock pages and confirm they render without crashing after the run.

Minimum sample:

- `/stocks/reliance-industries`
- `/stocks/tcs`
- `/stocks/infosys`
- `/stocks/hdfc-bank`
- `/stocks/icici-bank`

## 10. How to Detect Yahoo Blocking

Treat these as warning signs.

- The job status becomes `cooling_down`.
- `stock_import_errors` shows repeated provider or upstream fetch failures.
- `raw_yahoo_imports` shows a cluster of failed responses.
- Multiple symbols suddenly return empty or partial payloads.
- Fill percentage drops sharply across many stocks in the same module.
- Request counts rise but completion stalls.

Response plan:

1. Pause or let the cooldown stand.
2. Check the last Yahoo error and recent raw responses.
3. Wait for cooldown to expire.
4. Retry only the failed stocks or failed module.
5. Do not increase concurrency or request pace as a reaction.

## 11. How to Roll Back Only Bad Normalized Rows While Preserving Raw Data

Raw Yahoo payloads are the safety archive. Preserve them.

### Rollback principles

- Do not delete from `raw_yahoo_imports`.
- Roll back only normalized tables affected by the bad run.
- Scope the rollback by:
  - `job_id`
  - `stock_id`
  - module
  - trade date or fiscal date
  - import window

### Normalized tables and safe rollback keys

| Module | Table | Safe rollback key |
|---|---|---|
| `historical_prices` | `stock_price_history` | `stock_id + trade_date + source` |
| `quote_statistics` | `stock_market_snapshot` | `stock_id + source` |
| `quote_statistics` | `stock_valuation_metrics` | `stock_id + source` |
| `quote_statistics` | `stock_share_statistics` | `stock_id + source` |
| `quote_statistics` | `stock_financial_highlights` | `stock_id + source` |
| `financial_statements` | `stock_income_statement` | `stock_id + fiscal_date + period_type + source` |
| `financial_statements` | `stock_balance_sheet` | `stock_id + fiscal_date + period_type + source` |
| `financial_statements` | `stock_cash_flow` | `stock_id + fiscal_date + period_type + source` |

### Rollback workflow

1. Pause or stop the job.
2. Identify the affected stocks and module from:
   - `stock_import_jobs`
   - `stock_import_job_items`
   - `stock_import_errors`
   - `raw_yahoo_imports`
3. Export row counts from the affected normalized tables before deletion.
4. Delete only the bad normalized rows for the affected stock/module/date scope.
5. Leave `raw_yahoo_imports` untouched.
6. Reset the failed scope through targeted retry or a new selected-stock batch.
7. Re-verify coverage and frontend rendering after repair.

If rollback scope is unclear, do not guess. Stop and inspect the raw payload and job-item history first.

## 12. Final Go / No-Go Checklist

Every item below must be `YES` before the 2,000-stock run begins.

- Yahoo tables are queryable from the app runtime.
- The verification report says live Yahoo imports can safely begin.
- The 5-stock pilot is complete and reviewed.
- The 50-stock pilot is complete and reviewed.
- The 250-stock staged run is complete and reviewed.
- Active NSE stock universe count is verified and mapped.
- The admin stock dashboard is accurate.
- Sample frontend stock pages render correctly.
- Request caps, retries, cooldowns, and raw backup are working.
- Rollback ownership is assigned and understood.

Current readiness note on 2026-04-28:

- If the app still cannot query Yahoo tables or sample stock pages still crash, the answer is `NO-GO`.

