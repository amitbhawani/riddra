# Riddra Localhost Performance Emergency Audit

Date: April 30, 2026  
Environment: local Next.js dev server on `http://127.0.0.1:3000`  
Scope: emergency audit only, no large behavior changes applied in this pass

## Executive Summary

Localhost slowness is real and reproducible. The main problem is not one broken route. It is a combination of:

- heavy server-side Supabase aggregation on page load
- full-universe stock discovery loaders being reused across listing, detail, search, sitemap, and compare flows
- over-fetching entire stock snapshot tables and then deduping in memory
- expensive per-stock compare ranking work on the `/stocks` page
- a very large import-control-center aggregation path that performs many independent durable reads in one request

The worst routes measured in this audit were:

- `/stocks/reliance-industries` -> `15.90s`
- `/api/search/suggestions?query=reliance&limit=8` -> `14.14s`
- `/stocks` -> `13.44s`
- `/admin/market-data/import-control-center` -> `13.16s`
- `/sitemap.xml` -> `7.73s`

These are server-render timing problems first. The app is working, but localhost feels slow because the server is spending too much time building data before HTML starts streaming.

## 1. Next.js Dev Server Startup Time

Status: not directly measurable from this thread.

What I confirmed:

- a live dev server process is running:
  - `npm run dev`
  - `node scripts/run-dev-stable.mjs`
  - `next dev --webpack`
  - `next-server (v16.2.3)`

What I could not confirm cleanly:

- cold startup time
- first-route compile time from terminal logs

Reason:

- there is no attached app terminal session in this thread
- `read_thread_terminal` returned no active terminal session
- this audit therefore uses live route timings and code-path analysis instead of startup-log timing

Conclusion:

- startup/compile timing still needs one dedicated fresh-server measurement pass
- current evidence already shows that route data-loading is a major bottleneck, regardless of startup cost

## 2. Route Load Time Measurements

Measured with local `curl` against the running dev server:

| Route | HTTP | Total Time | Time To First Byte |
|---|---:|---:|---:|
| `/admin/market-data/import-control-center` | 200 | `13.16s` | `13.16s` |
| `/stocks` | 200 | `13.44s` | `13.38s` |
| `/stocks/reliance-industries` | 200 | `15.90s` | `15.89s` |
| `/sitemap.xml` | 200 | `7.73s` | `7.73s` |
| `/api/search/suggestions?query=reliance&limit=8` | 200 | `14.14s` | `14.14s` |

Interpretation:

- TTFB is almost the same as total time on every route
- that means the slowness is primarily server-side compute / data fetching before response streaming
- this is not mainly a client-hydration issue

## 3. `/admin/market-data/import-control-center` Load Time

Observed time:

- `13.16s`

Primary cause:

- [lib/admin-import-control-center.ts](/Users/amitbhawani/Documents/Ai%20FinTech%20Platform/lib/admin-import-control-center.ts) is a very large aggregator
- [app/admin/market-data/import-control-center/page.tsx](/Users/amitbhawani/Documents/Ai%20FinTech%20Platform/app/admin/market-data/import-control-center/page.tsx) forces dynamic rendering with:
  - `dynamic = "force-dynamic"`
  - `revalidate = 0`

Top-level query burst inside `getAdminImportControlCenterData(...)`:

- one full `getAdminStockImportDashboardData(...)` call first
- then a `Promise.all(...)` with at least `17` more durable reads/counts:
  - active stock count
  - active instrument count
  - historical row count
  - snapshot row count
  - import error count
  - reconciliation count
  - reconciliation fail count
  - coverage rows
  - activity rows
  - legacy instrument rows
  - durable quality rows
  - latest daily update jobs
  - recent import errors
  - active stock rows
  - durable freshness rows
  - today price rows
  - today snapshot rows

Additional issue:

- [lib/admin-stock-import-dashboard.ts](/Users/amitbhawani/Documents/Ai%20FinTech%20Platform/lib/admin-stock-import-dashboard.ts) itself contains another large query fan-out and multiple `safeSelectRows(...)` bursts

High-risk over-fetching in this route:

- coverage rows: `.range(0, 25000)`
- active stocks: `.range(0, 4999)`
- freshness rows: `.range(0, 4999)`
- same-day history rows: `.range(0, 4999)`
- same-day snapshot rows: `.range(0, 4999)`
- recent activity rows: `200`

Conclusion:

- the control center is acting like a production monitoring query bundle, but it is being fully assembled on every page request
- it is the clearest localhost hotspot

## 4. `/stocks` Load Time

Observed time:

- `13.44s`

Primary data loader:

