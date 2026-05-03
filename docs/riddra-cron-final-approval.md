# Riddra Cron Final Approval

## Verdict

**GO**

This is a **cron GO for the Yahoo same-day stock refresh lane** under the approval criteria you set.

The gate passed on the requested checks:

1. `fresh + accepted exceptions = 2157`
2. no active duplicate-key errors
3. no active write-timeout errors
4. no active Yahoo cooldown
5. chart data is correct
6. quarantine is clear
7. Import Control Center is healthy

## Final stats

- active `stocks_master`: `2157`
- durable `stock_data_freshness` rows: `2157`
- expected trading date: `2026-04-30`
- evaluation date: `2026-05-01`
- fresh + accepted exceptions: `2157`
- blocking stale count after accepted exceptions: `0`
- accepted exceptions: `2`
- active quarantine rows: `0`
- resolved quarantine rows: `80`
- duplicate-key errors in last `24` hours: `0`
- write-timeout / write-failure errors in last `24` hours: `0`
- recent `stock_import_errors` in last `24` hours: `0`
- recent activity rows available: `200`
- recent reconciliation rows available: `200`
- Yahoo cooldown active: `No`
- Import Control Center route:
  - `/admin/market-data/import-control-center` -> `200`

## Exception list

Accepted provider exceptions:

1. `KIRANVYPAR` / `KIRANVYPAR.NS`
   - company: `Kiran Vyapar Limited`
   - last price date: `2026-04-29`
   - last snapshot date: `2026-04-29`
   - durable row still currently says:
     - `reason_category = stale_missing_price`
     - `is_stale = true`
   - app-level freshness policy now treats it as:
     - `provider_no_data`
     - non-blocking

2. `NEAGI` / `NEAGI.NS`
   - company: `Neelamalai Agro Industries Limited`
   - last price date: `2026-04-28`
   - last snapshot date: `2026-04-28`
   - durable row still currently says:
     - `reason_category = stale_missing_price`
     - `is_stale = true`
   - app-level freshness policy now treats it as:
     - `provider_no_data`
     - non-blocking

## Chart validation

Verified `1D` native chart API health:

- `/api/stocks/reliance-industries/chart?range=1D` -> `200`
- `/api/stocks/tcs/chart?range=1D` -> `200`
- `/api/stocks/infosys/chart?range=1D` -> `200`
- `/api/stocks/20-microns-limited/chart?range=1D` -> `200`

Verified latest `2026-04-30` candles are symbol-specific and no suspicious shared RELIANCE fixture candle remains:

- `RELIANCE` -> distinct `1D` candle
- `TCS` -> distinct `1D` candle
- `INFY` -> distinct `1D` candle
- `20MICRONS` -> distinct `1D` candle

## Cron command

### Approved refresh lane

Manual same-day-only invocation:

```bash
npm run yahoo:daily-update:same-day-only -- --target-date=<resolved_expected_trading_date>
```

### Important launch note

Do **not** schedule the raw script without an explicit `--target-date`.

Current script default:

- [scripts/import-yahoo-daily-update.mjs](/Users/amitbhawani/Documents/Ai%20FinTech%20Platform/scripts/import-yahoo-daily-update.mjs)
- default `targetDate = 2026-04-30`

So unattended cron should use either:

1. a wrapper that resolves the expected latest trading date dynamically, or
2. the authenticated cron endpoint after it is confirmed to execute the correct same-day-only lane

Current scheduled endpoint in [vercel.json](/Users/amitbhawani/Documents/Ai%20FinTech%20Platform/vercel.json):

- `/api/cron/market-data-sync`

## Schedule

Current configured schedule:

- `0 11 * * *` UTC
- `4:30 PM IST` daily

This is the correct post-market-close slot for the India lane.

## Environment variables

Minimum required operational environment:

- `NEXT_PUBLIC_SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `MARKET_DATA_REFRESH_SECRET` or `CRON_SECRET`

Recommended supporting environment:

- `NEXT_PUBLIC_SUPPORT_EMAIL` or `YAHOO_IMPORT_ACTOR_EMAIL`

## Rollback steps

If cron must be rolled back immediately:

1. disable the schedule in [vercel.json](/Users/amitbhawani/Documents/Ai%20FinTech%20Platform/vercel.json)
2. redeploy without the market-data cron
3. if emergency stop is needed before deploy, clear or rotate:
   - `MARKET_DATA_REFRESH_SECRET`
   - `CRON_SECRET`
4. verify the endpoint now rejects execution:
   - `/api/cron/market-data-sync` -> `401` or `503`
5. continue with manual-only runs:

```bash
npm run yahoo:daily-update:same-day-only -- --target-date=<resolved_expected_trading_date> --max-items=<controlled_batch_size>
```

## Manual approval checklist

1. apply [db/migrations/0065_stock_data_freshness_provider_no_data.sql](/Users/amitbhawani/Documents/Ai%20FinTech%20Platform/db/migrations/0065_stock_data_freshness_provider_no_data.sql) so accepted exceptions are durable, not only app-level
2. reload PostgREST schema cache after `0065`
3. rerun `npm run stocks:generate-freshness`
4. confirm `KIRANVYPAR` and `NEAGI` are stored durably as:
   - `reason_category = provider_no_data`
   - `is_stale = false`
5. confirm `/admin/market-data/import-control-center` still returns `200`
6. confirm no new duplicate-key errors appeared in the last `24` hours
7. confirm no new write-timeout errors appeared in the last `24` hours
8. confirm no active Yahoo cooldown
9. confirm active quarantine rows remain `0`
10. only then enable unattended schedule

## Honest operational note

This is a **GO for cron approval criteria**, not a blanket “everything in the app is perfect” signoff.

During the same audit window:

- the control center was healthy
- chart APIs were healthy
- but `/stocks/reliance-industries` returned `500` on one direct page-health check

That does **not** invalidate the cron gate you defined, but it is still a real public-route issue that should be fixed separately.
