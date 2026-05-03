# Riddra Sitemap Stock Coverage Fix Report

Date: 2026-05-02  
Timezone: Asia/Kolkata

## Goal

Fix the sitemap stock coverage gap only.

Target issue:

- `/stocks/reliance-industries` missing
- `/stocks/tcs` missing

Required to keep true:

- `/markets/news` stays excluded
- no duplicate stock URLs

## Root cause

The real bug was in the canonical stock slug source used by the sitemap.

The sitemap reads stock slugs through:

- [app/sitemap.ts](/Users/amitbhawani/Documents/Ai%20FinTech%20Platform/app/sitemap.ts)
- [lib/content.ts](/Users/amitbhawani/Documents/Ai%20FinTech%20Platform/lib/content.ts)

The underlying `stocks_master` read in `readCanonicalStockCatalogRows()` was using one unbounded Supabase REST query:

- [lib/content.ts](/Users/amitbhawani/Documents/Ai%20FinTech%20Platform/lib/content.ts)

But Supabase/PostgREST was only returning the first `1000` rows for that all-stock read.

Verified before the fix:

- active `stocks_master` count: `2157`
- returned row count from the sitemap stock-source query: `1000`
- `reliance-industries` present in DB: yes
- `tcs` present in DB: yes
- `reliance-industries` present in sitemap stock-source query: no
- `tcs` present in sitemap stock-source query: no

That is why the sitemap could still include:

- `infosys`
- `hdfc-bank`
- `icici-bank`
- `20-microns-limited`

while missing:

- `reliance-industries`
- `tcs`

Those two were simply falling beyond the first `1000` company-name-sorted rows.

## Files changed

- [app/sitemap.ts](/Users/amitbhawani/Documents/Ai%20FinTech%20Platform/app/sitemap.ts)
- [lib/content.ts](/Users/amitbhawani/Documents/Ai%20FinTech%20Platform/lib/content.ts)

## What changed

### 1. Fixed the canonical stock source pagination

Updated:

- [lib/content.ts](/Users/amitbhawani/Documents/Ai%20FinTech%20Platform/lib/content.ts)

`readCanonicalStockCatalogRows()` now pages through the full active `stocks_master` universe in `1000`-row batches instead of trusting a single capped response.

Observed local sitemap read after the fix:

- batch 1: `offset=0`, `limit=1000`
- batch 2: `offset=1000`, `limit=1000`
- batch 3: `offset=2000`, `limit=1000`

This restored the full stock URL set.

### 2. Hardened sitemap stock policy precedence

Updated:

- [app/sitemap.ts](/Users/amitbhawani/Documents/Ai%20FinTech%20Platform/app/sitemap.ts)

Canonical `stocks_master` slugs now stay authoritative for sitemap inclusion.

Admin SEO overrides are only allowed to suppress fallback-only stock records that exist outside the canonical stock catalog.

This was not the primary root cause of the missing Reliance/TCS URLs, but it is the correct hardening for canonical stock sitemap generation.

## Validation

### Type safety

- `npm run lint` -> PASS
- `npx tsc --noEmit` -> PASS

### Local sitemap route

- `http://127.0.0.1:3000/sitemap.xml` -> `200`

### Local sitemap content proof after the fix

Verified present:

- `/stocks/reliance-industries`
- `/stocks/tcs`
- `/stocks/infosys`
- `/stocks/hdfc-bank`
- `/stocks/icici-bank`
- `/stocks/20-microns-limited`

Verified absent:

- `/markets/news`

Duplicate stock URLs:

- none

Verified local stock URL count after the fix:

- `2157`

## Final result

The sitemap stock coverage bug is fixed in repo.

The missing stock URLs were caused by a capped `stocks_master` all-stock read, not by robots policy and not by duplicate-url generation.

Current stock sitemap generation now:

- includes the full active canonical stock set
- includes `reliance-industries`
- includes `tcs`
- still excludes `/markets/news`
- still emits no duplicate stock URLs

## Next action

Redeploy production, then rerun the hosted sitemap proof to confirm:

- `/stocks/reliance-industries`
- `/stocks/tcs`
- `/stocks/infosys`
- `/stocks/hdfc-bank`
- `/stocks/icici-bank`
- `/stocks/20-microns-limited`

are all present on hosted `sitemap.xml`.
