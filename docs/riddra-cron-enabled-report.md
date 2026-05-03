# Riddra Cron Enabled Report

## What was enabled

Production cron has been enabled for the Yahoo strict same-day-only daily update lane.

This is now configured as:

- primary post-close run
- optional retry run `2` hours later

## Schedules

Updated [vercel.json](/Users/amitbhawani/Documents/Ai%20FinTech%20Platform/vercel.json):

- primary:
  - path: `/api/cron/yahoo-daily-update`
  - schedule: `0 11 * * *`
  - time: `4:30 PM IST`
- retry:
  - path: `/api/cron/yahoo-daily-update-retry`
  - schedule: `0 13 * * *`
  - time: `6:30 PM IST`

The old scheduled market-data-sync cron path is no longer the active stock-refresh scheduler.

## Command behavior

Updated [package.json](/Users/amitbhawani/Documents/Ai%20FinTech%20Platform/package.json) so:

```bash
npm run yahoo:daily-update
```

now runs the strict same-day-only lane by default.

Updated [scripts/import-yahoo-daily-update.mjs](/Users/amitbhawani/Documents/Ai%20FinTech%20Platform/scripts/import-yahoo-daily-update.mjs) so it now:

- defaults to `daily_same_day_only`
- resolves `targetDate` dynamically from the trading-date policy when not provided
- applies same-day-only throttle defaults if env is not set:
  - `YAHOO_FINANCE_REQUESTS_PER_SECOND = 0.3333333333333333`
  - `YAHOO_FINANCE_MAX_CONCURRENT_WORKERS = 1`
- no longer silently caps same-day-only runs to `50` items by default

## Runtime rules now enforced

The enabled cron lane is now aligned to the required rules:

- chart/history only
- snapshot fallback only
- no `quoteSummary`
- no fundamentals
- `1` worker
- `1` request every `3` seconds via same-day-only cron defaults
- skip existing rows
- stop on cooldown

Additional hard-stop protections were added in [lib/yahoo-finance-batch-import.ts](/Users/amitbhawani/Documents/Ai%20FinTech%20Platform/lib/yahoo-finance-batch-import.ts):

- stop on Yahoo cooldown-style failures
- stop on write-timeout / write-spike style failures
- stop on duplicate-key regressions
- keep the existing suspicious same-day shared-candle anomaly stop

## New cron routes

Created:

- [app/api/cron/yahoo-daily-update/route.ts](/Users/amitbhawani/Documents/Ai%20FinTech%20Platform/app/api/cron/yahoo-daily-update/route.ts)
- [app/api/cron/yahoo-daily-update-retry/route.ts](/Users/amitbhawani/Documents/Ai%20FinTech%20Platform/app/api/cron/yahoo-daily-update-retry/route.ts)
- shared helper:
  - [app/api/cron/yahoo-daily-update/_shared.ts](/Users/amitbhawani/Documents/Ai%20FinTech%20Platform/app/api/cron/yahoo-daily-update/_shared.ts)

These routes:

- require `MARKET_DATA_REFRESH_SECRET` or `CRON_SECRET`
- resolve the expected trading date dynamically
- execute `runYahooDailySameDayOnlyUntilComplete(...)`
- write durable admin activity log entries for:
  - started
  - completed
  - failed
- revalidate key admin and stock surfaces after completion

## Control Center updates

Updated:

- [lib/admin-import-control-center.ts](/Users/amitbhawani/Documents/Ai%20FinTech%20Platform/lib/admin-import-control-center.ts)
- [app/admin/market-data/import-control-center/page.tsx](/Users/amitbhawani/Documents/Ai%20FinTech%20Platform/app/admin/market-data/import-control-center/page.tsx)

The Import Control Center now:

- shows `cron status = enabled`
- reads `last cron run time` from Yahoo cron activity log entries
- reads `last cron result` from Yahoo cron activity log metadata
- treats the enabled cron lane as the expected production state in readiness messaging

## Validation

- `npm run lint` -> PASS
- `npx tsc --noEmit` -> PASS
- `node --check scripts/import-yahoo-daily-update.mjs` -> PASS
- `/admin/market-data/import-control-center` -> `200`
- `/api/stocks/reliance-industries/chart?range=1D` -> `200`

Cron route local probe:

- `/api/cron/yahoo-daily-update` -> `503`

This is the correct safe behavior in the current local runtime because no local:

- `MARKET_DATA_REFRESH_SECRET`
- `CRON_SECRET`

was available for the cron route to authorize against.

## Important deployment note

Cron is now enabled in application code and scheduler config, but successful production execution still requires at least one of these environment variables to be present in the deployed runtime:

- `MARKET_DATA_REFRESH_SECRET`
- `CRON_SECRET`

Without that, the cron endpoint will intentionally return `503` or `401` instead of running.

## Files changed

- [vercel.json](/Users/amitbhawani/Documents/Ai%20FinTech%20Platform/vercel.json)
- [package.json](/Users/amitbhawani/Documents/Ai%20FinTech%20Platform/package.json)
- [scripts/import-yahoo-daily-update.mjs](/Users/amitbhawani/Documents/Ai%20FinTech%20Platform/scripts/import-yahoo-daily-update.mjs)
- [lib/yahoo-finance-batch-import.ts](/Users/amitbhawani/Documents/Ai%20FinTech%20Platform/lib/yahoo-finance-batch-import.ts)
- [lib/admin-import-control-center.ts](/Users/amitbhawani/Documents/Ai%20FinTech%20Platform/lib/admin-import-control-center.ts)
- [app/admin/market-data/import-control-center/page.tsx](/Users/amitbhawani/Documents/Ai%20FinTech%20Platform/app/admin/market-data/import-control-center/page.tsx)
- [app/api/cron/yahoo-daily-update/_shared.ts](/Users/amitbhawani/Documents/Ai%20FinTech%20Platform/app/api/cron/yahoo-daily-update/_shared.ts)
- [app/api/cron/yahoo-daily-update/route.ts](/Users/amitbhawani/Documents/Ai%20FinTech%20Platform/app/api/cron/yahoo-daily-update/route.ts)
- [app/api/cron/yahoo-daily-update-retry/route.ts](/Users/amitbhawani/Documents/Ai%20FinTech%20Platform/app/api/cron/yahoo-daily-update-retry/route.ts)
