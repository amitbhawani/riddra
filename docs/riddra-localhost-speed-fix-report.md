# Riddra Localhost Speed Fix Report

Date: April 30, 2026  
Scope: targeted localhost and page-speed fixes based on `docs/riddra-localhost-performance-emergency-audit.md`

## Summary

This pass focused on the three routes that were hurting localhost most:

- `/admin/market-data/import-control-center`
- `/stocks`
- `/stocks/reliance-industries`

The highest-impact fixes were:

1. stop blocking the stock detail route on normalized-data reads that were already rendering client-only
2. stop blocking the stock detail route on per-peer stock/chart lookup bursts
3. stop building the full 2157-stock discovery universe for the first `/stocks` page render
4. stop loading the full heavy import-control-center diagnostics bundle on first render
5. keep heavy diagnostics reachable, but defer them off the critical first-page load path

## Files Changed

- [lib/content.ts](/Users/amitbhawani/Documents/Ai%20FinTech%20Platform/lib/content.ts)
- [app/stocks/page.tsx](/Users/amitbhawani/Documents/Ai%20FinTech%20Platform/app/stocks/page.tsx)
- [app/stocks/[slug]/page.tsx](/Users/amitbhawani/Documents/Ai%20FinTech%20Platform/app/stocks/%5Bslug%5D/page.tsx)
- [components/stock-normalized-data-sections.tsx](/Users/amitbhawani/Documents/Ai%20FinTech%20Platform/components/stock-normalized-data-sections.tsx)
- [components/test-stock-detail-page.tsx](/Users/amitbhawani/Documents/Ai%20FinTech%20Platform/components/test-stock-detail-page.tsx)
- [app/api/stocks/[slug]/normalized/route.ts](/Users/amitbhawani/Documents/Ai%20FinTech%20Platform/app/api/stocks/%5Bslug%5D/normalized/route.ts)
- [lib/admin-import-control-center.ts](/Users/amitbhawani/Documents/Ai%20FinTech%20Platform/lib/admin-import-control-center.ts)
- [app/admin/market-data/import-control-center/page.tsx](/Users/amitbhawani/Documents/Ai%20FinTech%20Platform/app/admin/market-data/import-control-center/page.tsx)

## What Changed

### 1. `/stocks` now uses a lean paginated loader

Added `getPublicStockDiscoveryPage(page, pageSize)` in [lib/content.ts](/Users/amitbhawani/Documents/Ai%20FinTech%20Platform/lib/content.ts).

This route now:

- reads only one page of canonical stocks from `stocks_master`
- fetches snapshots only for the visible stock ids
- caches per page window
- avoids loading the full `2157` stock catalog just to render the first screen
- paginates the public stock hub with next/previous page controls

### 2. `/stocks/[slug]` no longer blocks on normalized server reads

The normalized data sections were already client-only, but the page was still doing all normalized server reads up front.

Changed:

- [app/stocks/[slug]/page.tsx](/Users/amitbhawani/Documents/Ai%20FinTech%20Platform/app/stocks/%5Bslug%5D/page.tsx) now passes `normalizedData={null}` on first render
- [components/stock-normalized-data-sections.tsx](/Users/amitbhawani/Documents/Ai%20FinTech%20Platform/components/stock-normalized-data-sections.tsx) now fetches normalized data client-side from:
  - [app/api/stocks/[slug]/normalized/route.ts](/Users/amitbhawani/Documents/Ai%20FinTech%20Platform/app/api/stocks/%5Bslug%5D/normalized/route.ts)

This removes the large server-side fan-out from the initial HTML request.

### 3. `/stocks/[slug]` no longer does peer stock/chart N+1 work on first render

Removed from the initial server path:

- comparable stock lookup burst
- per-peer `getStock(...)`
- per-peer `getStockChartSnapshot(...)`
- durable fund-holding snapshot scan for mutual-fund owners

This keeps the detail route focused on the primary stock page render first.

### 4. Import Control Center now loads in overview mode first

Added `getAdminImportControlCenterOverviewData()` in [lib/admin-import-control-center.ts](/Users/amitbhawani/Documents/Ai%20FinTech%20Platform/lib/admin-import-control-center.ts).

The page now:

- skips the heaviest dashboard-style diagnostics on first load
- uses durable summary tables and recent rows instead of loading the full diagnostics bundle
- keeps heavy drill-down work deferred
- explicitly warns that deep diagnostics are deferred for responsiveness

This was the biggest admin-page speed win.

## Before / After Timings

### Baseline from the emergency audit

| Route | Before |
|---|---:|
| `/admin/market-data/import-control-center` | `13.16s` |
| `/stocks` | `13.44s` |
| `/stocks/reliance-industries` | `15.90s` |

### First-hit timings right after the code changes

These still include local dev compile / hot-reload overhead:

| Route | First Hit After Change |
|---|---:|
| `/admin/market-data/import-control-center` | `5.60s` |
| `/stocks` | `4.96s` |
| `/stocks/reliance-industries` | `5.92s` |

### Warm localhost timings

After the first compile-heavy hit, the same routes measured:

| Route | Warm After |
|---|---:|
| `/admin/market-data/import-control-center` | `1.11s` |
| `/stocks` | `0.56s` |
| `/stocks/reliance-industries` | `1.54s` |

## Result Against Targets

Target:

- `/admin/market-data/import-control-center` under `3s` locally
- `/stocks` under `3s` locally
- `/stocks/reliance-industries` under `3s` locally

Result:

- warm localhost target: **met**
- first-hit-after-compile target: **not fully met**

Important interpretation:

- route data-loading cost was the real emergency, and that has been cut sharply
- the remaining slower first hit is mainly local dev compile / hot-reload overhead, not the same server data bottleneck that was dominating before

## Validation

- `npm run lint` -> PASS
- `npx tsc --noEmit` -> PASS

## Remaining Notes

1. The normalized stock sections now load after the page shell instead of blocking the first HTML response. That is intentional.
2. The stock listing page is now paginated to avoid first-render full-universe catalog work.
3. The import control center now prioritizes executive summary data on first load and defers deep diagnostics.
4. If we want first-hit localhost times below `3s` consistently after a fresh restart, the next step is a separate dev-server compile audit and possibly more route-level code-splitting around large admin/client bundles.

## Final Assessment

This pass fixed the route-level localhost slowdown that was coming from oversized server-side data assembly.

Most important outcome:

- the three target routes now render under `3s` on warm localhost
- the app no longer blocks those pages on full-universe or full-detail background data that can safely be deferred
