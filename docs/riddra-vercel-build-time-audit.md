# Riddra Vercel Build Time Audit

Date: 2026-05-03  
Scope: Audit only. No behavior changes applied.

## Executive Summary

The recent jump from roughly `3–4 minutes` to roughly `20–21 minutes` is **not** coming from dependency install, clone, or TypeScript. The dominant slowdown is:

- `Generating static pages using 1 worker`

That step grew from:

- `543` static pages in about `20.8s`

to:

- `2743` static pages in about `17.5min`

The biggest likely cause is stock-route build fanout combined with **heavy build-time stock catalog fetching** in `generateStaticParams()` and sitemap helpers.

## 1. Which step is slow in Vercel logs

### Recent slow production deployment

Deployment inspected:

- `https://riddra-dawjr6ten-amitbhawani-1947s-projects.vercel.app`
- Vercel deployment id: `dpl_467eyHUhxziKyWcoDv4zRRyoDn6P`

Key timings from build logs:

- clone: `1.410s`
- install dependencies: about `14s`
- compile optimized production build: `88s`
- TypeScript: `44s`
- collect page data: about `26s`
- generate static pages: `17.5min`
- finalize/traces: about `2s`
- create build cache: `23s`

Critical line:

- `✓ Generating static pages using 1 worker (2743/2743) in 17.5min`

### Earlier fast production deployment

Deployment inspected:

- `https://riddra-rmbr8s4eg-amitbhawani-1947s-projects.vercel.app`

Key timings from build logs:

- install dependencies: about `14s`
- compile optimized production build: `86s`
- TypeScript: `43s`
- collect page data: about `21s`
- generate static pages: `20.8s`
- create build cache: `23s`

Critical line:

- `✓ Generating static pages using 1 worker (543/543) in 20.8s`

## 2. Whether `next build` is statically rendering heavy routes

Yes.

The recent build is clearly spending almost all extra time in static generation. The page count jumped by:

- `2743 - 543 = 2200` additional static pages

That is far too large to be explained by compile or TypeScript drift. It points to route fanout.

The strongest stock-route candidates in code are:

- [`app/stocks/[slug]/page.tsx`](/Users/amitbhawani/Documents/Ai%20FinTech%20Platform/app/stocks/%5Bslug%5D/page.tsx:98)
- [`app/stocks/[slug]/chart/page.tsx`](/Users/amitbhawani/Documents/Ai%20FinTech%20Platform/app/stocks/%5Bslug%5D/chart/page.tsx:29)
- [`app/stocks/page/[page]/page.tsx`](/Users/amitbhawani/Documents/Ai%20FinTech%20Platform/app/stocks/page/%5Bpage%5D/page.tsx:20)

Important detail:

- the stock detail route’s `generateStaticParams()` does **not** only load slugs
- it currently calls:
  - `getPublicStockDiscoverySlugs()`
  - `getStocks()`
  - `getPublishedAdminManagedStockFallbackRecords()`

That means build-time param generation for stock pages is using a **heavy full-catalog reader** instead of a slim slug-only source.

## 3. Whether `/stocks` or `/sitemap.xml` is loading 2157 stocks during build

### `/stocks`

The paginated stocks listing route itself is **not** the main culprit.

[`app/stocks/page/[page]/page.tsx`](/Users/amitbhawani/Documents/Ai%20FinTech%20Platform/app/stocks/page/%5Bpage%5D/page.tsx:20) only does:

- `getPublicStockDiscoveryPage(1, STOCKS_PAGE_SIZE)` for param generation

That uses [`readCanonicalStockCatalogPageRows()`](/Users/amitbhawani/Documents/Ai%20FinTech%20Platform/lib/content.ts:1337), which reads only one page plus a count, not the full universe.

So:

- `/stocks` pagination is a minor build-time query
- it is **not** the reason builds ballooned to 20 minutes

### `/sitemap.xml`

Yes, the sitemap path does load the full stock slug set during build.

[`app/sitemap.ts`](/Users/amitbhawani/Documents/Ai%20FinTech%20Platform/app/sitemap.ts:42) calls:

- `getPublicStockDiscoverySlugs()`

That resolves into [`buildPublicStockDiscoverySlugs()`](/Users/amitbhawani/Documents/Ai%20FinTech%20Platform/lib/content.ts:1298), which calls:

- [`readCanonicalStockCatalogRows()`](/Users/amitbhawani/Documents/Ai%20FinTech%20Platform/lib/content.ts:1032)

And `readCanonicalStockCatalogRows()` pages through:

- all `stocks_master` rows where `status = 'active'`

So the sitemap helper **does** scan the full active stock catalog during build.

Important nuance:

- this does **not** mean the final sitemap necessarily emits every active stock
- earlier production sitemap proofs showed about `1001` stock URLs
- but the helper itself still reads the full active catalog to decide what to include

So the best answer is:

- `/sitemap.xml` absolutely contributes full-catalog stock reads during build
- `/stocks` pagination does not

## 4. Whether Supabase queries are happening during build

Yes, definitely.

### Direct evidence from Vercel logs

During static page generation, the build logs show:

- `[cms-durable-state] cms_admin_activity_log durable read succeeded`
- `[admin-activity-log] latest durable activity loaded`

That means the build is making real Supabase-backed durable reads while prerendering.

### Direct evidence from code

Build-time stock helpers use a Supabase client via:

- [`createSupabaseContentReadClient()`](/Users/amitbhawani/Documents/Ai%20FinTech%20Platform/lib/content.ts:339)

