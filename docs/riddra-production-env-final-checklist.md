# Riddra Production Env Final Checklist

## Purpose

This is the final hosted-parity environment checklist for Production on [Vercel](https://vercel.com/).

It is based on the current live code paths in:

- [app/api/cron/yahoo-daily-update/_shared.ts](/Users/amitbhawani/Documents/Ai%20FinTech%20Platform/app/api/cron/yahoo-daily-update/_shared.ts)
- [app/api/cron/yahoo-daily-update/route.ts](/Users/amitbhawani/Documents/Ai%20FinTech%20Platform/app/api/cron/yahoo-daily-update/route.ts)
- [app/api/cron/yahoo-daily-update/worker/route.ts](/Users/amitbhawani/Documents/Ai%20FinTech%20Platform/app/api/cron/yahoo-daily-update/worker/route.ts)
- [trigger/market-data/yahoo-daily-update-cron.ts](/Users/amitbhawani/Documents/Ai%20FinTech%20Platform/trigger/market-data/yahoo-daily-update-cron.ts)
- [lib/durable-jobs.ts](/Users/amitbhawani/Documents/Ai%20FinTech%20Platform/lib/durable-jobs.ts)
- [lib/env.ts](/Users/amitbhawani/Documents/Ai%20FinTech%20Platform/lib/env.ts)
- [lib/runtime-launch-config.ts](/Users/amitbhawani/Documents/Ai%20FinTech%20Platform/lib/runtime-launch-config.ts)
- [lib/search-engine/meilisearch.ts](/Users/amitbhawani/Documents/Ai%20FinTech%20Platform/lib/search-engine/meilisearch.ts)
- [lib/runtime-diagnostics.ts](/Users/amitbhawani/Documents/Ai%20FinTech%20Platform/lib/runtime-diagnostics.ts)

## Final env matrix

| Env var | Required now or optional | Where to get it | What breaks if missing |
| --- | --- | --- | --- |
| `TRIGGER_SECRET_KEY` | Required now | Trigger.dev dashboard -> project -> API Keys | Durable job queueing and Trigger-backed Yahoo cron worker cannot be treated as live |
| `TRIGGER_PROJECT_REF` | Required now | Trigger.dev dashboard -> project settings / project reference | Trigger task deployment and run-listing target are not pinned to the correct production project |
| `MEILISEARCH_HOST` | Required now for full hosted parity | Hosted Meilisearch provider or self-hosted Meilisearch base URL | Hosted search falls back; indexed search is not proven live |
| `MEILISEARCH_API_KEY` | Required now for full hosted parity | Hosted Meilisearch provider API key / search key | Hosted search falls back; live index reads fail |
| `MEILISEARCH_INDEX_PREFIX` | Required now for full hosted parity | Internal naming choice set by operator, usually `riddra` | Hosted diagnostics remain degraded and explicit index namespace proof is missing |
| `CRON_SECRET` | Optional but recommended | Operator-managed secret inventory or freshly generated secret | Bearer-token cron auth path is unavailable |
| `MARKET_DATA_REFRESH_SECRET` | Required now | Operator-managed secret inventory or freshly generated secret | Primary `x-riddra-refresh-secret` cron auth path and manual operator refresh path are unavailable |
| `NEXT_PUBLIC_SUPABASE_URL` | Required now | Supabase dashboard -> Project Settings -> API | Browser/server auth client cannot connect; hosted data reads break |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Required now | Supabase dashboard -> Project Settings -> API | Public/browser Supabase client and signed-in session reads break |
| `SUPABASE_SERVICE_ROLE_KEY` | Required now | Supabase dashboard -> Project Settings -> API | Admin durability, Trigger worker writes, and protected server-side writes break |

## Value source notes

### `TRIGGER_SECRET_KEY`

- Source: Trigger.dev dashboard for the exact production project
- Location:
  - project -> API Keys
- Typical format:
  - production keys usually start with `tr_prod_`
- Do not reuse a dev key in Production

### `TRIGGER_PROJECT_REF`

- Source: Trigger.dev dashboard for the exact production project
- Location:
  - project settings or project reference panel
- Use the exact reference shown by Trigger.dev
- Do not rely on the repo fallback default for hosted proof

### `MEILISEARCH_HOST`

- Source:
  - your hosted Meilisearch provider, or
  - your own self-hosted Meilisearch deployment URL
- Expected shape:
  - `https://<host>`
- Must be reachable from Vercel Production runtime

### `MEILISEARCH_API_KEY`

- Source:
  - your hosted Meilisearch dashboard, or
  - your own Meilisearch key management
- Use the key intended for server-side index access and query access used by the app

### `MEILISEARCH_INDEX_PREFIX`

- Source: internal operator choice
- Recommended production value:
  - `riddra`
- Current app behavior:
  - public index uid becomes `${MEILISEARCH_INDEX_PREFIX}_search`
  - with `riddra`, that is `riddra_search`

### `CRON_SECRET`

- Source:
  - operator-managed secret inventory, or
  - generate a new secret during rotation
- Accepted by code as:
  - `Authorization: Bearer <CRON_SECRET>`

### `MARKET_DATA_REFRESH_SECRET`

- Source:
  - operator-managed secret inventory, or
  - generate a new secret during rotation
- Accepted by code as:
  - `x-riddra-refresh-secret: <MARKET_DATA_REFRESH_SECRET>`
- This is the preferred operator-facing auth path

### Supabase envs

Source for all three:

- Supabase dashboard
- Project Settings -> API

Values:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`

## Current runtime truth

### Cron auth

The production cron routes currently accept:

- `x-riddra-refresh-secret: <MARKET_DATA_REFRESH_SECRET>`
- `Authorization: Bearer <CRON_SECRET>`

Relevant routes:

- `/api/cron/yahoo-daily-update`
- `/api/cron/yahoo-daily-update-retry`
- `/api/cron/yahoo-daily-update/worker`

### Trigger readiness

The app only treats Trigger as configured when both exist:

- `TRIGGER_SECRET_KEY`
- `TRIGGER_PROJECT_REF`

### Meilisearch readiness

Hosted Meilisearch is only treated as fully configured when all three exist:

- `MEILISEARCH_HOST`
- `MEILISEARCH_API_KEY`
- `MEILISEARCH_INDEX_PREFIX`

### Search fallback

Even if Meilisearch is missing, the app now degrades cleanly to stored fallback search.

Important:

- fallback is acceptable for graceful operation
- it is **not** full hosted parity proof for search backend readiness

## Recommended Production values

Use your real hosted values, but this is the target shape:

```bash
TRIGGER_SECRET_KEY=tr_prod_...
TRIGGER_PROJECT_REF=proj_...
MEILISEARCH_HOST=https://<your-meilisearch-host>
MEILISEARCH_API_KEY=<your-meilisearch-api-key>
MEILISEARCH_INDEX_PREFIX=riddra
CRON_SECRET=<long-random-secret>
MARKET_DATA_REFRESH_SECRET=<long-random-secret>
NEXT_PUBLIC_SUPABASE_URL=https://jawojjmapxnevywrmmiq.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<your-supabase-anon-key>
SUPABASE_SERVICE_ROLE_KEY=<your-supabase-service-role-key>
```

## What breaks by category

### If Trigger env is missing

Broken or unproven:

- queued Yahoo cron worker execution
- durable Trigger job proofs
- Trigger-backed cron progress proof in production
- run-history validation in runtime diagnostics

### If Meilisearch env is missing

Degraded but not fully broken:

- `/search` falls back instead of using live index
- `/api/search/suggestions` falls back instead of using live index
- admin diagnostics reports degraded search backend state

### If `MARKET_DATA_REFRESH_SECRET` is missing

Broken or unproven:

- primary operator header auth for cron and refresh routes
- authenticated diagnostics using `x-riddra-refresh-secret`

### If `CRON_SECRET` is missing

Degraded:

- bearer-token auth path is unavailable
- Vercel-compatible cron auth via bearer cannot be tested on that path

### If Supabase public env is missing

Broken:

- login/session flows
- account and watchlist public app behavior
- stock/fund/index public data reads that rely on runtime Supabase access

### If `SUPABASE_SERVICE_ROLE_KEY` is missing

Broken:

- admin durability writes
- Trigger worker write path
- protected server-side durable account / market-data operations

## Safe secret generation notes

If you need to rotate `CRON_SECRET` or `MARKET_DATA_REFRESH_SECRET`, generate a long random value first:

```bash
openssl rand -base64 32
```

Do not place generated secrets in docs, git, or screenshots.

## Vercel Production setup steps

### Option A: use the Vercel dashboard

1. Open the Riddra Vercel project
2. Go to Settings -> Environment Variables
3. Add or update:
   - `TRIGGER_SECRET_KEY`
   - `TRIGGER_PROJECT_REF`
   - `MEILISEARCH_HOST`
   - `MEILISEARCH_API_KEY`
   - `MEILISEARCH_INDEX_PREFIX`
   - `CRON_SECRET`
   - `MARKET_DATA_REFRESH_SECRET`
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
4. Save them for `Production`
5. Redeploy Production

### Option B: use the Vercel CLI

Repeat for each env:

```bash
vercel env add TRIGGER_SECRET_KEY production
vercel env add TRIGGER_PROJECT_REF production
vercel env add MEILISEARCH_HOST production
vercel env add MEILISEARCH_API_KEY production
vercel env add MEILISEARCH_INDEX_PREFIX production
vercel env add CRON_SECRET production
vercel env add MARKET_DATA_REFRESH_SECRET production
vercel env add NEXT_PUBLIC_SUPABASE_URL production
vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY production
vercel env add SUPABASE_SERVICE_ROLE_KEY production
```

Then redeploy:

```bash
vercel --prod
```

## Trigger deployment steps

After the web app envs are set, deploy the Trigger tasks too:

```bash
npm run trigger:deploy
```

Current repo script:

- [package.json](/Users/amitbhawani/Documents/Ai%20FinTech%20Platform/package.json)

Current Trigger config:

- [trigger.config.ts](/Users/amitbhawani/Documents/Ai%20FinTech%20Platform/trigger.config.ts)

Also make sure the Trigger runtime itself has the worker envs it needs:

- `NEXT_PUBLIC_SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`

## Verification commands

Replace the placeholders before running these.

### 1. Cron readiness diagnostics

Primary window:

```bash
curl -s \
  -H "x-riddra-refresh-secret: <MARKET_DATA_REFRESH_SECRET>" \
  "https://www.riddra.com/api/cron/yahoo-daily-update?diagnostics=1"
```

Retry window:

```bash
curl -s \
  -H "x-riddra-refresh-secret: <MARKET_DATA_REFRESH_SECRET>" \
  "https://www.riddra.com/api/cron/yahoo-daily-update-retry?diagnostics=1"
```

What success should show:

- `"ok": true`
- `"mode": "diagnostics"`
- readiness payload present
- `readiness.executionSecretReady = true`
- `readiness.durableJobs.configured = true`
- `readiness.durableJobs.missingEnv = []`
- `readiness.worker.maxItemsPerRun = 25`

### 2. Quick cron route liveness

```bash
curl -I -s https://www.riddra.com/api/cron/yahoo-daily-update
curl -I -s https://www.riddra.com/api/cron/yahoo-daily-update-retry
```

Expected:

- quick response
- no `FUNCTION_INVOCATION_TIMEOUT`

### 3. Real queue-entry proof

```bash
curl -s \
  -H "x-riddra-refresh-secret: <MARKET_DATA_REFRESH_SECRET>" \
  "https://www.riddra.com/api/cron/yahoo-daily-update"
```

Expected:

- quick JSON response
- `ok: true`
- durable `jobId`
- created or reused job state
- queued worker proof if Trigger is live

### 4. Search suggestions proof

```bash
curl -s "https://www.riddra.com/api/search/suggestions?query=reliance&limit=8"
```

Expected:

- `200`
- useful stock suggestions
- `Reliance Industries` present or equivalent useful stock hit

### 5. Search page proof

```bash
curl -I -s "https://www.riddra.com/search?query=reliance"
```

Expected:

- `200`
- no obvious long hang

### 6. Robots and sitemap proof

```bash
curl -I -s https://www.riddra.com/robots.txt
curl -I -s https://www.riddra.com/sitemap.xml
curl -s https://www.riddra.com/robots.txt | rg "/markets/news"
curl -s https://www.riddra.com/sitemap.xml | rg "/markets/news"
```

Expected:

- `robots.txt` -> `200`
- `sitemap.xml` -> `200`
- `/markets/news` blocked in robots
- `/markets/news` absent from sitemap

### 7. Hosted stock parity proof

```bash
curl -s https://www.riddra.com/stocks/reliance-industries | rg "normalizedData\":null|Awaiting extended history|1D"
curl -s https://www.riddra.com/stocks/tcs | rg "normalizedData\":null|Awaiting extended history|1D"
curl -s https://www.riddra.com/stocks/infosys | rg "normalizedData\":null|Awaiting extended history|1D"
```

Expected:

- no visible parity regressions
- no stale hosted stock-page markers like:
  - `normalizedData":null`
  - `Awaiting extended history`
  - visible `1D` chart tab in final rendered UX

## Local validation commands before or after deploy

```bash
npm run lint
npx tsc --noEmit
```

## Final deploy order

1. Add or confirm Production envs in Vercel
2. Redeploy Production:
   - `vercel --prod`
3. Deploy Trigger tasks:
   - `npm run trigger:deploy`
4. Verify cron diagnostics
5. Verify search suggestions and `/search`
6. Verify hosted stock-page parity
7. Verify `robots.txt` and `sitemap.xml`
8. Verify Import Control Center:
   - `/admin/market-data/import-control-center`

## Minimum GO set for hosted parity

Treat hosted backend parity as ready only when all of these are true:

- `TRIGGER_SECRET_KEY` present
- `TRIGGER_PROJECT_REF` present
- `MEILISEARCH_HOST` present
- `MEILISEARCH_API_KEY` present
- `MEILISEARCH_INDEX_PREFIX` present explicitly
- `MARKET_DATA_REFRESH_SECRET` present
- `NEXT_PUBLIC_SUPABASE_URL` present
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` present
- `SUPABASE_SERVICE_ROLE_KEY` present
- cron diagnostics return healthy readiness
- hosted `reliance` suggestions return useful results
- hosted stock pages match the latest local parity behavior

## Final note

Do not mark hosted parity complete just because the app degrades gracefully.

Hosted parity is only fully proven when:

- required Production envs are actually set
- Production has been redeployed
- Trigger tasks are deployed to the correct Trigger project
- the hosted verification commands above pass against `https://www.riddra.com`
