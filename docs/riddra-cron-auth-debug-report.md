# Riddra Cron Auth Debug Report

Date: 2026-05-01

## Files checked

- [app/api/cron/yahoo-daily-update/route.ts](/Users/amitbhawani/Documents/Ai%20FinTech%20Platform/app/api/cron/yahoo-daily-update/route.ts)
- [app/api/cron/yahoo-daily-update-retry/route.ts](/Users/amitbhawani/Documents/Ai%20FinTech%20Platform/app/api/cron/yahoo-daily-update-retry/route.ts)
- [app/api/cron/yahoo-daily-update/_shared.ts](/Users/amitbhawani/Documents/Ai%20FinTech%20Platform/app/api/cron/yahoo-daily-update/_shared.ts)
- [lib/runtime-launch-config.ts](/Users/amitbhawani/Documents/Ai%20FinTech%20Platform/lib/runtime-launch-config.ts)
- [lib/env.ts](/Users/amitbhawani/Documents/Ai%20FinTech%20Platform/lib/env.ts)

## Exact auth logic

Both cron routes delegate all auth checks to:

- [executeYahooDailyUpdateCron(...)](/Users/amitbhawani/Documents/Ai%20FinTech%20Platform/app/api/cron/yahoo-daily-update/_shared.ts:92)
- [handleYahooDailyUpdateCronHead(...)](/Users/amitbhawani/Documents/Ai%20FinTech%20Platform/app/api/cron/yahoo-daily-update/_shared.ts:223)

The shared helper checks **only two execution secrets**:

1. `MARKET_DATA_REFRESH_SECRET`
2. `CRON_SECRET`

Runtime mapping:

- `MARKET_DATA_REFRESH_SECRET` -> `config.marketDataRefreshSecret`
- `CRON_SECRET` -> `config.cronSecret`

Source lines:

- [lib/env.ts](/Users/amitbhawani/Documents/Ai%20FinTech%20Platform/lib/env.ts:30)
- [lib/env.ts](/Users/amitbhawani/Documents/Ai%20FinTech%20Platform/lib/env.ts:31)
- [lib/runtime-launch-config.ts](/Users/amitbhawani/Documents/Ai%20FinTech%20Platform/lib/runtime-launch-config.ts:263)
- [lib/runtime-launch-config.ts](/Users/amitbhawani/Documents/Ai%20FinTech%20Platform/lib/runtime-launch-config.ts:267)

## Accepted request formats

### Option 1

Header:

```http
x-riddra-refresh-secret: <MARKET_DATA_REFRESH_SECRET>
```

Code:

- [app/api/cron/yahoo-daily-update/_shared.ts](/Users/amitbhawani/Documents/Ai%20FinTech%20Platform/app/api/cron/yahoo-daily-update/_shared.ts:14)
- [app/api/cron/yahoo-daily-update/_shared.ts](/Users/amitbhawani/Documents/Ai%20FinTech%20Platform/app/api/cron/yahoo-daily-update/_shared.ts:18)

### Option 2

Header:

```http
Authorization: Bearer <CRON_SECRET>
```

Code:

- [app/api/cron/yahoo-daily-update/_shared.ts](/Users/amitbhawani/Documents/Ai%20FinTech%20Platform/app/api/cron/yahoo-daily-update/_shared.ts:23)
- [app/api/cron/yahoo-daily-update/_shared.ts](/Users/amitbhawani/Documents/Ai%20FinTech%20Platform/app/api/cron/yahoo-daily-update/_shared.ts:24)

## Not supported right now

The current logic does **not** check for:

- `x-cron-secret`
- query param secret
- Vercel cron headers such as `x-vercel-cron`
- any IP allowlist
- any signed timestamp / replay protection

There is no query-string auth path in the route files or shared helper.

## Route behavior

Both routes use the same auth helper:

- primary route:
  - [app/api/cron/yahoo-daily-update/route.ts](/Users/amitbhawani/Documents/Ai%20FinTech%20Platform/app/api/cron/yahoo-daily-update/route.ts:8)
- retry route:
  - [app/api/cron/yahoo-daily-update-retry/route.ts](/Users/amitbhawani/Documents/Ai%20FinTech%20Platform/app/api/cron/yahoo-daily-update-retry/route.ts:8)

Supported methods:

- `GET`
- `POST`
- `HEAD`

All of them ultimately require one of the two header-based auth options above.

## Secret presence requirement

Before auth is even evaluated, the helper requires that at least one execution secret exists:

- `MARKET_DATA_REFRESH_SECRET`
- or `CRON_SECRET`

If neither is configured, the route returns:

- `503`

Code:

- [app/api/cron/yahoo-daily-update/_shared.ts](/Users/amitbhawani/Documents/Ai%20FinTech%20Platform/app/api/cron/yahoo-daily-update/_shared.ts:31)
- [app/api/cron/yahoo-daily-update/_shared.ts](/Users/amitbhawani/Documents/Ai%20FinTech%20Platform/app/api/cron/yahoo-daily-update/_shared.ts:99)

## Bottom line

Current cron auth expects exactly one of these:

1. `x-riddra-refresh-secret: <MARKET_DATA_REFRESH_SECRET>`
2. `Authorization: Bearer <CRON_SECRET>`

It does **not** currently support:

- `x-cron-secret`
- query params
- native Vercel cron header validation

