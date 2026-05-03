# Riddra Canonical Stock Performance Audit

Last updated: 2026-04-30  
Scope: audit only, no behavior changes in this step  
Focus: canonical-first stock discovery and route system

## Audited surfaces

- `/stocks`
- `/sitemap.xml`
- `/stocks/[slug]`
- `lib/content.ts`
- `lib/public-search-routes.ts`
- `lib/search-engine/documents.ts`
- `lib/smart-search.ts`
- `lib/search-suggestions.ts`
- `lib/asset-insights.ts`
- `app/compare/stocks/[left]/[right]/page.tsx`

## Executive summary

The canonical-first migration is functionally correct, but it is currently expensive because the system now does all of these at once:

1. loads the full active `stocks_master` universe
2. loads the legacy/publishable stock catalog too
3. enriches the canonical universe with quote snapshots, fundamentals, shareholding, and source-entry overlays
4. recomputes public stock route slug sets repeatedly for sitemap and search filters
5. uses the fully enriched public stock catalog in places that only need ids/slugs/titles

The result is correctness with high latency.

### Observed route timing from live local verification

From the fresh local validation server used during the migration check:

- `/stocks` -> `200` in about `34.0s`
- `/stocks/reliance-industries` -> `200` in about `37.3s`
- `/stocks/20-microns-limited` -> `200` in about `37.5s`
- `/sitemap.xml` -> `200` in about `9.3s`

This is far above acceptable response time for both localhost and production-first render.

## 1. Slow queries

## Primary slow query cluster

The most expensive query family is in `getPublicStocks()` in [lib/content.ts](/Users/amitbhawani/Documents/Ai%20FinTech%20Platform/lib/content.ts).

It currently does:

- full active `stocks_master` read:
  - `select id, slug, symbol, company_name, yahoo_symbol, exchange, status`
  - ordered by `company_name`
- full legacy `getStocks()` call in parallel
- full durable quote snapshot read for every canonical slug
- full durable fundamentals/shareholding overlays across the whole canonical seed set
- full source-entry close overlay
- merge and sort of the entire resulting stock list

### Why it is slow

- `stocks_master` now contains `2157` active stocks
- the quote snapshot enrichment uses a very large slug set
- the enrichment path is designed for user-facing richness, not lightweight catalog discovery
- the legacy branch is still loaded even though most canonical stocks are not legacy-backed

## Slow query evidence from dev logs

Observed during the route validation run:

- `stocks_master ... status=eq.active ... order=company_name.asc` took about `1.09s` and `1.23s`
- very large `market_series_status` and `stock_quote_history` `in (...)` requests were emitted with thousands of slugs
- `/stocks` and `/stocks/[slug]` finished only after roughly `31s+` of application code time

So the bottleneck is not only one table read. It is the total composition cost of the canonical catalog plus downstream enrichment.

## 2. Repeated Supabase calls

## Repeated full-catalog calls

### `getPublicStocks()`

Used in:

- [app/stocks/page.tsx](/Users/amitbhawani/Documents/Ai%20FinTech%20Platform/app/stocks/page.tsx)
- [lib/search-engine/documents.ts](/Users/amitbhawani/Documents/Ai%20FinTech%20Platform/lib/search-engine/documents.ts)
- [lib/smart-search.ts](/Users/amitbhawani/Documents/Ai%20FinTech%20Platform/lib/smart-search.ts)
- [lib/search-suggestions.ts](/Users/amitbhawani/Documents/Ai%20FinTech%20Platform/lib/search-suggestions.ts)
- [lib/asset-insights.ts](/Users/amitbhawani/Documents/Ai%20FinTech%20Platform/lib/asset-insights.ts)
- [app/compare/stocks/[left]/[right]/page.tsx](/Users/amitbhawani/Documents/Ai%20FinTech%20Platform/app/compare/stocks/%5Bleft%5D/%5Bright%5D/page.tsx)

This means the same heavy full-universe load is now used for:

- listing
- search document builds
- live smart search
- live search suggestions
- compare candidate generation
- compare pages

### `getPublicStockRouteSlugs()`

Used in:

- [app/sitemap.ts](/Users/amitbhawani/Documents/Ai%20FinTech%20Platform/app/sitemap.ts)
- [lib/public-search-routes.ts](/Users/amitbhawani/Documents/Ai%20FinTech%20Platform/lib/public-search-routes.ts)

And `getPublicStockRouteSlugs()` itself does:

- `readCanonicalStockCatalogRows()`
- `getStocks()`

