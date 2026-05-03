# Riddra Cron Enable Report

Date: 2026-04-30

## Requested goal

Enable production cron for the Yahoo daily chart update with:

- once per day after market close India time
- optional second run for missed stocks
- command: `npm run yahoo:daily-update`

With strict rules:

- chart/history only
- snapshot fallback only
- no `quoteSummary`
- no financial statements
- `1` worker
- `1` request every `3` seconds
- stop on cooldown
- **do not enable cron if any alert is active**

## Final result

Cron was **not enabled**.

This is intentional and correct.

## Why cron was not enabled

The current system has an active no-go condition from recent durable Yahoo import failures.

Live verification from the target database showed:

- recent daily chart update jobs reviewed: `7`
- failed daily chart update parent jobs: `0`
- failure rate: `0%`
- last successful daily chart update job: `2026-04-30T09:09:40.045+00:00`
- recent `stock_import_errors` rows in the last 24 hours: `20`
- recent DB write failure rows in the last 24 hours: `4`

Sample active DB write failure signal:

- `Could not insert stock_price_history rows. Error: Supabase admin request timed out after 8000ms.`

Because the alerting rules explicitly include:

- `DB write failures spike`

the system is currently in a **do not enable cron** state.

## Existing scheduler state

The repo already has a Vercel cron file:

- [vercel.json](/Users/amitbhawani/Documents/Ai%20FinTech%20Platform/vercel.json)

But it currently schedules:

- `/api/market-data/provider-sync`
- `/api/jobs/market-news/run`
- `/api/admin/lifecycle/ipo-cutover`

It does **not** currently schedule the Yahoo daily chart update command or route.

No new Yahoo cron entry was added in this step because the active-alert rule blocked enablement.

## Control Center updates

I still improved the control center so the cron posture is explicit.

Updated:

- [lib/admin-import-control-center.ts](/Users/amitbhawani/Documents/Ai%20FinTech%20Platform/lib/admin-import-control-center.ts)
- [components/admin/admin-import-control-center-client.tsx](/Users/amitbhawani/Documents/Ai%20FinTech%20Platform/components/admin/admin-import-control-center-client.tsx)
- [app/admin/market-data/import-control-center/page.tsx](/Users/amitbhawani/Documents/Ai%20FinTech%20Platform/app/admin/market-data/import-control-center/page.tsx)

The control center now shows:

- cron status
- last cron run time
- last cron result

Current expected live values:

- cron status: `Disabled`
- last cron run time: none
- last cron result: `disabled`

## Safety status preserved

The requested safe execution rules remain the intended production design:

- chart/history only
- snapshot fallback only
- no `quoteSummary`
- no financial statements
- `1` worker
- one processed item every `3` seconds
- stop on cooldown

But these rules were **not promoted into an active scheduler** yet because of the write-failure alert condition.

## What must happen before cron can be enabled

Cron should only be enabled after:

1. the recent `stock_price_history` write-timeout failures stop recurring
2. the active alert condition clears
3. the durable alert table is applied and visible if operators want persisted alert status:
   - [db/migrations/0054_stock_import_alerts.sql](/Users/amitbhawani/Documents/Ai%20FinTech%20Platform/db/migrations/0054_stock_import_alerts.sql)
4. at least one or more clean recent manual daily chart update runs complete without fresh DB write failures

## Validation

- `npm run lint` -> PASS
- `npx tsc --noEmit` -> PASS

## Verdict

- Yahoo daily chart cron: **Not enabled**
- Reason: **active DB write-failure alert condition**
- Correct next step: **stabilize write-path health first, then retry cron enablement**
