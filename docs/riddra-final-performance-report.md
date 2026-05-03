# Riddra Final Performance Report

Last updated: 2026-04-30

## Scope

This final pass focused on the canonical-first public stock discovery surfaces and their shared helpers:

- `/stocks`
- `/stocks/[slug]`
- `/sitemap.xml`
- search page and suggestions latency

The goal was to reduce repeated Supabase work, remove remaining N+1-style compare calculations, trim unnecessary discovery reads, and keep public behavior unchanged.

## What changed

### 1. Removed repeated full-universe compare sorting

Updated [lib/compare-routing.ts](/Users/amitbhawani/Documents/Ai%20FinTech%20Platform/lib/compare-routing.ts):

- added cached stock slug indexing with `WeakMap`
- added cached top compare-candidate lookup for the common no-exclude path
- replaced sort-heavy small-limit ranking with bounded in-memory insertion for top candidates

Impact:

- `/stocks` no longer pays repeated full-array sort costs while building showcase routes, compare pairs, and per-row compare labels
- stock detail comparable-stock lookups reuse the faster ranking path

### 2. Slimmed the slug-only discovery path

Updated [lib/content.ts](/Users/amitbhawani/Documents/Ai%20FinTech%20Platform/lib/content.ts):

- added `buildPublicStockDiscoverySlugs()`
- `getPublicStockDiscoverySlugs()` no longer builds the richer discovery-stock payload just to extract slugs
- sitemap/search-filter slug reads now use canonical `stocks_master` slugs plus admin fallback slugs only

Impact:

- `/sitemap.xml`
- route filtering in public search helpers

This removed unnecessary overlay work from slug-only surfaces.

### 3. Reduced detail-page comparable-stock cost

Updated [lib/asset-insights.ts](/Users/amitbhawani/Documents/Ai%20FinTech%20Platform/lib/asset-insights.ts):

- `getComparableStocks()` now uses the lighter `getPublicStockDiscoveryStocks()` source instead of the richer `getPublicStocks()` universe

Impact:

- `/stocks/[slug]` comparable-stock sidebar resolves faster
- main stock detail content path stays unchanged

### 4. Reduced repeated search-route filtering

Updated:

- [lib/search-suggestions.ts](/Users/amitbhawani/Documents/Ai%20FinTech%20Platform/lib/search-suggestions.ts)
- [lib/smart-search.ts](/Users/amitbhawani/Documents/Ai%20FinTech%20Platform/lib/smart-search.ts)

Changes:

- combined direct-intent, compare-intent, and ranked entries before route filtering
- filtered once instead of repeating the same public-route gate multiple times

Impact:

- lower search/suggestion overhead
- less repeated canonical-slug lookup work

### 5. Added short-lived Meilisearch status caching

Updated [lib/search-engine/meilisearch.ts](/Users/amitbhawani/Documents/Ai%20FinTech%20Platform/lib/search-engine/meilisearch.ts):

- added a `15s` in-process cache for `getSearchEngineStatus()`

Impact:

- search page and suggestion API no longer pay a full Meilisearch health/status round-trip on every request
- fallback behavior is unchanged

## Timings

All final timings below were measured in isolation on `http://127.0.0.1:3000` after the dev server was healthy, with one endpoint requested at a time to avoid contention noise.

### Before

Most recent reliable prior benchmarks from [docs/riddra-stock-listing-performance-optimization-report.md](/Users/amitbhawani/Documents/Ai%20FinTech%20Platform/docs/riddra-stock-listing-performance-optimization-report.md):

- `/stocks` -> about `39.46s`
- `/stocks/reliance-industries` -> about `45.15s`
- `/sitemap.xml` -> about `1.71s`

Search and suggestion routes were not benchmarked cleanly in that earlier pass, so this report establishes their first isolated baseline after the new helper changes.

### After

- `/stocks` -> `200`, `4.47s`
- `/stocks/reliance-industries` -> `200`, `5.82s`
- `/sitemap.xml` -> `200`, `1.87s`
- `/api/search/suggestions?query=reliance&limit=8` -> `200`, `2.98s`
- `/search?query=reliance` -> `200`, `3.64s`

## Interpretation

### Big improvement

- `/stocks` improved from roughly `39.46s` to `4.47s`
- `/stocks/[slug]` improved from roughly `45.15s` to `5.82s`

Those two routes benefited most from:

- faster compare-candidate computation
- less reuse of the heavier public stock universe where it was not needed
- less repeated discovery/helper work

### Stable

- `/sitemap.xml` remained in the same practical range as the earlier optimized sitemap run
- final isolated timing was `1.87s`, which is close to the earlier `1.71s`

### Search is now materially more predictable

- suggestion latency settled at about `2.98s`
- full search page latency settled at about `3.64s`

This pass did not completely redesign search-source assembly, but it removed repeated route filtering and added Meilisearch status caching, which made the behavior notably steadier.

## Remaining bottlenecks

The largest remaining performance costs are now outside the specific hot spots fixed here:

1. `/stocks` still renders a very large `2157`-stock discovery surface in one response.
2. `/stocks/[slug]` still does a fairly rich page assembly path with research, sidebar, chart, and normalized-data helpers.
3. Search still builds asset context from multiple content families in one request.

If we want another step-change later, the next safest targets would be:

1. paginate or window the `/stocks` discovery surface
2. introduce a leaner search source graph cache across stocks/funds/IPOs
3. trim sidebar/secondary modules on stock detail for first response

## Files changed

- [lib/compare-routing.ts](/Users/amitbhawani/Documents/Ai%20FinTech%20Platform/lib/compare-routing.ts)
- [lib/content.ts](/Users/amitbhawani/Documents/Ai%20FinTech%20Platform/lib/content.ts)
- [lib/asset-insights.ts](/Users/amitbhawani/Documents/Ai%20FinTech%20Platform/lib/asset-insights.ts)
- [lib/search-suggestions.ts](/Users/amitbhawani/Documents/Ai%20FinTech%20Platform/lib/search-suggestions.ts)
- [lib/smart-search.ts](/Users/amitbhawani/Documents/Ai%20FinTech%20Platform/lib/smart-search.ts)
- [lib/search-engine/meilisearch.ts](/Users/amitbhawani/Documents/Ai%20FinTech%20Platform/lib/search-engine/meilisearch.ts)

## Validation

- `npm run lint` -> PASS
- `npx tsc --noEmit` -> PASS
- `GET /stocks` -> `200`
- `GET /stocks/reliance-industries` -> `200`
- `GET /sitemap.xml` -> `200`
- `GET /api/search/suggestions?query=reliance&limit=8` -> `200`
- `GET /search?query=reliance` -> `200`