- [app/stocks/page.tsx](/Users/amitbhawani/Documents/Ai%20FinTech%20Platform/app/stocks/page.tsx)
- uses `getPublicStockDiscoveryStocks()`
- also loads `getGlobalSidebarRail("stocks")`

Main bottlenecks:

### 4.1 Full-universe canonical discovery read

[lib/content.ts](/Users/amitbhawani/Documents/Ai%20FinTech%20Platform/lib/content.ts) `getPublicStockDiscoveryStocks()` builds the stock hub from:

- `readCanonicalStockCatalogRows()` -> all active `stocks_master`
- `readPublicStockDiscoveryOverlayRows()`
- `readCanonicalStockSnapshotRows()`
- `getPublishedAdminManagedStockFallbackRecords()`

### 4.2 Snapshot over-fetch

`readCanonicalStockSnapshotRows()` currently does:

- `select("stock_id, source_name, snapshot_at, trade_date, price, change_percent")`
- orders the whole `stock_market_snapshot` table
- dedupes latest-by-stock in JavaScript

This is a major waste for listing pages.

### 4.3 CPU-heavy compare work

Inside [app/stocks/page.tsx](/Users/amitbhawani/Documents/Ai%20FinTech%20Platform/app/stocks/page.tsx):

- `showcaseSequence` calls `getTopRankedStockCompareCandidate(...)`
- `discoveryRows` maps over every stock and calls `getTopRankedStockCompareCandidate(...)` again

In [lib/compare-routing.ts](/Users/amitbhawani/Documents/Ai%20FinTech%20Platform/lib/compare-routing.ts), `getTopRankedStockCompareCandidate(...)` scans the whole stock list to score peers.

With `2157` stocks, that means:

- one route is effectively doing repeated full-list candidate scoring
- this is an O(n²) style CPU pattern on top of the database reads

### 4.4 Sidebar adds another loader

[components/global-sidebar-rail-server.tsx](/Users/amitbhawani/Documents/Ai%20FinTech%20Platform/components/global-sidebar-rail-server.tsx) calls [lib/shared-sidebar-config.ts](/Users/amitbhawani/Documents/Ai%20FinTech%20Platform/lib/shared-sidebar-config.ts), which loads launch config. This is probably not the main bottleneck, but it adds more server work to the route.

Conclusion:

- `/stocks` is slow because it is combining:
  - full-universe discovery fetch
  - full snapshot-table scan and JS dedupe
  - repeated compare scoring across the entire stock set

## 5. `/stocks/[slug]` Load Time

Observed time:

- `/stocks/reliance-industries` -> `15.90s`

Primary route:

- [app/stocks/[slug]/page.tsx](/Users/amitbhawani/Documents/Ai%20FinTech%20Platform/app/stocks/%5Bslug%5D/page.tsx)

Main bottlenecks:

### 5.1 Route loads both content-layer and normalized-data-layer reads

This route uses:

- `getStock(slug)` from [lib/content.ts](/Users/amitbhawani/Documents/Ai%20FinTech%20Platform/lib/content.ts)
- `getNormalizedStockDetailData(slug)` from [lib/stock-normalized-detail.ts](/Users/amitbhawani/Documents/Ai%20FinTech%20Platform/lib/stock-normalized-detail.ts)
- `getComparableStocks(slug)` from [lib/asset-insights.ts](/Users/amitbhawani/Documents/Ai%20FinTech%20Platform/lib/asset-insights.ts)

That means the route is mixing:

- canonical/public content resolution
- normalized finance-table detail assembly
- comparable-stock discovery

### 5.2 Duplicate identity work

[lib/stock-normalized-detail.ts](/Users/amitbhawani/Documents/Ai%20FinTech%20Platform/lib/stock-normalized-detail.ts) resolves canonical stock identity again with `resolveCanonicalStockBySlug(...)` even though `getStock(slug)` has already resolved route identity in the same page.

### 5.3 Very high normalized query fan-out

`getNormalizedStockDetailData(...)` performs:

- canonical resolver call
- `stocks_master` read
- then a `Promise.all(...)` of `20` more table reads:
  - `stock_company_profile`
  - `stock_market_snapshot`
  - `stock_valuation_metrics`
  - `stock_financial_highlights`
  - `stock_performance_metrics`
  - `stock_growth_metrics`
  - `stock_health_ratios`
  - `stock_riddra_scores`
  - `stock_price_history`
  - annual income statement
  - quarterly income statement
  - annual balance sheet
  - quarterly balance sheet
  - annual cash flow
  - quarterly cash flow
  - dividends
  - splits
  - holders summary
  - holders detail
  - news

That is at least `21+` durable reads inside this one loader before counting route-content helpers.

### 5.4 Detail route also pulls comparable stocks from the full discovery universe

