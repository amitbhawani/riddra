# Riddra Stock Listing Performance Optimization Report

Last updated: 2026-04-30

## Scope

This pass optimized the canonical-first public stock discovery surfaces without changing public route behavior:

- `/stocks`
- `/sitemap.xml`
- shared stock-route discovery used by search/index filtering

The stock detail route logic was not migrated again in this pass; it was only revalidated.

## What changed

### 1. Lean canonical discovery path for listing and sitemap

Added a shared lean stock discovery/catalog path in [lib/content.ts](/Users/amitbhawani/Documents/Ai%20FinTech%20Platform/lib/content.ts):

- `getPublicStockDiscoveryStocks()`
- `getPublicStockDiscoverySlugs()`

This path:

- reads a lean `stocks_master` projection
- batches latest snapshot rows from `stock_market_snapshot`
- overlays legacy `instruments`/CMS data only where needed
- preserves canonical-only stock visibility
- avoids the richer durable fundamentals/shareholding/archive enrichment used by the older `getPublicStocks()` path

### 2. Listing, sitemap, and search-route helpers now share the lean path

Updated:

- [app/stocks/page.tsx](/Users/amitbhawani/Documents/Ai%20FinTech%20Platform/app/stocks/page.tsx)
- [app/sitemap.ts](/Users/amitbhawani/Documents/Ai%20FinTech%20Platform/app/sitemap.ts)
- [lib/public-search-routes.ts](/Users/amitbhawani/Documents/Ai%20FinTech%20Platform/lib/public-search-routes.ts)
- [lib/search-engine/documents.ts](/Users/amitbhawani/Documents/Ai%20FinTech%20Platform/lib/search-engine/documents.ts)
- [lib/search-index-registry.ts](/Users/amitbhawani/Documents/Ai%20FinTech%20Platform/lib/search-index-registry.ts)
- [lib/smart-search.ts](/Users/amitbhawani/Documents/Ai%20FinTech%20Platform/lib/smart-search.ts)
- [lib/search-suggestions.ts](/Users/amitbhawani/Documents/Ai%20FinTech%20Platform/lib/search-suggestions.ts)

So these surfaces no longer rebuild the richer full stock catalog independently.

### 3. Cached reuse for canonical stock discovery

The lean discovery catalog and slug set now reuse timed caches:

- `publicStockDiscoveryCache`
- `publicStockRouteSlugCache`

Admin invalidation already clears both caches through the existing content cache invalidation flow.

### 4. Removed one major `/stocks` CPU hotspot

Updated [lib/compare-routing.ts](/Users/amitbhawani/Documents/Ai%20FinTech%20Platform/lib/compare-routing.ts) and [app/stocks/page.tsx](/Users/amitbhawani/Documents/Ai%20FinTech%20Platform/app/stocks/page.tsx) to stop sorting the full stock universe once per row just to find the top compare candidate.

New helper:

- `getTopRankedStockCompareCandidate()`

This keeps the same scoring model, but replaces repeated full-array sort work with a single-pass best-candidate scan.

## Before vs after

Baseline from the earlier audit in [docs/riddra-canonical-stock-performance-audit.md](/Users/amitbhawani/Documents/Ai%20FinTech%20Platform/docs/riddra-canonical-stock-performance-audit.md):

- `/stocks` -> about `34.0s`
- `/sitemap.xml` -> about `9.3s`
- `/stocks/reliance-industries` -> about `37.3s`
- `/stocks/20-microns-limited` -> about `37.5s`

Post-change validation on a fresh local dev server (`http://127.0.0.1:3011`):

- isolated `/stocks` -> `200`, about `39.46s`
- isolated `/sitemap.xml` -> `200`, about `1.71s`
- `/stocks/reliance-industries` -> `200`, about `45.15s`
- `/stocks/20-microns-limited` -> `200`, about `45.01s`

## Interpretation

### Clear improvement

- `/sitemap.xml` materially improved.
- The sitemap now benefits directly from the lean canonical slug source and no longer needs the older heavier stock route slug assembly path.

### Partial improvement only

- `/stocks` now uses the lean catalog and avoids the old rich stock discovery fetch path.
- However, the route is still slow overall because of broader application-code work on the page, not only because of stock-catalog fetching.

### Why `/stocks` is still slow

Dev timing logs showed the remaining bottleneck is still dominated by route-level application work and other shared layout/rail data fetches, not only by stock discovery:

- large shared CMS/admin-driven rail/module reads
- full latest-snapshot batching from `stock_market_snapshot`
- remaining stock hub rendering logic across the full `2157` stock universe

The canonical discovery optimization reduced over-fetching and duplicated stock-catalog work, but it did not fully solve the broader page workload.

## Public behavior preserved

Confirmed:

- legacy URLs still work
- canonical-only stock routes still work
- search-route filtering still includes canonical stock routes
- sitemap still includes canonical stock slugs

## Validation

- `npm run lint` -> PASS
- `npx tsc --noEmit` -> PASS
- `GET /stocks` -> `200`
- `GET /sitemap.xml` -> `200`
- `GET /stocks/reliance-industries` -> `200`
- `GET /stocks/20-microns-limited` -> `200`

## Remaining bottlenecks

The next highest-impact follow-up would be:

1. slim down `/stocks` shared rail/module data so stock hub requests do not pay for unrelated admin-style content fetches
2. batch or cache stock hub secondary calculations more aggressively
3. consider a lighter stock hub variant that does not require full-card compare/truth context for all `2157` rows on first response

## Files changed

- [lib/content.ts](/Users/amitbhawani/Documents/Ai%20FinTech%20Platform/lib/content.ts)
- [lib/compare-routing.ts](/Users/amitbhawani/Documents/Ai%20FinTech%20Platform/lib/compare-routing.ts)
- [app/stocks/page.tsx](/Users/amitbhawani/Documents/Ai%20FinTech%20Platform/app/stocks/page.tsx)
- [app/sitemap.ts](/Users/amitbhawani/Documents/Ai%20FinTech%20Platform/app/sitemap.ts)
- [lib/public-search-routes.ts](/Users/amitbhawani/Documents/Ai%20FinTech%20Platform/lib/public-search-routes.ts)
- [lib/search-engine/documents.ts](/Users/amitbhawani/Documents/Ai%20FinTech%20Platform/lib/search-engine/documents.ts)
- [lib/search-index-registry.ts](/Users/amitbhawani/Documents/Ai%20FinTech%20Platform/lib/search-index-registry.ts)
- [lib/smart-search.ts](/Users/amitbhawani/Documents/Ai%20FinTech%20Platform/lib/smart-search.ts)
- [lib/search-suggestions.ts](/Users/amitbhawani/Documents/Ai%20FinTech%20Platform/lib/search-suggestions.ts)
