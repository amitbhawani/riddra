# Riddra Stock Route Breadth Check

Date: 2026-04-30  
Environment used for breadth verification: `http://127.0.0.1:3001`

## Scope

This check verified the public stock detail route across a broad `stocks_master` sample instead of only the older legacy stock set.

Sample composition:
- `22` legacy `instruments` stock pages
- `78` canonical-only `stocks_master` pages
- included:
  - small-cap style names
  - numeric symbols and slugs
  - heavily hyphenated slugs
  - long company names
  - symbols containing special characters such as `&` and `-`

Examples included:
- legacy: `reliance-industries`, `tcs`, `infosys`, `hdfc-bank`, `icici-bank`, `hcltech`
- canonical-only numeric: `20-microns-limited`, `360-one-wam-limited`, `3b-blackbio-dx-limited`
- canonical-only special-symbol: `jammu-and-kashmir-bank-limited`, `mahindra-and-mahindra-limited`
- canonical-only long-name: `adani-ports-and-special-economic-zone-limited`

## Results

1. Total tested: `100`
2. `200` count: `100`
3. `404` count: `0`
4. `500` count: `0`
5. Timeouts / request aborts: `0`
6. Slow pages over `5s`: `6`

Acceptance result:
- `0` server crashes in the final 100-page run
- `0` unexpected `500`s in the final 100-page run
- canonical-only stocks rendered safe pages successfully

## Slug Generation Issues

No slug-generation failures were found in the sampled route set.

Verified tricky slug classes that resolved successfully:
- numeric-first slugs like `20-microns-limited`
- numeric-symbol slugs like `360-one-wam-limited`
- long multi-hyphen names like `adani-ports-and-special-economic-zone-limited`
- special-symbol source mappings like:
  - `J&KBANK` -> `/stocks/jammu-and-kashmir-bank-limited`
  - `M&M` -> `/stocks/mahindra-and-mahindra-limited`
  - `ARE&M` -> `/stocks/amara-raja-energy-and-mobility-limited`

## Missing Data / Empty State Issues

The stock pages rendered successfully, but many pages showed expected empty-state language such as:
- `Awaiting extended dataset`
- `Unavailable`
- similar missing-data placeholders

This is expected in the current state because several normalized Yahoo-derived tables are still unavailable or not populated broadly, including:
- `stock_company_profile`
- `stock_performance_metrics`
- `stock_growth_metrics`
- `stock_health_ratios`
- `stock_riddra_scores`
- `stock_holders_summary`
- `stock_holders_detail`
- `stock_dividends`
- `stock_splits`
- `stock_news`

Important distinction:
- these missing buckets did **not** crash the page
- they degraded into safe empty states as intended

## Links / Components Causing Errors

No user-facing public stock page component caused a final `500` in the completed breadth run.

However, the server log showed two noisy internal warning patterns during rendering:

1. Canonical company profile lookup warnings from:
   - [lib/content.ts](/Users/amitbhawani/Documents/Ai%20FinTech%20Platform/lib/content.ts)
   - `readCanonicalStockProfileRow(...)`

2. Optional normalized table read warnings from:
   - [lib/stock-normalized-detail.ts](/Users/amitbhawani/Documents/Ai%20FinTech%20Platform/lib/stock-normalized-detail.ts)
   - `safeRows(...)` / `safeMaybeSingle(...)`

These warnings are non-fatal today, but they add a lot of log noise.

## Fixes Applied

No route-logic fix was required for the final breadth result because the canonical-resolver migration already held up across the 100-slug sample.

What I added:
- reusable breadth-check script:
  - [scripts/check-stock-route-breadth.mjs](/Users/amitbhawani/Documents/Ai%20FinTech%20Platform/scripts/check-stock-route-breadth.mjs)

What I cleaned during validation:
- removed corrupted generated Next dev type artifacts from `.next/dev/types`
- this was needed only to restore clean local `tsc` results after the long dev-session run

## Notable Observation

An early warm-up request briefly hit a transient dev-only `500` on `/stocks/hcltech` caused by a missing compiled `.next` module during Next dev recompilation. That issue did **not** reproduce in the final breadth run, and `hcltech` returned `200` consistently afterward.

So the final conclusion is:
- no persistent stock-route crash remains in the sampled breadth
- the remaining issue is mostly optional-data coverage and warning noise, not route correctness

## Validation

- `npm run lint` -> PASS
- `npx tsc --noEmit` -> PASS

## Final Assessment

The public stock route is now broad enough to safely serve both:
- legacy instrument-backed stock pages
- canonical-only `stocks_master` pages

The next worthwhile follow-up is not route stability, but cleanup:
- reduce noisy optional-table warnings
- continue filling normalized non-price buckets
- proceed with the archive-first legacy listing cleanup plan only after those editorial/SEO dependencies are fully migrated
