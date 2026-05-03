# Riddra Stock Listing, Sitemap, and Search Audit

Date: April 30, 2026

## Executive Summary

Riddra’s **public stock detail route** is now on the right trajectory:

- `/stocks/[slug]` resolves through the **canonical stock resolver**
- `stocks_master` is the **primary identity source**
- `instruments` remains a **fallback only**
- canonical-only stock pages can render safely even when no old legacy stock row exists

But the broader stock discovery layer is still mixed.

Current state by surface:

- **Public stock detail route**: mostly canonical-first
- **Stock listing pages**: mixed, still constrained by publishable/CMS source backing
- **Sitemap**: mixed, still driven by publishable stock slug sets rather than the full `stocks_master` universe
- **Search/index/search suggestions**: mostly routed through `getStocks()`, so they inherit the same mixed publishable layer
- **Admin content stock list**: still CMS/editor-record driven, not `stocks_master`-driven
- **TradingView datafeed fallback registry**: still directly reads `instruments`

So the answer is:

- stock detail routing is largely ready for the canonical world
- stock discovery, sitemap breadth, search breadth, and some registry utilities are **not fully canonical yet**

## 1. Stock Listing Pages

### Main stock hub

Primary file:

- [app/stocks/page.tsx](/Users/amitbhawani/Documents/Ai%20FinTech%20Platform/app/stocks/page.tsx)

Current flow:

- calls `getStocks()` from [lib/content.ts](/Users/amitbhawani/Documents/Ai%20FinTech%20Platform/lib/content.ts)
- uses those returned `StockSnapshot[]` rows to build:
  - listing cards
  - compare links
  - chart links
  - discovery workspace rows

Important detail:

- `getStocks()` is **not** a pure `stocks_master` listing reader
- it starts from `getPublishableCmsRecords("stock")`
- then enriches with stock source rows
- then merges admin fallback stock records

This means the stock hub is still constrained by:

- publishable stock records
- CMS-backed route coverage
- legacy source-backed enrichment

Assessment:

- **Not fully canonical**
- **Still mixed**

### Sector and compare-driven stock listings

Examples:

- [app/sectors/[slug]/page.tsx](/Users/amitbhawani/Documents/Ai%20FinTech%20Platform/app/sectors/%5Bslug%5D/page.tsx)
- [app/compare/stocks/[left]/[right]/page.tsx](/Users/amitbhawani/Documents/Ai%20FinTech%20Platform/app/compare/stocks/%5Bleft%5D/%5Bright%5D/page.tsx)

These surfaces mostly build stock links from stock objects already returned by `getStocks()` / `getStock()`.

So they are:

- safer than direct `instruments` reads
- but still indirectly dependent on the mixed stock snapshot source behind `getStocks()`

Assessment:

- **Mixed**
- not directly legacy-only
- not yet full `stocks_master` discovery

## 2. Sitemap Generation

Primary file:

- [app/sitemap.ts](/Users/amitbhawani/Documents/Ai%20FinTech%20Platform/app/sitemap.ts)

Current flow:

- loads:
  - `getPublishableCmsSlugSet("stock")`
  - `getPublishedAdminManagedStockFallbackRecords()`
  - `getAdminOperatorStore()`
- builds stock sitemap entries from:
  - publishable stock slugs
  - admin fallback slugs

Important detail:

- sitemap stock entries are **not** generated from all active `stocks_master` rows
- the sitemap does **not** use the canonical resolver as its discovery source
- it uses publishable/CMS route coverage as the stock inclusion boundary

What this means:

- canonical-only stock pages may render if opened directly
- but they are not automatically part of the sitemap universe unless represented in the publishable/admin route layer

Assessment:

- **Not canonical**
- **Still publishable-layer driven**

## 3. Internal Links

Internal stock links are widespread across the app.

Examples found:

- homepage:
  - [components/market-intelligence-homepage.tsx](/Users/amitbhawani/Documents/Ai%20FinTech%20Platform/components/market-intelligence-homepage.tsx)
- stock hub:
  - [app/stocks/page.tsx](/Users/amitbhawani/Documents/Ai%20FinTech%20Platform/app/stocks/page.tsx)
- chart route:
  - [app/stocks/[slug]/chart/page.tsx](/Users/amitbhawani/Documents/Ai%20FinTech%20Platform/app/stocks/%5Bslug%5D/chart/page.tsx)
- compare routes:
  - [app/compare/stocks/[left]/[right]/page.tsx](/Users/amitbhawani/Documents/Ai%20FinTech%20Platform/app/compare/stocks/%5Bleft%5D/%5Bright%5D/page.tsx)
