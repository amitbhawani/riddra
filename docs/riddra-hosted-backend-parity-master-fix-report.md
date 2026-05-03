# Riddra Hosted Backend Parity Master Fix Report

Date: 2026-05-02  
Timezone: Asia/Kolkata  
Scope: Prompt 124

## Source of Truth Reviewed

- `docs/riddra-hosted-beta-smoke-proof-report.md`
- `docs/riddra-hosted-stability-alignment-report.md`
- `docs/riddra-beta-baseline-decision-report.md`
- `docs/riddra-end-of-day-progress-update.md`
- repo runtime code paths for stock pages, search, diagnostics, robots, and sitemap

## What Was Fixed In Repo

### 1. Hosted stock-page parity path

Fixed:
- `app/stocks/[slug]/page.tsx`
- `components/test-stock-detail-page.tsx`
- `lib/stock-normalized-detail.ts`

Changes:
- public stock pages now pass real `normalizedData` from `getNormalizedStockDetailData(...)` instead of hardcoded `null`
- visible stock-page snapshot cards now prefer stored snapshot values for:
  - previous close
  - open
  - high
  - low
- top-page meta now uses stored trade-date / snapshot data instead of older fallback-only labels
- missing optional durable tables now degrade more cleanly in `stock-normalized-detail` instead of producing noisy thrown-error logs

Expected effect:
- hosted stock pages can use the native stored backend data path after redeploy
- conflicting visible price values should stop once production serves this build
- old placeholder behavior tied to `normalizedData: null` should disappear

### 2. Hosted search fallback

Fixed:
- `lib/public-search-fallback.ts`
- `lib/search-suggestions.ts`
- `app/api/search/suggestions/route.ts`
- `lib/smart-search.ts`
- `app/search/page.tsx`

Changes:
- added a lightweight direct fallback search path for hosted environments where Meilisearch is missing
- fallback queries public/stored route data directly from:
  - `stocks_master`
  - `mutual_funds`
  - `ipos`
  - `tracked_indexes`
- `/api/search/suggestions` now returns `200` when degraded fallback suggestions exist
- degraded `/search` now skips the heavy shared market sidebar rail instead of loading unrelated market-data payloads

Expected effect:
- hosted suggestions can still return useful stock matches even when Meilisearch is not configured
- the frontend can treat degraded fallback as usable, not as a hard failure
- degraded `/search` becomes lighter than the older path

### 3. Robots / sitemap consistency

Fixed:
- `app/sitemap.ts`

Changes:
- the sitemap now refuses to include `/markets/news` when the route is disallowed by robots policy

Expected effect:
- no more robots/sitemap contradiction after redeploy

### 4. Hosted diagnostics clarity

Fixed:
- `lib/env.ts`
- `lib/runtime-launch-config.ts`
- `lib/deployment-readiness.ts`
- `lib/search-engine/meilisearch.ts`

Changes:
- `MEILISEARCH_INDEX_PREFIX` is now treated as an explicit hosted requirement in diagnostics instead of being silently satisfied by the default fallback
- hosted search engine messaging now names all three expected Meilisearch env vars:
  - `MEILISEARCH_HOST`
  - `MEILISEARCH_API_KEY`
  - `MEILISEARCH_INDEX_PREFIX`

Result:
- existing admin diagnostics are sufficient; no separate new diagnostics page was required
- `/admin/runtime-diagnostics` and deployment-readiness logic now surface the missing prefix honestly

## Exact Production Env Checklist

### Required for Trigger-backed cron / worker parity

- `TRIGGER_SECRET_KEY=<Trigger.dev secret key for this project>`
- `TRIGGER_PROJECT_REF=<Trigger.dev project ref>`

### Required for hosted search parity

- `MEILISEARCH_HOST=<full hosted Meilisearch base URL>`
- `MEILISEARCH_API_KEY=<server-side API key used by app routes>`
- `MEILISEARCH_INDEX_PREFIX=riddra`

### Already expected to remain present

- `NEXT_PUBLIC_SITE_URL`
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `MARKET_DATA_REFRESH_SECRET`
- `CRON_SECRET`