That routes to:

- `createSupabaseAdminClient()` when admin env is present
- otherwise `createSupabaseReadClient()`

Heavy build-time readers include:

- [`readCanonicalStockCatalogRows()`](/Users/amitbhawani/Documents/Ai%20FinTech%20Platform/lib/content.ts:1032)
- [`readStockCatalogSourceRows()`](/Users/amitbhawani/Documents/Ai%20FinTech%20Platform/lib/content.ts:971)
- [`readCanonicalStockSnapshotRowsForStocks()`](/Users/amitbhawani/Documents/Ai%20FinTech%20Platform/lib/content.ts:1370)
- [`readCanonicalStockProfileRow()`](/Users/amitbhawani/Documents/Ai%20FinTech%20Platform/lib/content.ts:1540)
- [`getStocks()`](/Users/amitbhawani/Documents/Ai%20FinTech%20Platform/lib/content.ts:2480)
- [`getPublicStockDiscoverySlugs()`](/Users/amitbhawani/Documents/Ai%20FinTech%20Platform/lib/content.ts:1529)

So yes: Supabase is part of build-time work.

## 5. Whether large files or scripts are included unnecessarily

There are several large repo-local files and directories present:

- `.meilisearch/.../data.mdb` around `4.5MB`
- `backups/...csv`
- `data/*.json`
- large source files like:
  - [`lib/yahoo-finance-import.ts`](/Users/amitbhawani/Documents/Ai%20FinTech%20Platform/lib/yahoo-finance-import.ts)
  - [`lib/yahoo-finance-batch-import.ts`](/Users/amitbhawani/Documents/Ai%20FinTech%20Platform/lib/yahoo-finance-batch-import.ts)
  - [`components/test-stock-detail-page.tsx`](/Users/amitbhawani/Documents/Ai%20FinTech%20Platform/components/test-stock-detail-page.tsx)

Current [`.vercelignore`](/Users/amitbhawani/Documents/Ai%20FinTech%20Platform/.vercelignore) excludes:

- `.next`
- `node_modules`
- `dist`
- `build`
- `.cache`
- logs

But it does **not** exclude:

- `.meilisearch`
- `backups`
- `data`

However, based on the live slow build logs, these are **not** the primary reason for the 20-minute jump:

- clone took only `1.4s`
- install took only about `14s`

So large repo files are a hygiene issue and can matter for some deployment modes, but they do **not** explain the current 17.5-minute static-generation slowdown.

## 6. Whether search or stock catalog runs at build time

### Search

There is **no evidence** in the Vercel logs that Meilisearch indexing or search rebuilds are running during build.

The search page itself:

- [`app/search/page.tsx`](/Users/amitbhawani/Documents/Ai%20FinTech%20Platform/app/search/page.tsx)

does not appear to be the main source of the 20-minute regression.

So:

- search is **not** the primary build-time slowdown
- there is no sign of a search-index build step causing the spike

### Stock catalog

Yes, stock catalog logic absolutely runs at build time.

The most important issue is that route param generation is using the heavy stock catalog loader:

- [`app/stocks/[slug]/page.tsx`](/Users/amitbhawani/Documents/Ai%20FinTech%20Platform/app/stocks/%5Bslug%5D/page.tsx:98)
- [`app/stocks/[slug]/chart/page.tsx`](/Users/amitbhawani/Documents/Ai%20FinTech%20Platform/app/stocks/%5Bslug%5D/chart/page.tsx:29)

And the heavy loader:

- [`getStocks()`](/Users/amitbhawani/Documents/Ai%20FinTech%20Platform/lib/content.ts:2480)

does much more than enumerate slugs. It pulls:

- publishable CMS stock records
- stock source rows from `instruments`, `companies`, `stock_pages`
- durable quote snapshots
- source-entry closes
- durable shareholding enrichment
- durable fundamentals enrichment
- admin fallback stock records

That is the wrong weight for `generateStaticParams()`.

## Primary Finding

The build-time regression is mainly caused by:

1. a large jump in static page count
2. stock route generation pulling heavy catalog data during build
3. full-catalog stock scans inside sitemap and stock param generation
4. Next building those pages with only `1 worker`

## Most Likely Culprit Order

1. [`app/stocks/[slug]/page.tsx`](/Users/amitbhawani/Documents/Ai%20FinTech%20Platform/app/stocks/%5Bslug%5D/page.tsx:98) `generateStaticParams()` over-fetching `getStocks()`
2. [`app/stocks/[slug]/chart/page.tsx`](/Users/amitbhawani/Documents/Ai%20FinTech%20Platform/app/stocks/%5Bslug%5D/chart/page.tsx:29) `generateStaticParams()` over-fetching `getStocks()`
3. [`app/sitemap.ts`](/Users/amitbhawani/Documents/Ai%20FinTech%20Platform/app/sitemap.ts:42) pulling full active stock slugs
4. [`app/charts/page.tsx`](/Users/amitbhawani/Documents/Ai%20FinTech%20Platform/app/charts/page.tsx:19) loading the full stock catalog during prerender for a single page

## Bottom Line

The new 20-minute builds are not being caused by:

- npm install
- Webpack compile
- TypeScript
- Meilisearch indexing
- large repo files as the primary bottleneck

They are being caused by:

- **static-generation fanout**
- especially **stock-route build-time enumeration**
- combined with **heavy Supabase-backed stock catalog reads during build**

No behavior was changed in this audit.