[lib/asset-insights.ts](/Users/amitbhawani/Documents/Ai%20FinTech%20Platform/lib/asset-insights.ts) `getComparableStocks(...)` calls `getPublicStockDiscoveryStocks()` again, so the detail page also depends on the heavy discovery catalog.

Conclusion:

- stock detail is slow because it assembles nearly the whole product page data graph in one request
- it also duplicates canonical identity work and relies on the same heavy discovery universe for comparable stocks

## 6. Supabase Query Count Per Route

These are route-level estimates from code inspection, not database trace logs.

### `/admin/market-data/import-control-center`

Estimated query groups:

- `1` large dashboard helper call
- `17` additional direct count/select groups in `Promise.all`
- nested dashboard helper fan-out adds many more reads

Estimated impact:

- this is likely the highest Supabase query count among the audited routes

### `/stocks`

Estimated query groups:

- `readCanonicalStockCatalogRows()` -> `1`
- `readPublicStockDiscoveryOverlayRows()` -> about `2`
- `readCanonicalStockSnapshotRows()` -> `1`
- `getPublishedAdminManagedStockFallbackRecords()` -> `1`
- launch/sidebar config -> about `1`

Estimated total:

- about `5-6+` durable reads, plus expensive in-memory CPU over all stocks

### `/stocks/[slug]`

Estimated query groups:

- `getStock(slug)` path -> several reads depending on fallback/canonical path
- `getNormalizedStockDetailData(slug)` -> `21+`
- `getComparableStocks(slug)` -> full discovery universe loader
- sidebar config -> about `1`

Estimated total:

- roughly `25+` reads, depending on cache hits and canonical fallback behavior

### `/sitemap.xml`

Estimated query groups:

- launch config
- admin operator store
- public stock discovery slugs
- admin fallback records
- then per-slug SEO policy resolution in JS

Main issue:

- not many per-stock DB calls, but still a large full-universe slug load and policy loop

## 7. Duplicate Queries

Confirmed or likely duplicate work:

- `resolveCanonicalStockBySlug(...)` is effectively repeated across route content and normalized detail assembly
- `getPublicStockDiscoveryStocks()` is reused by:
  - `/stocks`
  - comparable stock section on stock detail
  - search suggestions
  - smart search
  - search document builders
- control center loads dashboard data, then separately loads many of the same stock/import/freshness/error surfaces again

Consequence:

- even with caching, dev-mode `noStore()` and short timed caches still leave a lot of request-time work

## 8. Slow Server Components

Main slow server components or server loaders:

- [app/admin/market-data/import-control-center/page.tsx](/Users/amitbhawani/Documents/Ai%20FinTech%20Platform/app/admin/market-data/import-control-center/page.tsx)
- [app/stocks/page.tsx](/Users/amitbhawani/Documents/Ai%20FinTech%20Platform/app/stocks/page.tsx)
- [app/stocks/[slug]/page.tsx](/Users/amitbhawani/Documents/Ai%20FinTech%20Platform/app/stocks/%5Bslug%5D/page.tsx)

Main slow helpers under them:

- [lib/admin-import-control-center.ts](/Users/amitbhawani/Documents/Ai%20FinTech%20Platform/lib/admin-import-control-center.ts)
- [lib/admin-stock-import-dashboard.ts](/Users/amitbhawani/Documents/Ai%20FinTech%20Platform/lib/admin-stock-import-dashboard.ts)
- [lib/content.ts](/Users/amitbhawani/Documents/Ai%20FinTech%20Platform/lib/content.ts)
- [lib/stock-normalized-detail.ts](/Users/amitbhawani/Documents/Ai%20FinTech%20Platform/lib/stock-normalized-detail.ts)
- [lib/compare-routing.ts](/Users/amitbhawani/Documents/Ai%20FinTech%20Platform/lib/compare-routing.ts)

## 9. Expensive Cached Helpers

Caching exists, but the helpers are still expensive enough that localhost feels slow:

- [lib/content.ts](/Users/amitbhawani/Documents/Ai%20FinTech%20Platform/lib/content.ts)
  - `getPublicStockDiscoveryStocks()`
  - `getPublicStockDiscoverySlugs()`
  - `getPublicStocks()`
  - `getStock()`
- [lib/stock-normalized-detail.ts](/Users/amitbhawani/Documents/Ai%20FinTech%20Platform/lib/stock-normalized-detail.ts)
  - `getNormalizedStockDetailData(...)`
- [lib/admin-import-control-center.ts](/Users/amitbhawani/Documents/Ai%20FinTech%20Platform/lib/admin-import-control-center.ts)
  - `getAdminImportControlCenterData(...)`

Why cache is not enough right now:

