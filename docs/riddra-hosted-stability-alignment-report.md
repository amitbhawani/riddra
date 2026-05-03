# Riddra Hosted Stability Alignment Report

Date: 2026-05-02  
Environment checked: `https://www.riddra.com`

## Summary

Hosted beta is **not fully aligned yet**.

What is aligned:
- Supabase public and admin envs are present in Production.
- Yahoo cron route auth secrets are present in Production.
- Hosted cron routes now return quickly and no longer time out.
- Public pages, login, and protected-route redirects are reachable.

What is not aligned:
- Trigger.dev is **not configured under the env names the app actually reads**.
- Meilisearch is **not configured in Production**.
- Hosted search is slow and still returns empty suggestions for `reliance`.
- Cron progress visibility exists in code, but cannot become truly live until Trigger-backed durable jobs are actually configured and running.
- Logged-in continuity and watchlist persistence were not fully provable from this environment because no authenticated hosted beta session was available.

Final alignment status:
- **NO-GO for full hosted stability signoff**
- **GO for limited public browsing + protected route redirect behavior**

## 1. Trigger.dev Configuration

### Repo expectation

The hosted app explicitly expects:
- `TRIGGER_SECRET_KEY`
- `TRIGGER_PROJECT_REF`

Relevant code:
- `lib/env.ts`
- `lib/trigger-auth.ts`
- `lib/durable-jobs.ts`
- `trigger.config.ts`

Hosted readiness logic:
- `getDurableJobSystemReadiness()` only returns configured when:
  - `TRIGGER_SECRET_KEY` is present
  - `TRIGGER_PROJECT_REF` is present

### Production env status

From `vercel env ls production`, I found:
- present:
  - `MARKET_DATA_REFRESH_SECRET`
  - `CRON_SECRET`
  - `NEXT_PUBLIC_SITE_URL`
  - `NEXT_PUBLIC_SUPABASE_URL`
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
  - `SUPABASE_SERVICE_ROLE_KEY`
- not present under the expected app names:
  - `TRIGGER_SECRET_KEY`
  - `TRIGGER_PROJECT_REF`

There is a variable named:
- `tr_dev_1Adk8UIZIQo3iex7qLnL`

But the app does **not** read that name. It only reads `TRIGGER_SECRET_KEY`.

### Alignment result

- **FAIL**

### Exact fix needed

Add these Production env vars:
- `TRIGGER_SECRET_KEY=<your Trigger.dev secret token>`
- `TRIGGER_PROJECT_REF=<your Trigger.dev project ref>`

Recommended follow-up after env add:
1. Redeploy Production
2. Re-run cron route verification
3. Confirm durable job creation in the Control Center / durable jobs view

## 2. Yahoo Cron Routes

### Repo expectation

Cron auth accepts:
- `x-riddra-refresh-secret: <MARKET_DATA_REFRESH_SECRET>`
- `Authorization: Bearer <CRON_SECRET>`

Routes:
- `/api/cron/yahoo-daily-update`
- `/api/cron/yahoo-daily-update-retry`
- `/api/cron/yahoo-daily-update/worker`

The new design is queue-first:
- entry route authenticates
- entry route prepares/reuses a durable job
- worker handles bounded slices only

### Live route behavior

Unauthenticated live checks:
- `/api/cron/yahoo-daily-update` -> `401` in `0.51s`
- `/api/cron/yahoo-daily-update-retry` -> `401` in `0.72s`
- `/api/cron/yahoo-daily-update/worker` -> `401` in `0.72s`

This is good because it proves:
- no `FUNCTION_INVOCATION_TIMEOUT`
- the route returns quickly
- auth gate is active

### Hidden blocker

Even with valid cron auth, the route will still refuse durable execution until Trigger.dev is configured, because the code checks `getDurableJobSystemReadiness()` before queueing work.

### Alignment result

- **PARTIAL PASS**

Route layer:
- healthy

Durable execution layer:
- blocked by missing Trigger envs

### Exact fix needed

Already present:
- `MARKET_DATA_REFRESH_SECRET`
- `CRON_SECRET`

Still required:
- `TRIGGER_SECRET_KEY`
- `TRIGGER_PROJECT_REF`

## 3. Meilisearch Status

### Repo expectation

Hosted search expects:
- `MEILISEARCH_HOST`
- `MEILISEARCH_API_KEY`
- recommended prefix:
  - `MEILISEARCH_INDEX_PREFIX`

Relevant code:
- `lib/env.ts`
- `lib/search-engine/meilisearch.ts`
- `app/api/search/suggestions/route.ts`

### Production env status

Missing from Production env list:
- `MEILISEARCH_HOST`
- `MEILISEARCH_API_KEY`

Also not present:
- `MEILISEARCH_INDEX_PREFIX`

The code can fall back to local catalog search logic when Meilisearch is unavailable, but that is a degraded fallback, not full hosted search readiness.

### Alignment result

- **FAIL**

### Exact fix needed

Add these Production env vars:
- `MEILISEARCH_HOST=<host>`
- `MEILISEARCH_API_KEY=<api key>`
- `MEILISEARCH_INDEX_PREFIX=riddra` or your chosen prefix

Then:
1. Redeploy Production
2. Trigger the durable search rebuild route
3. Confirm index exists and has documents

## 4. Live Search

### Live behavior

Checks:
- `/search` -> `200` in `10.42s`
- `/api/search/suggestions?q=reliance` -> `200` in `0.14s`

Suggestions payload:

```json
{"suggestions":[],"degraded":false,"message":null}
```

### Reading

