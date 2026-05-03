# Riddra Alert System Report

Date: 2026-04-30

## Goal

Add a lightweight internal alerting system for critical Yahoo import failures without sending external notifications yet.

Alert triggers requested:

1. `>5%` job failure rate in last `100` jobs
2. Yahoo cooldown triggered
3. snapshot update skipped for `>10%` stocks
4. DB write failures spike
5. no successful job in last `6` hours

## Files changed

- [db/migrations/0054_stock_import_alerts.sql](/Users/amitbhawani/Documents/Ai%20FinTech%20Platform/db/migrations/0054_stock_import_alerts.sql)
- [lib/admin-import-control-center.ts](/Users/amitbhawani/Documents/Ai%20FinTech%20Platform/lib/admin-import-control-center.ts)
- [components/admin/admin-import-control-center-client.tsx](/Users/amitbhawani/Documents/Ai%20FinTech%20Platform/components/admin/admin-import-control-center-client.tsx)
- [app/admin/market-data/import-control-center/page.tsx](/Users/amitbhawani/Documents/Ai%20FinTech%20Platform/app/admin/market-data/import-control-center/page.tsx)

## New durable table

Added migration:

- [db/migrations/0054_stock_import_alerts.sql](/Users/amitbhawani/Documents/Ai%20FinTech%20Platform/db/migrations/0054_stock_import_alerts.sql)

Table:

- `stock_import_alerts`

Fields:

- `id`
- `alert_type`
- `severity`
- `message`
- `affected_scope`
- `created_at`
- `resolved_at`
- `metadata`

Supported alert types:

- `job_failure_rate_high`
- `yahoo_cooldown_triggered`
- `snapshot_skip_rate_high`
- `db_write_failures_spike`
- `no_successful_job_in_6h`

## Runtime behavior

The control center now computes alert conditions from existing durable state and then:

- creates a durable alert if a condition is active and no unresolved alert exists
- updates the unresolved alert if the condition is still active
- resolves the alert by setting `resolved_at` when the condition clears

This keeps the system lightweight and internal-only.

No external notification channel was added.

## Alert logic

### 1. Job failure rate high

Triggers when:

- failure rate is greater than `5%` across the recent `100` daily chart update jobs loaded into the control-center monitor window

Severity:

- `warning` above `5%`
- `critical` above `10%`

### 2. Yahoo cooldown triggered

Triggers when:

- the Yahoo batch system reports an active cooldown

Severity:

- `critical`

### 3. Snapshot skip rate high

Triggers when:

- same-day snapshot skips exceed `10%` of snapshot-covered stocks

Severity:

- `warning` above `10%`
- `critical` above `25%`

### 4. DB write failures spike

Triggers when recent `stock_import_errors` include messages suggesting:

- write timeout
- insert failure
- stock history write-path failure

Severity:

- `critical`

### 5. No successful job in last 6 hours

Triggers when:

- no successful daily chart update job has completed in the last `6` hours

Severity:

- `critical`

## Control Center changes

The control center now shows:

- live alert cards inside `System Health Monitor`
- durable unresolved alerts from `stock_import_alerts`
- severity badges for active durable alerts
- safe fallback behavior if the alert table is not available yet

## Safety notes

- this system does **not** send email, Slack, SMS, or webhook alerts
- it is internal-only for now
- if the new migration is not yet applied, the control center will warn and continue safely rather than crashing

## Validation

- `npm run lint` -> PASS
- `npx tsc --noEmit` -> PASS