## Local Validation

### Static checks

- `npm run lint` -> PASS
- `npx tsc --noEmit` -> PASS

### Local route proof

- `GET /stocks/reliance-industries` -> `200`
- `GET /api/search/suggestions?q=reliance` -> `200`
- `GET /search?query=reliance` -> `200`

### Local search fallback proof

`/api/search/suggestions?q=reliance` now returns real degraded-mode suggestions like:
- `Reliance Industries`
- `Reliance Chemotex Industries Limited`
- `Reliance Industrial Infrastructure Limited`
- `Reliance Power Limited`

Payload characteristics:
- `degraded: true`
- non-empty `suggestions`
- explanatory hosted fallback `message`

### Local robots/sitemap proof

Observed in local `robots.txt`:
- `Disallow: /markets/news/`

Observed in local `sitemap.xml`:
- no `/markets/news` entry

This means the local mismatch is fixed.

## Hosted Validation

These checks were run against [https://www.riddra.com](https://www.riddra.com).

### Hosted search suggestions

Current production response:

```json
{"suggestions":[],"degraded":false,"message":null}
```

Reading:
- production is still serving the **old hosted search behavior**
- the new fallback logic is **not live yet**

### Hosted robots / sitemap

Observed in production `robots.txt`:
- `Disallow: /markets/news/`

Observed in production `sitemap.xml`:
- `/markets/news` is still included

Reading:
- production is still serving the **old sitemap behavior**
- the local fix has **not been redeployed yet**

### Hosted stock detail parity proof

Production HTML for `https://www.riddra.com/stocks/reliance-industries` still contains:
- `normalizedData":null`

Reading:
- hosted production is still rendering the **old stock-page server payload**
- the new normalized stored-data path is **not live yet**

### Hosted stock page status

- `HEAD /stocks/reliance-industries` -> `200`

Reading:
- route is up
- parity is still stale

## Current Status

### Fixed in repo

- hosted-safe stock-page data path
- hosted-safe degraded search fallback
- robots/sitemap parity logic
- explicit Meilisearch env diagnostics

### Still pending in production

1. redeploy the current code
2. add missing Trigger envs:
   - `TRIGGER_SECRET_KEY`
   - `TRIGGER_PROJECT_REF`
3. add missing Meilisearch envs:
   - `MEILISEARCH_HOST`
   - `MEILISEARCH_API_KEY`
   - `MEILISEARCH_INDEX_PREFIX`
4. rebuild the hosted search index after env activation
5. capture authenticated hosted proof for:
   - account continuity
   - watchlist persistence
   - cron progress visibility
6. finalize `0057` live verification report

## Remaining Known Gaps After This Pass

### Still blocked by missing hosted env/config

- Trigger.dev durable execution parity
- Meilisearch live search parity
- hosted cron progress proof

### Still not fully proven

- authenticated hosted account flow
- hosted watchlist persistence
- `0057` live RLS verification signoff

### Honest performance note

The degraded `/search` route is cleaner than before, but it is still not a fast hosted-quality final state until:
- the new code is redeployed
- Meilisearch is configured
- the hosted search index is rebuilt

## Recommended Next Steps

1. Set the missing Production env vars exactly as listed above.
2. Redeploy production.
3. Re-run hosted checks:
   - `/api/search/suggestions?q=reliance`
   - `/search?query=reliance`
   - `/stocks/reliance-industries`
   - `/robots.txt`
   - `/sitemap.xml`
4. Run one authenticated hosted smoke for:
   - login
   - account page
   - watchlist persistence
5. Capture hosted Trigger/cron proof in the Control Center once Trigger envs are live.

## Final Read

This sprint fixed the **repo-side hosted backend parity blockers safely**.

But production is still showing the old hosted behavior because:
- the current code is not yet redeployed there
- Trigger and Meilisearch env parity are still incomplete

So the truthful state at the end of this pass is:
- **code readiness improved**
- **diagnostics honesty improved**
- **hosted production parity is not complete until deploy + env activation**