This means:
- the suggestions route is reachable
- it is not throwing a fatal error
- but the user-facing result is still effectively broken for a common stock query

This is not a healthy hosted search experience.

### Alignment result

- **FAIL**

### Exact fix needed

Primary fix:
- configure Meilisearch envs
- rebuild the index

Then verify:
- `reliance`
- `tcs`
- `infosys`
- `hdfc`
- `20 microns`

## 5. Auth Continuity

### Live behavior

Checks:
- `/login` -> `200` in `3.20s`
- `/account` -> final `200` in `5.53s`
- `/account` initial response -> `307` redirect to `/login`

This confirms:
- protected auth gating is active
- anonymous users are redirected correctly

### What I could not fully prove

Without a real hosted signed-in session, I could not truthfully prove:
- post-login continuity across refreshes
- durable session persistence across tabs
- end-to-end account mutation flows after login

### Alignment result

- **PARTIAL PASS**

Anonymous gating:
- pass

Authenticated continuity:
- unverified in this run

## 6. Account Page

### Live behavior

- protected correctly by redirect to `/login`
- no anonymous access leak found

### Code dependency status

After the recent refactor:
- ordinary user flows use session-scoped access
- self-service profile/watchlist/portfolio no longer depend on admin-client paths for normal runtime

### Alignment result

- **PARTIAL PASS**

Route protection:
- pass

Authenticated account UX:
- still needs live signed-in smoke proof

## 7. Watchlist Persistence

### Code readiness

The watchlist API is in the correct session-scoped shape now:
- `app/api/account/watchlist-items/route.ts`
- requires authenticated user
- depends on `watchlistEnabled` settings

### Hosted proof status

I could not fully verify hosted watchlist persistence because no authenticated hosted session was available in this run.

### Alignment result

- **UNVERIFIED**

### Exact follow-up needed

Run a hosted signed-in proof:
1. login
2. add `RELIANCE`
3. refresh
4. confirm it persists
5. remove it
6. refresh again

## 8. Market-Data Import Control Center

### Live behavior

- `/admin/market-data/import-control-center` final -> `200` in `4.26s`
- initial unauthenticated response -> `307` redirect to `/login`

This is the expected access pattern.

### Important limitation

Without admin login, this only proves:
- route availability
- access protection

It does **not** prove:
- admin content rendering
- live cron progress rendering
- action buttons executing correctly in hosted mode

### Alignment result

- **PARTIAL PASS**

## 9. Cron Progress Visibility

### Code readiness

The Control Center UI already supports:
- active cron job progress
- processed count
- total count
- pending count
- next cursor
- last processed symbol
- next pending symbol

Source:
- `lib/admin-import-control-center.ts`
- `components/admin/admin-import-control-center-client.tsx`

### Real dependency chain

For hosted cron progress to truly work, all of these must be true:
1. admin can access the page
2. cron route authenticates
3. Trigger.dev is configured
4. durable worker jobs are created
5. worker metadata is written back
6. activity log is readable

Right now the missing Trigger envs break that chain before real progress can appear.

### Alignment result

- **FAIL**

### Exact fix needed

Required:
- `TRIGGER_SECRET_KEY`
- `TRIGGER_PROJECT_REF`

Then verify with one authenticated cron trigger:
- control center shows active job
- processed / total updates
- last processed symbol updates
- next pending symbol updates

## Live Response Snapshot

Current hosted timings:
- `/` -> `200` in `5.96s`
- `/stocks` -> `200` in `3.85s`
- `/stocks/reliance-industries` -> `200` in `6.22s`
- `/search` -> `200` in `10.42s`
- `/login` -> `200` in `3.20s`
- `/account` -> final `200` in `5.53s`
- `/admin/market-data/import-control-center` -> final `200` in `4.26s`
- `/api/search/suggestions?q=reliance` -> `200` in `0.14s`, but empty
- `/api/cron/yahoo-daily-update` -> `401` in `0.51s`
- `/api/cron/yahoo-daily-update-retry` -> `401` in `0.72s`
- `/api/cron/yahoo-daily-update/worker` -> `401` in `0.72s`

## Exact Missing Env Vars / Fixes

### Must add for durable cron and Trigger-backed jobs
- `TRIGGER_SECRET_KEY`
- `TRIGGER_PROJECT_REF`

### Must add for proper hosted search
- `MEILISEARCH_HOST`
- `MEILISEARCH_API_KEY`

### Strongly recommended for explicit index naming
- `MEILISEARCH_INDEX_PREFIX`

### Already present and aligned
- `MARKET_DATA_REFRESH_SECRET`
- `CRON_SECRET`
- `NEXT_PUBLIC_SITE_URL`
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`

## What Should Be Done Next

1. Add `TRIGGER_SECRET_KEY` and `TRIGGER_PROJECT_REF` to Production.
2. Add `MEILISEARCH_HOST`, `MEILISEARCH_API_KEY`, and `MEILISEARCH_INDEX_PREFIX` to Production.
3. Redeploy hosted Production.
4. Trigger one authenticated Yahoo cron run through the queue system.
5. Confirm Control Center shows active cron progress.
6. Trigger one hosted search rebuild.
7. Verify `reliance` search suggestions return real results.
8. Run one signed-in hosted beta smoke for:
   - login
   - account
   - watchlist add/remove persistence

## Final Verdict

- **Hosted stability alignment: NOT COMPLETE**
- Biggest blockers:
  - missing Trigger production env wiring
  - missing Meilisearch production env wiring
  - live search still not returning useful results
  - cron progress cannot be treated as live until Trigger-backed durable jobs are actually running
