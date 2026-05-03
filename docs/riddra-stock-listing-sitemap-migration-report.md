# Riddra Stock Listing + Sitemap Migration Report

Last updated: 2026-04-30

## Goal

Migrate public stock discovery surfaces to use `stocks_master` as the primary universe, while preserving the existing legacy `instruments`-backed routes wherever they still add route-specific richness or CMS continuity.

## What changed

### 1. Public stock listing is now canonical-first

The public `/stocks` listing now reads from a new canonical stock catalog built from `stocks_master`, then overlays the richer legacy publishable rows by slug when they exist.

This gives us:

- full canonical stock universe breadth from `stocks_master`
- no duplicate overlapping stock cards for the existing 22 legacy listings
- legacy route continuity for the already-published stock pages

### 2. Sitemap now includes canonical stock slugs safely

The sitemap stock section now reads from canonical stock route slugs instead of only the legacy publishable stock CMS set.

This means:

- canonical stock pages can now enter the sitemap
- the 22 legacy stock slugs remain included
- admin fallback stock records still remain merged in

### 3. Search and indexing no longer depend only on publishable CMS stock routes

Search/index surfaces were updated to allow canonical stock direct routes through the public-route filter for:

- `/stocks/[slug]`
- `/stocks/[slug]/chart`

Non-stock routes still continue through the existing publishable-CMS filter.

This prevents the old issue where canonical-only stock routes existed publicly but were silently excluded from search and index generation.

### 4. Compare helpers now read the public canonical stock catalog

Public stock compare candidate helpers now use the canonical-first public stock catalog too, so compare discovery does not stay limited to the older 22-stock layer.

## Files changed

- `lib/content.ts`
- `lib/public-search-routes.ts`
- `app/stocks/page.tsx`
- `app/sitemap.ts`
- `lib/search-engine/documents.ts`
- `lib/search-index-registry.ts`
- `lib/smart-search.ts`
- `lib/search-suggestions.ts`
- `lib/asset-insights.ts`
- `app/compare/stocks/[left]/[right]/page.tsx`

## Migration design

### Kept stable

- `getStocks()` remains the legacy/publishable stock catalog path
- admin content pages remain on the old source path for now
- `getStock(slug)` remains canonical-first with legacy enrichment fallback

### Added

- `getPublicStocks()`
  - canonical `stocks_master` base
  - durable quote enrichment
  - durable fundamentals/shareholding/source-close overlays
  - legacy stock overlay by slug
  - deduped final catalog

- `getPublicStockRouteSlugs()`
  - canonical stock slugs from `stocks_master`
  - merged with legacy stock slugs
  - deduped and sorted for sitemap/search use

- `filterEntriesToPublicSearchRoutes()`
  - preserves the existing publishable filter for most routes
  - explicitly allows canonical stock detail and chart routes

## Validation

Lint and typecheck:

- `npm run lint` -> PASS
- `npx tsc --noEmit` -> PASS

Route checks were validated on a fresh local dev server at `http://127.0.0.1:3011` because the older `127.0.0.1:3000` process was not responding even for `/`.

Validated results:

- `GET /stocks` -> `200`
- `GET /sitemap.xml` -> `200`
- `GET /stocks/reliance-industries` -> `200`
- `GET /stocks/20-microns-limited` -> `200`

Observed response timings on first-load validation:

- `/stocks` -> `200` in about `34.0s`
- `/stocks/reliance-industries` -> `200` in about `37.3s`
- `/stocks/20-microns-limited` -> `200` in about `37.5s`
- `/sitemap.xml` -> `200` in about `9.3s` from the dev-server log

## Important caveat

The migration is functionally correct, but first-load performance is still too slow.

The main reason is that the canonical listing/detail path now fans out into large Supabase-backed enrichment reads, including:

- full `stocks_master` listing
- durable quote snapshot coverage
- durable fundamentals/shareholding overlays
- global/sidebar/admin-managed supporting reads that the public surface still pulls indirectly

So the public surfaces are broader and correct now, but they still need a second performance pass before this is considered fully optimized.

## Result

### Completed

- public stock listing uses canonical `stocks_master` breadth
- existing 22 legacy URLs continue to work
- canonical-only stock pages remain routable
- sitemap includes canonical stock slugs safely
- search/indexing no longer duplicates the overlapping legacy stock entries
- admin content pages were left stable

### Not done in this step

- legacy `instruments` cleanup
- admin content source migration
- deeper performance optimization of the newly broadened canonical stock discovery path
