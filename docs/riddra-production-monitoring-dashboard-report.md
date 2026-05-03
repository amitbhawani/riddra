# Riddra Production Monitoring Dashboard Report

Date: 2026-04-30

## Goal

Enhance `/admin/market-data/import-control-center` into a stronger production monitoring dashboard by adding a:

- `System Health Monitor`

section with:

1. Import Health
2. Data Health
3. System Load
4. Alerts
5. Visual health indicators

## Files changed

- [lib/admin-import-control-center.ts](/Users/amitbhawani/Documents/Ai%20FinTech%20Platform/lib/admin-import-control-center.ts)
- [components/admin/admin-import-control-center-client.tsx](/Users/amitbhawani/Documents/Ai%20FinTech%20Platform/components/admin/admin-import-control-center-client.tsx)
- [app/admin/market-data/import-control-center/page.tsx](/Users/amitbhawani/Documents/Ai%20FinTech%20Platform/app/admin/market-data/import-control-center/page.tsx)

## What was added

### 1. System Health Monitor data model

Added a new `systemHealthMonitor` block to the control-center data response with:

- `importHealth`
  - last successful job time
  - last failed job time
  - total jobs today
  - total failures today
  - failure rate percentage

- `dataHealth`
  - stocks with full historical data
  - stocks missing recent updates
  - stocks with stale snapshots
  - stocks with repeated warnings

- `systemLoad`
  - requests in last hour
  - requests today
  - current throttle rate
  - current worker count

- `alerts`
  - Yahoo cooldown active
  - abnormal error spike
  - missing updates spike
  - DB write failures

- `indicators`
  - ingestion
  - data freshness
  - error rate

### 2. Dashboard UI section

Added a new `System Health Monitor` section to the control center UI with:

- top-level green / yellow / red badges for:
  - ingestion
  - data freshness
  - error rate

- import health summary cards
- data health summary cards
- system load summary cards
- alert cards with clear state:
  - `Clear`
  - `Green`
  - `Yellow`
  - `Red`

### 3. Fallback safety

Updated the fallback data object in the page loader so:

- the page still renders safely if durable reads fail
- the new health monitor stays type-safe
- fallback health defaults to cautious values instead of crashing

## How the monitor works

### Import health

Computed from recent durable `stock_import_jobs` rows for the `daily_chart_update` batch profile.

It now surfaces:

- the latest successful daily chart job completion time
- the latest failed daily chart job completion time
- how many recent daily chart jobs were seen
- how many of them fully failed
- the resulting failure rate

### Data health

Computed from:

- `stock_data_quality_summary`
- `stock_import_coverage`
- stock dashboard coverage counts

Current logic includes:

- historical completeness
- historical recency drift
- stale snapshot detection using latest snapshot trade date
- repeated warning pressure from durable quality rows

### System load

Uses the existing Yahoo operations summary already available in the dashboard:

- requests used this hour
- requests used today
- throttle pace
- active workers

### Alerts

Added explicit alert conditions:

- `Yahoo cooldown active`
- `abnormal error spike`
- `missing updates spike`
- `DB write failures`

These are derived from the current durable runtime state and recent error messages.

### Visual status indicators

Status colors are now shown with admin-safe badges:

- green = healthy
- yellow = warning / partial risk
- red = active problem

## Notes on thresholds

Current thresholds are intentionally conservative:

- abnormal error spike:
  - `>= 10` recent durable error rows
- missing updates spike:
  - `>= 25` stocks missing recent historical updates
  - or `>= 25` stale snapshots
- DB write failures:
  - recent durable error messages containing write-timeout or insert-style failures

These are operator-facing heuristics, not destructive automation triggers.

## Validation

- `npm run lint` -> PASS
- `npx tsc --noEmit` -> PASS
