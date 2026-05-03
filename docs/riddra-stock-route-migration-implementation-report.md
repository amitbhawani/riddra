# Riddra Stock Route Migration Implementation Report

Last updated: 2026-04-29

## Objective

Migrate public stock route loading to use the canonical stock resolver with `stocks_master` as the primary identity layer, while preserving fallback to the legacy `instruments` layer and keeping existing URLs stable.

## What Changed

### 1. Public stock identity now resolves canonically first

Updated:
- `lib/content.ts`

`getStock(slug)` now:
- resolves the requested slug through `resolveCanonicalStockBySlug(...)`
- prefers `stocks_master` identity when available
- still preserves legacy `instruments`-backed detail reads when they exist
- still preserves published admin-managed fallback records when canonical data is unavailable

### 2. Canonical-only stocks can now render a safe public page

If a stock exists in `stocks_master` but does not have:
- a legacy `instrument` row
- a legacy publishable stock source row

the route can still render a safe stock page by synthesizing a `StockSnapshot` from:
- canonical stock identity
- latest `stock_company_profile` row when available
- latest `stock_market_snapshot` row when available

This keeps the route alive without pretending that the legacy layer already exists.

### 3. Normalized stock data loader now resolves by canonical stock id

Updated:
- `lib/stock-normalized-detail.ts`

`getNormalizedStockDetailData(slug)` now:
- resolves the slug through the canonical stock resolver first
- loads `stocks_master` by `stocksMasterId` when available
- falls back to slug lookup only when needed

This removes the previous slug-only assumption and makes normalized data safer for route migration.

### 4. Public stock page now uses the resolved stock slug downstream

Updated:
- `app/stocks/[slug]/page.tsx`

After `getStock(slug)` resolves, the page now uses `stock.slug` for:
- `getStockChartSnapshot(...)`
- `getComparableStocks(...)`
- `getNormalizedStockDetailData(...)`

That keeps route behavior consistent after canonical resolution.

## Files Changed

- `lib/content.ts`
- `lib/stock-normalized-detail.ts`
- `app/stocks/[slug]/page.tsx`

## Fallback Behavior

The route now follows this order:

1. Canonical resolver resolves stock identity from `stocks_master` first.
2. Legacy `instruments` detail row is used if present.
3. If legacy source detail is missing but canonical stock exists:
   - safe stock page is synthesized from canonical data
   - normalized snapshot/profile context is used when available
4. If canonical data is unavailable, existing admin-managed fallback behavior remains.
5. If nothing resolves, route still returns `notFound()`.

## Important Non-Changes

This migration does **not**:
- delete `instruments`
- deactivate legacy listings
- widen `/stocks` listings or sitemap coverage to the full `stocks_master` universe
- remove publishable CMS control from the broader stock listing layer

## Validation

### Static validation

- `npm run lint` -> PASS
- `npx tsc --noEmit` -> PASS

### Required route checks

- `GET /stocks/reliance-industries` -> `200`
- `GET /stocks/tcs` -> `200`
- `GET /stocks/infosys` -> `200`
- `GET /stocks/hdfc-bank` -> `200`
- `GET /stocks/icici-bank` -> `200`
- `GET /admin/market-data/import-control-center` -> `200`

### Canonical-only stock spot check

Verified a stock present in `stocks_master` with no linked legacy `instrument_id`:

- stock: `20MICRONS.NS`
- slug: `/stocks/20-microns-limited`
- `instrument_id = null`
- route result: `200`

This confirms the new canonical route fallback works for stocks that do not have the old instrument-backed page layer.

## Remaining Risks

1. `getStocks()` is still legacy publishable-list driven.
   - Public listing breadth is not migrated yet.

2. `getStockChartSnapshot(slug)` still reads the existing chart lane.
   - Canonical-only stocks can render safely, but may still show pending chart state if no legacy chart/source-entry series exists.

3. Comparable stocks are still derived from the legacy listing universe.
   - Canonical-only stocks may have sparse peer suggestions until list migration happens.

4. Sitemap and stock index pages are still not `stocks_master`-driven.
   - This implementation intentionally avoids widening indexed/public route coverage.

## Conclusion

The public stock detail route is now safely migrated to a canonical identity model:
- `stocks_master` is primary
- `instruments` remains fallback
- working legacy URLs remain intact
- canonical-only stocks can render safely

This is ready as the first route-layer migration step, while broader listing, sitemap, and legacy deactivation work should remain separate follow-up stages.