- many paths call `noStore()`
- timed caches are short-lived
- helper payload assembly is still large
- dev mode makes cache benefits less consistent than production

## 10. Sitemap / Search / Catalog Loaders Accidentally Running During Page Load

Findings:

- no evidence that sitemap generation is directly running during `/stocks` or `/stocks/[slug]` page render
- no evidence that search-suggestion or smart-search handlers are directly invoked by those routes on the server side

However:

- the same heavy canonical stock discovery loader is shared by listing, detail compare sections, search suggestions, smart search, and search document builders
- so while the search route itself is not accidentally loading during stock page render, the shared catalog cost is spreading across many unrelated surfaces

Conclusion:

- this is more of a shared-loader design problem than an accidental route-calls-route problem

## 11. Meilisearch Status Checks

Confirmed:

- [lib/search-suggestions.ts](/Users/amitbhawani/Documents/Ai%20FinTech%20Platform/lib/search-suggestions.ts) calls `getSearchEngineStatus()`
- [lib/smart-search.ts](/Users/amitbhawani/Documents/Ai%20FinTech%20Platform/lib/smart-search.ts) calls `getSearchEngineStatus()`
- [lib/search-engine/meilisearch.ts](/Users/amitbhawani/Documents/Ai%20FinTech%20Platform/lib/search-engine/meilisearch.ts) caches status for `15s`

Current effect:

- Meilisearch checks are relevant to search/suggestions latency
- they do not appear to be the primary cause of `/stocks` or `/stocks/[slug]` slowness

Observed supporting evidence:

- suggestions route is very slow at `14.14s`
- stock listing and stock detail are also very slow even without Meilisearch as a primary dependency

## 12. API Calls Blocking Rendering

For the routes audited here:

- I did not find internal app API fetches as the main blocker
- most slowness is happening inside server components and server-side helper functions hitting Supabase directly

Exception:

- search suggestions route itself is an API route and is slow because it does:
  - search engine status check
  - stock/fund/IPO graph loading
  - public route filtering
  - catalog/local fallback work

## 13. Console / Server Errors

Direct runtime console capture was not available from this thread because no dev terminal was attached.

But code inspection shows many warning/error paths that could flood dev logs:

- [lib/stock-normalized-detail.ts](/Users/amitbhawani/Documents/Ai%20FinTech%20Platform/lib/stock-normalized-detail.ts)
  - multiple `console.error(...)` durable-read failure paths
- [lib/content.ts](/Users/amitbhawani/Documents/Ai%20FinTech%20Platform/lib/content.ts)
  - many `logPublicContentReadWarning(...)` calls
- [lib/admin-import-control-center.ts](/Users/amitbhawani/Documents/Ai%20FinTech%20Platform/lib/admin-import-control-center.ts)
  - wrapped with `withDevelopmentTiming(...)`

Interpretation:

- if Supabase reads are degraded or missing tables exist in any environment, dev logs can become noisy
- log noise itself is not the main latency cause, but it can make diagnosis harder

## Root Causes Ranked

1. `getAdminImportControlCenterData(...)` query burst and nested dashboard aggregation.
2. `getPublicStockDiscoveryStocks()` building a full stock universe for too many surfaces.
3. `readCanonicalStockSnapshotRows()` over-fetching the full snapshot table and deduping in memory.
4. `/stocks` page compare-candidate CPU work across the full 2157-stock universe.
5. `/stocks/[slug]` normalized detail fan-out across 20+ finance tables.
6. repeated canonical resolution and duplicated identity/data work between stock-content and normalized-detail layers.
7. search/suggestions doing both Meilisearch status checks and full discovery graph loading.

## Immediate Safe Recommendations

These are the next fixes that should happen after this audit:

1. Split the control center into a lean above-the-fold summary and lazy-load the heavy tables.
2. Replace `readCanonicalStockSnapshotRows()` with a latest-per-stock query strategy instead of full-table scan plus JS dedupe.
3. Stop recomputing top compare candidates for every stock on `/stocks` during one request.
4. Stop resolving canonical stock identity twice on stock detail pages.
5. Trim `getNormalizedStockDetailData(...)` so the first render does not fetch every optional section unconditionally.
6. Build slimmer stock discovery projections for:
   - listing
   - sitemap
   - compare candidates
   - search/suggestions
7. Add one fresh-server startup/compile audit with attached terminal logs.

## Final Assessment

Localhost is slow mainly because the server is doing too much real work per request, not because the browser is slow.

Current emergency status:

- app availability: working
- server-side route performance: poor
- primary hotspot: import control center
- secondary hotspots: canonical stock discovery, stock detail normalized fan-out, compare CPU cost

No large behavior changes were made in this audit pass. This document is the evidence base for the next targeted optimization round.
