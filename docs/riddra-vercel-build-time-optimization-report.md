# Riddra Vercel Build Time Optimization Report

Date: 2026-05-03  
Scope: Build-time optimization only. No product redesign or stock-page behavior change.

## Goal

Reduce Vercel deployment time by:

- avoiding full stock-universe prerendering during build
- moving heavy stock-catalog reads from build time to runtime where safe
- keeping sitemap generation working
- keeping public stock pages working

## Changes Applied

### 1. Stop prebuilding the full stock-detail universe

Updated:

- [app/stocks/[slug]/page.tsx](/Users/amitbhawani/Documents/Ai%20FinTech%20Platform/app/stocks/%5Bslug%5D/page.tsx)
- [app/stocks/[slug]/chart/page.tsx](/Users/amitbhawani/Documents/Ai%20FinTech%20Platform/app/stocks/%5Bslug%5D/chart/page.tsx)
- [lib/stock-route-static-slugs.ts](/Users/amitbhawani/Documents/Ai%20FinTech%20Platform/lib/stock-route-static-slugs.ts)

What changed:

- stock detail and stock chart routes no longer call `getStocks()` or full discovery helpers inside `generateStaticParams()`
- they now prebuild only a small curated warm set of stock slugs
- all remaining stock routes continue to work through on-demand runtime rendering

Net effect:

- build no longer fans out across the entire active stock universe
- stock routes still work for every slug
- high-priority stock routes can still be warmed at build time

### 2. Make sitemap slug generation lighter

Updated:

- [lib/content.ts](/Users/amitbhawani/Documents/Ai%20FinTech%20Platform/lib/content.ts)

What changed:

- added a slimmer canonical slug reader that selects only `slug` from `stocks_master`
- `buildPublicStockDiscoverySlugs()` now uses slug-only reads instead of loading the broader canonical stock row shape

Net effect:

- sitemap still works
- sitemap still reads the full canonical stock catalog
- but it now does so with a much lighter query

### 3. Move other full-catalog public pages off the build path

Updated:

- [app/charts/page.tsx](/Users/amitbhawani/Documents/Ai%20FinTech%20Platform/app/charts/page.tsx)
- [app/screener/page.tsx](/Users/amitbhawani/Documents/Ai%20FinTech%20Platform/app/screener/page.tsx)

What changed:

- both pages now use `dynamic = "force-dynamic"`
- this prevents their `getStocks()` full-catalog read from happening during `next build`

Net effect:

- fewer unnecessary stock-universe reads during deployment
- no change to route availability

## Validation

### Lint and typecheck

- `npm run lint` -> PASS
- `npx tsc --noEmit` -> PASS

### Production build

- `npm run build` -> PASS

Critical before/after build signal:

- previous slow audit evidence: `✓ Generating static pages using 1 worker (2743/2743) in 17.5min`
- after optimization: `✓ Generating static pages using 11 workers (539/539) in 15.9s`

That is the main win.

### Built app route checks

Validated with `next start` locally:

- `GET http://localhost:3000/stocks/reliance-industries` -> `200`
- `GET http://localhost:3000/sitemap.xml` -> `200`

Additional stock-page proof:

- the built stock page responded with:
  - `x-nextjs-cache: HIT`
  - `x-nextjs-prerender: 1`
  - `x-nextjs-stale-time: 300`

That confirms stock pages still serve correctly after the build optimization.

## What the build output now shows

The new build output confirms the intended route posture:

- [`/stocks/[slug]`](/Users/amitbhawani/Documents/Ai%20FinTech%20Platform/app/stocks/%5Bslug%5D/page.tsx) is still SSG-backed, but only for a small warm set
- [`/stocks/[slug]/chart`](/Users/amitbhawani/Documents/Ai%20FinTech%20Platform/app/stocks/%5Bslug%5D/chart/page.tsx) is also only prebuilt for the same warm set
- [`/charts`](/Users/amitbhawani/Documents/Ai%20FinTech%20Platform/app/charts/page.tsx) is now dynamic
- [`/screener`](/Users/amitbhawani/Documents/Ai%20FinTech%20Platform/app/screener/page.tsx) is now dynamic
- [`/sitemap.xml`](/Users/amitbhawani/Documents/Ai%20FinTech%20Platform/app/sitemap.ts) remains static and revalidated

## Expected Vercel Impact

The dominant slow step in the audit was static-page generation, not install or compile.

Because the static-page count dropped from `2743` to `539`, the expected production effect is:

- deployments should move much closer to the earlier `3–4 minute` range
- the previous `20-minute` regression should no longer be driven by stock-route prerender fanout

Exact hosted timing still depends on:

- Vercel remote cache state
- networked Supabase latency during the remaining static work
- whether the next production deployment is a cold or warm cache build

## Remaining Honest Caveat

This optimization removes the biggest build-time regression, but it does not eliminate all runtime stock-catalog work:

- sitemap still reads the full canonical stock slug set
- stock pages still fetch their real data at runtime when they are not in the warm set

That is intentional. The heavy work moved away from build fanout without breaking stock-page truth.

## Bottom Line

The main deployment-time regression is fixed in code.

The biggest changes were:

1. stop prebuilding the full stock universe
2. keep only a tiny curated stock warm set at build time
3. make sitemap slug reads lighter
4. move charts and screener full-catalog reads to runtime

This preserves stock-page behavior while removing the build pattern that caused the 20-minute Vercel deployments.