That means search filtering and sitemap generation still pay for the old legacy stock catalog path even when they only need a deduped slug set.

## Repeated legacy catalog calls inside canonical mode

`getPublicStocks()` still calls `getStocks()` unconditionally.

That means every canonical-first public catalog call also pays for:

- `getPublishableCmsRecords("stock")`
- `readStockCatalogSourceRows(...)`
- durable snapshot reads for the legacy stock slugs
- durable fundamentals/shareholding/source-close enrichment on the legacy stock set

This is correct functionally, but expensive when the caller only wants canonical listing breadth.

## 3. Over-fetching from `stocks_master`

## Over-fetching by surface type

### Listing and sitemap need much less than they fetch

#### `/stocks`

The stock listing page needs:

- slug
- name
- symbol
- sector
- lightweight quote/snapshot state
- maybe a few headline stats

But `getPublicStocks()` builds the full `StockSnapshot` object for all `2157` stocks, including:

- summary/thesis/key points
- placeholder fundamentals arrays
- shareholding arrays
- snapshot meta
- merged legacy overlays

#### `/sitemap.xml`

The sitemap only needs:

- slug
- maybe last modified

But `getPublicStockRouteSlugs()` still pays for:

- full canonical stock row load
- full legacy `getStocks()` load

### Search surfaces also over-fetch

`lib/search-engine/documents.ts`, `lib/smart-search.ts`, and `lib/search-suggestions.ts` use `getPublicStocks()`, which means they pull the full enriched stock catalog when they mostly need:

- slug
- name
- symbol
- sector
- short summary

This is one of the clearest mismatches between data shape and usage.

## 4. Expensive enrichment joins

## Full-universe enrichment on every canonical catalog build

Inside `getPublicStocks()`, the canonical seed list is pushed through:

- `getDurableStockQuoteSnapshots(canonicalSlugs)`
- `applyDurableStockFundamentals(...)`
- `applyDurableStockShareholding(...)`
- `applySourceEntryStockCloses(...)`

This is useful for rich stock pages, but expensive for:

- stock listings
- search registry
- search suggestions
- sitemap-safe route filtering
- compare candidate discovery

## Legacy catalog enrichment is also repeated

Because `getPublicStocks()` merges `getStocks()`, the older publishable-stock path still adds:

- legacy source row joins from `instruments`, `companies`, `stock_pages`
- legacy durable quote enrichment
- legacy durable fundamentals/shareholding overlays
- admin fallback stock rows

So the canonical path currently includes both:

- canonical enrichment cost
- legacy enrichment cost

## 5. Sitemap generation bottlenecks

The main sitemap bottleneck is in [app/sitemap.ts](/Users/amitbhawani/Documents/Ai%20FinTech%20Platform/app/sitemap.ts).

### Current flow

It loads:

- launch config
- admin operator store
- canonical stock route slugs
- admin stock fallback records

Then for every merged stock slug it does:

- `resolveSeoRoutePolicy(...)`

### Bottlenecks

1. `getPublicStockRouteSlugs()` still calls `getStocks()`
2. `getAdminOperatorStore()` is a large admin data load for a public sitemap route
3. policy evaluation runs per stock slug across the full merged set

### Observed result

- `/sitemap.xml` returned `200`
- but still took about `9.3s`

That is much faster than `/stocks`, but still expensive for a route that should ideally be lightweight and cache-friendly.

## 6. Search / index duplication risk

There is no obvious final-output duplication of the 22 overlapping stocks now, because:

- `getPublicStocks()` merges by slug with a `Map`
- `filterEntriesToPublicSearchRoutes()` filters by href
- search/suggestion combiners dedupe by href

### But there is still duplicated work

Even if the final result is deduped, the system still duplicates upstream work:

- canonical stock route slugs are loaded
- legacy stock catalog is loaded
- publishable route href filtering still runs
- canonical stock route allowance is checked afterward

So the duplication problem is now more about compute and query volume than duplicate user-visible records.

## 7. N+1 query patterns

## `/stocks/[slug]` similar assets section

In [app/stocks/[slug]/page.tsx](/Users/amitbhawani/Documents/Ai%20FinTech%20Platform/app/stocks/%5Bslug%5D/page.tsx), this block is a true N+1 pattern:

- it first gets `comparableStocks`
- then for each peer, it runs:
  - `getStock(peer.slug)`
  - `getStockChartSnapshot(peer.slug)`

That means up to 6 peers can trigger:

- 6 stock detail loads
- 6 chart snapshot loads

on top of the main page load.

## Compare routes can repeat full-catalog work

In [app/compare/stocks/[left]/[right]/page.tsx](/Users/amitbhawani/Documents/Ai%20FinTech%20Platform/app/compare/stocks/%5Bleft%5D/%5Bright%5D/page.tsx):

- `getPublicStocks()`
- `getStockComparePair(left, right)` -> calls `getStock(left)` and `getStock(right)`
- `getStockCompareCandidates(left, ...)` -> loads `getPublicStocks()`
- `getStockCompareCandidates(right, ...)` -> loads `getPublicStocks()`

React `cache()` may reduce duplicate recomputation inside one render tree, but structurally this route is still asking for the full public stock catalog multiple times.

## Search filter helper is also layered

`filterEntriesToPublicSearchRoutes()` does:

- `filterEntriesToPublishableCms(entries)`
- `getPublicStockRouteSlugs()`

which itself may call:

- `getStocks()`
- canonical stock slug read

This is not N+1 per item, but it is repeated multi-stage route filtering on top of already-built search catalogs.

## Surface-by-surface findings

## `/stocks`

### Main issues

- full `getPublicStocks()` catalog is too heavy
- compare-route derivation runs across all stocks
- sector count and various UI derivatives run in memory on the whole set
- no lightweight listing-specific stock projection exists

### Severity

High

## `/sitemap.xml`

### Main issues

- slug helper still loads legacy stock catalog
- admin operator store is included
- SEO policy resolution runs per stock

### Severity

Medium to high

## `/stocks/[slug]`

### Main issues

- main stock load is okay structurally, but it is still stacked with:
  - normalized detail load
  - chart snapshot
  - comparable stocks
  - benchmark history
  - fund holding snapshots
  - peer-by-peer secondary loads
- similar-assets section has N+1 behavior

### Severity

High

## Search / indexing

### Main issues

- full canonical public stock catalog used where a slim search projection would be enough
- route-filter helper still triggers legacy slug work
- duplicated catalog-building effort across documents, smart search, suggestions, and compare helpers

### Severity

High

## Highest-payoff fixes to do next

These are recommendations only, not implemented in this audit step.

### 1. Split `getPublicStocks()` into lightweight and rich variants

Create separate helpers for:

- route slug list
- search/listing stock cards
- full rich stock page/catalog objects

This would remove the need to build the full enriched `StockSnapshot` shape for sitemap and search.

### 2. Remove `getStocks()` from canonical slug generation

`getPublicStockRouteSlugs()` should be able to:

- start from canonical `stocks_master`
- merge only the small legacy slug fallback set if truly required

without loading the full legacy enriched stock catalog.

### 3. Create a lightweight canonical search/listing projection

Search and stock listing should use a projection more like:

- `slug`
- `name`
- `symbol`
- `sector`
- `snapshot status`
- `price`
- `change`

instead of full `StockSnapshot`.

### 4. Remove peer-page N+1 loads on `/stocks/[slug]`

The similar-assets block should batch:

- peer stock summaries
- peer chart summary data

instead of calling `getStock()` and `getStockChartSnapshot()` for each peer in a loop.

### 5. Rework compare page data flow

The compare page should not need:

- full `getPublicStocks()`
- plus two separate compare-candidate passes that each also rely on the full public stock catalog

It should use one shared in-memory stock universe or a smaller compare-optimized projection.

### 6. Decouple sitemap from heavy admin/operator state

If possible, the sitemap path should avoid the full admin operator store for stock last-modified and SEO decisions unless there is no smaller source of truth.

## Final conclusion

The canonical-first migration succeeded functionally, but it currently expands the old public stock system into a much heavier full-universe enrichment pipeline.

The biggest performance problems are:

1. full-universe enriched catalog construction in `getPublicStocks()`
2. repeated reuse of that heavy helper across listing, compare, search, and suggestions
3. legacy catalog work still being pulled into canonical slug and search paths
4. N+1 peer loading on the stock detail page
5. sitemap policy generation still leaning on heavy route state

### Practical reading

The system is now:

- **correct**
- **broad**
- **safe**

but not yet:

- **cheap**
- **fast**
- **scaled for repeated public discovery requests**

So the next step should be a focused optimization pass that introduces:

- lightweight route projections
- batched peer loaders
- slug-only helpers
- fewer stacked enrichments on non-detail surfaces

without undoing the canonical-first correctness work.