- sectors:
  - [app/sectors/[slug]/page.tsx](/Users/amitbhawani/Documents/Ai%20FinTech%20Platform/app/sectors/%5Bslug%5D/page.tsx)
- related/comparable UI:
  - [components/stock-normalized-data-sections.tsx](/Users/amitbhawani/Documents/Ai%20FinTech%20Platform/components/stock-normalized-data-sections.tsx)
  - [components/shared-market-sidebar-rail.tsx](/Users/amitbhawani/Documents/Ai%20FinTech%20Platform/components/shared-market-sidebar-rail.tsx)

Most links are generated as:

- ``/stocks/${stock.slug}``

This is good because:

- link targets are slug-based
- they do not directly encode `instrument_id`
- they benefit from the canonical-first public stock route

But the source of those slugs often still comes from:

- `getStocks()`
- `getStock()`
- compare helpers using `StockSnapshot`

Assessment:

- **Internal href format is good**
- **link-source dataset is still mixed**

## 4. Admin Content Stock List

Primary files:

- [app/admin/content/page.tsx](/Users/amitbhawani/Documents/Ai%20FinTech%20Platform/app/admin/content/page.tsx)
- [app/api/admin/operator-console/records/route.ts](/Users/amitbhawani/Documents/Ai%20FinTech%20Platform/app/api/admin/operator-console/records/route.ts)
- [lib/admin-content-registry.ts](/Users/amitbhawani/Documents/Ai%20FinTech%20Platform/lib/admin-content-registry.ts)

What it does:

- admin content list is built from the admin/editor record system
- the stock family in admin is still treated as a CMS/editorial family first
- `lib/admin-content-registry.ts` calls `getStocks()` and `getStock()` for stock family views

Important distinction:

- admin content stock list is **not** the same thing as the Yahoo import stock universe
- it is for editable public stock records and route content, not for the full `2157`-stock universe

Assessment:

- **Not a `stocks_master` universe list**
- **Still content/CMS-layer driven**
- acceptable for editor workflows, but not canonical as a stock-universe surface

## 5. Search Index

Primary files:

- [lib/search-engine/documents.ts](/Users/amitbhawani/Documents/Ai%20FinTech%20Platform/lib/search-engine/documents.ts)
- [lib/search-index-registry.ts](/Users/amitbhawani/Documents/Ai%20FinTech%20Platform/lib/search-index-registry.ts)
- [lib/smart-search.ts](/Users/amitbhawani/Documents/Ai%20FinTech%20Platform/lib/smart-search.ts)

Current flow:

- these systems pull stocks through `getStocks()`
- then construct search catalog and search documents from those returned stock routes

That means:

- search already benefits from route-safe stock objects
- search is not directly querying `instruments`
- but search breadth is only as good as `getStocks()` breadth

So search is:

- safer than direct legacy reads
- still not fully canonical because it is discovery-limited by the publishable stock set

Assessment:

- **Mixed**
- route-safe
- not yet a full `stocks_master` search universe

## 6. Related / Comparable Stock Components

Primary surfaces:

- [lib/compare-routing.ts](/Users/amitbhawani/Documents/Ai%20FinTech%20Platform/lib/compare-routing.ts)
- [lib/asset-insights.ts](/Users/amitbhawani/Documents/Ai%20FinTech%20Platform/lib/asset-insights.ts)
- [app/stocks/[slug]/page.tsx](/Users/amitbhawani/Documents/Ai%20FinTech%20Platform/app/stocks/%5Bslug%5D/page.tsx)

Current behavior:

- related/comparable routes work off `StockSnapshot` objects
- those objects usually come from `getStocks()` / `getStock()`
- actual route links are slug-based

This is good for route stability.

But compare breadth and related-stock breadth still inherit:

- whatever the stock catalog currently exposes
- not the full `stocks_master` universe by default

Assessment:

- **Routing-safe**
- **Catalog-breadth limited**

## 7. Homepage / Market Pages That Link Stocks

Primary surface:

- [components/market-intelligence-homepage.tsx](/Users/amitbhawani/Documents/Ai%20FinTech%20Platform/components/market-intelligence-homepage.tsx)

Current behavior:

- homepage hard-links to some stock routes directly
  - for example `/stocks/tata-motors`
- also links dynamic stock cards using stock slugs from homepage data

This is operationally okay because:

- public stock routes are canonical-first now

But it does not prove homepage discovery is canonical-backed.

Assessment:

- **Links are route-safe**
- homepage stock selection remains **surface-data driven**, not clearly full-canonical-universe driven

