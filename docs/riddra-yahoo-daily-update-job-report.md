# Riddra Yahoo Daily Update Job Report

Last updated: 2026-04-30

## Goal

Add a safe manual daily updater for Yahoo chart-based stock data only.

This job intentionally avoids protected Yahoo modules and only updates:

1. Recent historical daily prices
2. Latest snapshot using chart fallback only

It does **not** run:

- `quoteSummary`
- valuation metrics
- share statistics
- financial highlights
- financial statements
- holders
- options
- news

## What Was Implemented

### 1. Dedicated daily chart-update batch profile

Added to:

- [lib/yahoo-finance-batch-import.ts](/Users/amitbhawani/Documents/Ai%20FinTech%20Platform/lib/yahoo-finance-batch-import.ts)

New behavior:

- batch profile: `daily_chart_update`
- modules fixed to:
  - `historical_prices`
  - `quote_statistics`
- `historical_prices` runs with:
  - `period = 1mo`
  - `interval = 1d`
  - `duplicateMode = skip_existing_dates`
- `quote_statistics` runs with:
  - `snapshotOnly = true`
  - chart fallback only
- `financial_statements` remains disabled for batch

### 2. Delta-aware recent history updates

The daily job reuses the existing historical fetch planner and importer:

- no history -> `full_initial`
- gaps -> `backfill_missing`
- current history -> `update_recent`
- `force=true` -> `force_rebuild`

This means the daily job does **not** re-fetch full history by default.
It also does **not** rely on the broad coverage-level skip used by missing-only recovery jobs, because daily updates still need to check for fresh recent candles even when historical coverage is already marked current.

### 3. Same-day snapshot skip

The daily job reuses the existing snapshot skip logic:

- if today’s snapshot already exists, it skips
- unless `force=true`
- skip reason is written into activity/job metadata

### 4. 1 worker and 1 request every 3 seconds

Daily job safety profile:

- `maxConcurrentWorkers = 1`
- `minimumRequestIntervalMs = 3000`
- `throttleRequestsPerSecond = 1`

The service-level hourly and daily caps still apply.

### 5. Cooldown and stop behavior

The daily job stays inside the existing Yahoo guardrail system:

- respects hourly and daily request caps
- records repeated provider failures
- auto-pauses on cooldown signals
- stops progressing when cooldown is triggered

### 6. Durable observability

The daily job reuses existing durable writes for:

- `stock_import_activity_log`
- `stock_import_reconciliation`
- `stock_import_coverage`
- `stock_import_jobs`
- `stock_import_job_items`

So every daily run still records:

- fetch steps
- raw-save state
- normalization state
- coverage updates
- reconciliation
- skips and reused data

## Manual Entry Points

### CLI command

Added:

- `npm run yahoo:daily-update`
- `npm run yahoo:daily-update:reliance`

Script:

- [scripts/import-yahoo-daily-update.mjs](/Users/amitbhawani/Documents/Ai%20FinTech%20Platform/scripts/import-yahoo-daily-update.mjs)

Examples:

```bash
npm run yahoo:daily-update
```

```bash
npm run yahoo:daily-update -- --stocks=RELIANCE.NS,TCS.NS --max-items=20
```

```bash
npm run yahoo:daily-update -- --force=true --stocks=RELIANCE.NS
```

### Admin action

Added bounded manual action in:

- [app/api/admin/market-data/import-control-center/actions/route.ts](/Users/amitbhawani/Documents/Ai%20FinTech%20Platform/app/api/admin/market-data/import-control-center/actions/route.ts)
- [components/admin/admin-import-control-center-client.tsx](/Users/amitbhawani/Documents/Ai%20FinTech%20Platform/components/admin/admin-import-control-center-client.tsx)

Control Center button:

- `Run daily chart update`

Important operator note:

- the admin button processes the next safe bounded slice from the control center
- the CLI command is the better path for a full daily universe run
- this avoids long-running browser requests

## Safety Summary

The daily updater is intentionally strict:

- recent history only
- chart-only snapshot refresh
- same-day snapshot skip by default
- no protected Yahoo fundamentals
- no financial statements
- one worker only
- 3-second pacing between processed items
- respects existing request caps and cooldown logic

## Validation

Passed:

- `npm run lint`
- `npx tsc --noEmit`
- `node --check scripts/import-yahoo-daily-update.mjs`

## Scheduling

Automatic scheduling was **not** enabled in this change.

This is manual-only for now:

- manual CLI command
- manual admin action
