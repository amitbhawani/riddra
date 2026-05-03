# Riddra Meilisearch Production Search Fix Report

## Goal

Harden hosted search so public search and suggestions remain useful even when Meilisearch is missing or unhealthy in Production.

Known hosted blockers before this pass:

- `MEILISEARCH_HOST` missing
- `MEILISEARCH_API_KEY` missing
- `MEILISEARCH_INDEX_PREFIX` not explicitly set
- hosted `/search` felt slow
- hosted suggestions for `reliance` returned empty

## Files audited

- [lib/search-engine/meilisearch.ts](/Users/amitbhawani/Documents/Ai%20FinTech%20Platform/lib/search-engine/meilisearch.ts)
- [lib/search-suggestions.ts](/Users/amitbhawani/Documents/Ai%20FinTech%20Platform/lib/search-suggestions.ts)
- [lib/smart-search.ts](/Users/amitbhawani/Documents/Ai%20FinTech%20Platform/lib/smart-search.ts)
- [lib/public-search-fallback.ts](/Users/amitbhawani/Documents/Ai%20FinTech%20Platform/lib/public-search-fallback.ts)
- [app/search/page.tsx](/Users/amitbhawani/Documents/Ai%20FinTech%20Platform/app/search/page.tsx)
- [app/api/search/suggestions/route.ts](/Users/amitbhawani/Documents/Ai%20FinTech%20Platform/app/api/search/suggestions/route.ts)
- [lib/runtime-diagnostics.ts](/Users/amitbhawani/Documents/Ai%20FinTech%20Platform/lib/runtime-diagnostics.ts)
- [app/admin/runtime-diagnostics/page.tsx](/Users/amitbhawani/Documents/Ai%20FinTech%20Platform/app/admin/runtime-diagnostics/page.tsx)

## What changed

### 1. Meilisearch calls now fail fast

Updated:

- [lib/search-engine/meilisearch.ts](/Users/amitbhawani/Documents/Ai%20FinTech%20Platform/lib/search-engine/meilisearch.ts)

Added a short timeout wrapper around the live Meilisearch operations used by public search:

- health check
- index info lookup
- stats read
- search query

Current timeout:

- `1200ms`

This prevents `/search` and `/api/search/suggestions` from hanging too long on a slow or broken hosted Meilisearch instance.

### 2. Search fallback state is now explicit

`SearchEngineStatus` now carries:

- `indexPrefix`
- `fallbackActive`
- `lastSearchError`

That makes it possible to prove exactly why the app is using the stored fallback instead of the live index.

### 3. Hosted fallback remains useful when Meilisearch env is missing

Fallback search already existed through:

- [lib/public-search-fallback.ts](/Users/amitbhawani/Documents/Ai%20FinTech%20Platform/lib/public-search-fallback.ts)

This path uses stored canonical data for:

- stocks
- funds
- IPOs
- tracked indexes

The current pass ensures the fallback is reached quickly instead of waiting too long on Meilisearch first.

### 4. Admin diagnostics now shows structured search backend state

Updated:

- [lib/runtime-diagnostics.ts](/Users/amitbhawani/Documents/Ai%20FinTech%20Platform/lib/runtime-diagnostics.ts)
- [app/admin/runtime-diagnostics/page.tsx](/Users/amitbhawani/Documents/Ai%20FinTech%20Platform/app/admin/runtime-diagnostics/page.tsx)

The protected runtime diagnostics now exposes these fields for the Meilisearch check:

- `meilisearch_configured`
- `fallback_active`
- `index_prefix`
- `last_search_error`

This satisfies the operator visibility requirement without exposing secrets.

## Production env requirements

Hosted Meilisearch-backed search requires all three:

- `MEILISEARCH_HOST`
- `MEILISEARCH_API_KEY`
- `MEILISEARCH_INDEX_PREFIX`

Important:

- `MEILISEARCH_INDEX_PREFIX` must be explicitly set in Production
- the app no longer treats an implicit local default as sufficient hosted proof

Recommended Production values:

- `MEILISEARCH_HOST=<your hosted Meilisearch base URL>`
- `MEILISEARCH_API_KEY=<search API key>`
- `MEILISEARCH_INDEX_PREFIX=riddra`

Current index uid shape:

- `${MEILISEARCH_INDEX_PREFIX}_search`

So with `riddra`, the public index uid becomes:

- `riddra_search`

## Public behavior after this fix

### When Meilisearch is configured and healthy

- public search uses the indexed engine
- suggestions use Meilisearch hits plus route filtering
- admin diagnostics shows:
  - `meilisearch_configured = true`
  - `fallback_active = false`

### When Meilisearch env is missing

- public suggestions use stored fallback results
- `/search` uses stored fallback results
- the heavy shared sidebar rail is skipped in degraded mode
- admin diagnostics shows:
  - `meilisearch_configured = false`
  - `fallback_active = true`
  - `index_prefix = <current configured prefix>`

### When Meilisearch is configured but unhealthy or slow

- public search fails over quickly to stored fallback
- `last_search_error` captures the latest health/search timeout or failure

## Validation

Validated locally after this pass:

- `npm run lint` -> PASS
- `npx tsc --noEmit` -> PASS
- `/api/search/suggestions?query=reliance&limit=8` -> useful fallback results
- `/search?query=reliance` -> `200`

Expected local degraded truth in this env:

- `MEILISEARCH_HOST` missing
- `MEILISEARCH_API_KEY` missing
- `MEILISEARCH_INDEX_PREFIX` not explicit

So the correct local proof is:

- useful fallback suggestions
- a `200` search page
- no long wait on a missing live engine

## Hosted next step

To bring hosted search fully live:

1. add `MEILISEARCH_HOST`
2. add `MEILISEARCH_API_KEY`
3. add explicit `MEILISEARCH_INDEX_PREFIX`
4. redeploy Production
5. rebuild the search index if needed
6. rerun hosted smoke on:
   - `/api/search/suggestions?query=reliance&limit=8`
   - `/search?query=reliance`

## Final status

- repo-side hosted-compatible search fallback: **fixed**
- hosted Meilisearch production wiring: **still blocked until Production envs are added and redeployed**