## 8. Hard Dependency On `instruments`

Yes, there are still real hard dependencies on `instruments`.

### Direct runtime dependencies still found

1. [lib/publishable-content.ts](/Users/amitbhawani/Documents/Ai%20FinTech%20Platform/lib/publishable-content.ts)

- development fallback for publishable stock records still reads:
  - `public.instruments`

2. [lib/tradingview-datafeed-server.ts](/Users/amitbhawani/Documents/Ai%20FinTech%20Platform/lib/tradingview-datafeed-server.ts)

- fallback registry still reads:
  - `public.instruments`

3. [lib/canonical-stock-resolver.ts](/Users/amitbhawani/Documents/Ai%20FinTech%20Platform/lib/canonical-stock-resolver.ts)

- correctly uses:
  - `stocks_master` first
  - `instruments` fallback
  - `companies` enrichment fallback

This is an intentional dependency, not a bug.

4. [lib/content.ts](/Users/amitbhawani/Documents/Ai%20FinTech%20Platform/lib/content.ts)

- `getStocks()` still enriches catalog rows through stock source reads that remain tied to the publishable/source-backed layer
- that layer still reflects legacy instrument-backed route coverage in several places

Assessment:

- **Yes, hard dependency on `instruments` still exists**
- especially for:
  - publishable stock fallback
  - TradingView fallback registry
  - stock catalog enrichment paths

## Surface-by-Surface Verdict

| Surface | Primary source today | Verdict |
| --- | --- | --- |
| `/stocks/[slug]` detail route | Canonical resolver first, legacy fallback second | Good / mostly canonical |
| `/stocks/[slug]/chart` | `getStock()` + stock chart snapshot | Good route, mixed upstream source |
| `/stocks` hub | `getStocks()` | Mixed |
| sitemap | publishable stock slugs + admin fallback | Not canonical |
| smart search | `getStocks()` | Mixed |
| search index docs | `getStocks()` | Mixed |
| compare / related | `getStocks()` / `getStock()` | Mixed but route-safe |
| admin stock content list | admin content registry / editor store | CMS-driven, not canonical universe |
| TradingView fallback registry | direct `instruments` fallback | Legacy dependency remains |

## Recommended Route Migration Plan

### Phase 1. Keep current public detail route as-is

This is already the strongest part:

- canonical-first
- legacy-safe fallback
- canonical-only slugs can render

Do not regress this.

### Phase 2. Introduce a canonical stock catalog adapter

Create a shared listing/discovery adapter for:

- stock hub
- search
- compare candidate universe
- sector stock discovery
- homepage stock discovery

The adapter should:

- start from `stocks_master`
- optionally intersect with publishable/editor-approved route policy where needed
- return the same `StockSnapshot`-style contract expected by current UI

### Phase 3. Move sitemap to canonical-aware route coverage

Sitemap should stop depending only on:

- publishable stock slugs

Instead it should:

- use canonical stock coverage policy
- include canonical-safe stock routes intentionally
- preserve page-level SEO exclusions where needed

### Phase 4. Move search breadth to canonical coverage

Search should continue to use route-safe stock objects, but the stock universe for indexing should come from:

- canonical listing adapter

not just the older publishable-only stock pool.

### Phase 5. Remove remaining runtime `instruments` dependence from non-detail surfaces

Highest-value follow-ups:

1. `lib/tradingview-datafeed-server.ts`
2. `lib/publishable-content.ts` stock fallback
3. `lib/content.ts` stock catalog enrichment path

### Phase 6. Only then consider legacy archive

Do **not** archive or deactivate legacy stock `instruments` until:

- listing surfaces are canonical-backed
- sitemap is canonical-backed
- search is canonical-backed
- TradingView fallback is no longer instrument-dependent

## Final Conclusion

Riddra is in a **split state**:

- **Detail routing** is already largely migrated
- **Discovery surfaces** are not

So if the question is:

“Do stock listing, sitemap, search, and internal-link surfaces already use `stocks_master` or the canonical resolver?”

The answer is:

- **Detail route:** mostly yes
- **Internal links:** slug-safe, but often built from mixed upstream stock catalogs
- **Listing pages:** not fully
- **Sitemap:** no
- **Search:** not fully
- **Admin stock content list:** no, by design
- **Remaining hard dependency on `instruments`:** yes

This means the next safe migration focus should be:

1. canonical listing adapter
2. sitemap migration
3. search migration
4. TradingView fallback cleanup

Only after those steps should the legacy stock listing layer be archived.
