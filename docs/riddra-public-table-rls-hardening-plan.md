# Riddra Supabase Public-Table RLS Hardening Plan

Last updated: 2026-04-30  
Status: planned only, migration drafted but not applied

## Scope

Supabase Security Advisor is flagging these `public` schema tables with `RLS Disabled in Public`.

Internal / operational:

- `public.index_refresh_runs`
- `public.index_tracker_snapshots`
- `public.data_sources`
- `public.account_state_snapshots`

Public content / read-only:

- `public.instruments`
- `public.companies`
- `public.stock_pages`
- `public.mutual_funds`
- `public.ipos`
- `public.ipo_pages`
- `public.mutual_fund_pages`
- `public.tracked_indexes`

## Important note on migration numbering

The prompt suggested `0051_harden_public_table_rls.sql`, but `0051` is already used in this repo.

So the proposed migration created in this pass is:

- [db/migrations/0052_harden_public_table_rls.sql](/Users/amitbhawani/Documents/Ai%20FinTech%20Platform/db/migrations/0052_harden_public_table_rls.sql)

## Access audit summary

## Browser client exposure audit

Direct browser-side Supabase access for these flagged tables was **not found**.

The browser client in this repo:

- uses the anon key only
- is currently used for auth/session behavior, not these tables

That means the main runtime access patterns for the flagged tables are:

- server-rendered public pages using `createSupabaseServerClient()`
- server/admin/service-role code using `createSupabaseAdminClient()`
- development preview / CMS helper reads using `createSupabaseReadClient()`
- importer / durable job / refresh code using service-role/admin clients

## Table-by-table audit

| Table | Runtime usage | Exact files / functions | Public read actually needed? | Recommended mode |
|---|---|---|---|---|
| `index_refresh_runs` | internal operational only | No direct app-code reads found; table is schema/refresh telemetry only | No | Internal-only RLS |
| `index_tracker_snapshots` | public server reads + internal writes | [lib/index-content.ts](/Users/amitbhawani/Documents/Ai%20FinTech%20Platform/lib/index-content.ts) `getPersistedIndexSnapshotsForSlugs`; [lib/market-data-durable-store.ts](/Users/amitbhawani/Documents/Ai%20FinTech%20Platform/lib/market-data-durable-store.ts) snapshot upserts; market refresh/index ingestion writes | Not for direct anon/browser access | Internal-only RLS |
| `data_sources` | public server fallback read + internal writes | [lib/source-registry.ts](/Users/amitbhawani/Documents/Ai%20FinTech%20Platform/lib/source-registry.ts) `getSourceRegistry`; [lib/index-tracker-foundation.ts](/Users/amitbhawani/Documents/Ai%20FinTech%20Platform/lib/index-tracker-foundation.ts) `ensureTrackedIndexFoundationData` | No, because public source registry page already falls back to CSV | Internal-only RLS |
| `account_state_snapshots` | internal per-user durable state | [lib/account-state-durable-store.ts](/Users/amitbhawani/Documents/Ai%20FinTech%20Platform/lib/account-state-durable-store.ts) `readDurableAccountStateLane`, `writeDurableAccountStateLane`; consumed by billing/portfolio/broker/support/subscription/account-continuity memory stores | No | Internal-only RLS |
| `instruments` | public stock route reads, canonical fallback, dev preview, admin import matching, Yahoo stock bootstrap | [lib/content.ts](/Users/amitbhawani/Documents/Ai%20FinTech%20Platform/lib/content.ts) `readStockCatalogSourceRows`, `readStockDetailSourceRow`; [lib/publishable-content.ts](/Users/amitbhawani/Documents/Ai%20FinTech%20Platform/lib/publishable-content.ts) development preview fallback; [lib/canonical-stock-resolver.ts](/Users/amitbhawani/Documents/Ai%20FinTech%20Platform/lib/canonical-stock-resolver.ts) fallback resolution; [lib/tradingview-datafeed-server.ts](/Users/amitbhawani/Documents/Ai%20FinTech%20Platform/lib/tradingview-datafeed-server.ts); [lib/operator-cms-imports.ts](/Users/amitbhawani/Documents/Ai%20FinTech%20Platform/lib/operator-cms-imports.ts); [lib/yahoo-finance-service.ts](/Users/amitbhawani/Documents/Ai%20FinTech%20Platform/lib/yahoo-finance-service.ts) stock bootstrap | Yes, but only stock/equity/share rows | Public read-only RLS |
| `companies` | public stock joins + canonical fallback + Yahoo bootstrap | [lib/content.ts](/Users/amitbhawani/Documents/Ai%20FinTech%20Platform/lib/content.ts) joined through `instruments`; [lib/canonical-stock-resolver.ts](/Users/amitbhawani/Documents/Ai%20FinTech%20Platform/lib/canonical-stock-resolver.ts) `findCompaniesRow`; [lib/yahoo-finance-service.ts](/Users/amitbhawani/Documents/Ai%20FinTech%20Platform/lib/yahoo-finance-service.ts) `createStockMasterFromInstrument` | Yes, but only rows attached to public-readable stock instruments | Public read-only RLS |
| `stock_pages` | public stock summaries / SEO joins | [lib/content.ts](/Users/amitbhawani/Documents/Ai%20FinTech%20Platform/lib/content.ts) joined in `readStockCatalogSourceRows`, `readStockDetailSourceRow` | Yes, but only rows attached to public-readable stock instruments | Public read-only RLS |
| `mutual_funds` | public mutual-fund pages, dev preview, admin import matching | [lib/content.ts](/Users/amitbhawani/Documents/Ai%20FinTech%20Platform/lib/content.ts) `readFundCatalogSourceRows`; [lib/publishable-content.ts](/Users/amitbhawani/Documents/Ai%20FinTech%20Platform/lib/publishable-content.ts) development preview fallback; [lib/operator-cms-imports.ts](/Users/amitbhawani/Documents/Ai%20FinTech%20Platform/lib/operator-cms-imports.ts) | Yes | Public read-only RLS |
| `mutual_fund_pages` | public mutual-fund summaries / SEO joins | [lib/content.ts](/Users/amitbhawani/Documents/Ai%20FinTech%20Platform/lib/content.ts) joined in `readFundCatalogSourceRows` | Yes | Public read-only RLS |
| `ipos` | public IPO pages, dev preview, admin import matching | [lib/content.ts](/Users/amitbhawani/Documents/Ai%20FinTech%20Platform/lib/content.ts) `getIpos`; [lib/publishable-content.ts](/Users/amitbhawani/Documents/Ai%20FinTech%20Platform/lib/publishable-content.ts) development preview fallback; [lib/operator-cms-imports.ts](/Users/amitbhawani/Documents/Ai%20FinTech%20Platform/lib/operator-cms-imports.ts) | Yes | Public read-only RLS |
| `ipo_pages` | public IPO summaries / SEO joins | [lib/content.ts](/Users/amitbhawani/Documents/Ai%20FinTech%20Platform/lib/content.ts) joined in `getIpos` | Yes | Public read-only RLS |
| `tracked_indexes` | public index pages + internal refresh writes | [lib/index-content.ts](/Users/amitbhawani/Documents/Ai%20FinTech%20Platform/lib/index-content.ts) `getPersistedIndexSnapshotsForSlugs`, `getPersistedIndexWeightRostersForSlugs`; [lib/market-data-durable-store.ts](/Users/amitbhawani/Documents/Ai%20FinTech%20Platform/lib/market-data-durable-store.ts) tracked index writes; [lib/market-data-refresh.ts](/Users/amitbhawani/Documents/Ai%20FinTech%20Platform/lib/market-data-refresh.ts); [lib/index-tracker-foundation.ts](/Users/amitbhawani/Documents/Ai%20FinTech%20Platform/lib/index-tracker-foundation.ts) | Yes, but only current public tracked index slugs | Public read-only RLS |

## Why the internal/public split is safe

### Internal-only

These can stay closed to anon/authenticated because the app already uses:

- service-role/admin clients
- durable background/server flows
- or a file/content fallback

This applies to:

- `index_refresh_runs`
- `index_tracker_snapshots`
- `data_sources`
- `account_state_snapshots`

### Public read-only

These do back public routes and route-building logic, so they need explicit SELECT policies:

- `instruments`
- `companies`
- `stock_pages`
- `mutual_funds`
- `mutual_fund_pages`
- `ipos`
- `ipo_pages`
- `tracked_indexes`

But they do **not** need public writes, so the migration grants only `SELECT`.

## Proposed migration

Draft migration:

- [db/migrations/0052_harden_public_table_rls.sql](/Users/amitbhawani/Documents/Ai%20FinTech%20Platform/db/migrations/0052_harden_public_table_rls.sql)

### Policy choices

#### Internal-only tables

- enable RLS
- revoke all privileges from `anon` and `authenticated`
- add deny-all policies for `anon` and `authenticated`

#### Public content tables

- enable RLS
- revoke all privileges from `anon` and `authenticated`
- grant only `SELECT`
- create explicit `SELECT` policies

### Narrowing choices used in the draft

- `instruments`: only `instrument_type in ('stock', 'equity', 'share')`
- `companies`: only rows attached to public-readable stock instruments
- `stock_pages`: only rows attached to public-readable stock instruments
- `tracked_indexes`: only current public slugs:
  - `nifty50`
  - `sensex`
  - `banknifty`
  - `finnifty`

## Risk notes

### 1. `createSupabaseReadClient()` can mask RLS gaps

[lib/supabase/admin.ts](/Users/amitbhawani/Documents/Ai%20FinTech%20Platform/lib/supabase/admin.ts) currently lets `createSupabaseReadClient()` use the service-role key when admin env exists.

That means:

- pages can still work even if public anon policies are wrong
- a simple “page still loads” check is not enough to prove the RLS setup is correct

So verification must include direct anon/service-role behavior checks, not just UI smoke checks.

### 2. `index_tracker_snapshots` is intentionally internal-only

Public index pages currently can read through trusted server-side/admin paths in this app.

If you later run the app in an environment that has only the anon server client and no admin env, index pages may need a separate policy review.

For this hardening pass, the safer position is still:

- keep `index_tracker_snapshots` internal-only

### 3. `data_sources` public pages rely on fallback

[lib/source-registry.ts](/Users/amitbhawani/Documents/Ai%20FinTech%20Platform/lib/source-registry.ts) already falls back to `data/source_registry.csv` if the table read fails or returns no data.

So closing `data_sources` to anon/authenticated should not break the public methodology/source registry surface.

### 4. No public writes should remain

After applying the migration:

- anon/authenticated should not be able to insert/update/delete these tables
- only service-role / server-side trusted paths should write

## Verification checklist

### Security Advisor

- Confirm `RLS Disabled in Public` warnings disappear for:
  - `index_refresh_runs`
  - `index_tracker_snapshots`
  - `data_sources`
  - `account_state_snapshots`
  - `instruments`
  - `companies`
  - `stock_pages`
  - `mutual_funds`
  - `ipos`
  - `ipo_pages`
  - `mutual_fund_pages`
  - `tracked_indexes`

### PostgREST schema refresh

After applying the migration:

```sql
notify pgrst, 'reload schema';
```

### Public route checks

Verify these still load:

- `/stocks/reliance-industries`
- `/stocks/20-microns-limited`
- `/mutual-funds`
- `/mutual-funds/[known-slug]`
- `/ipo`
- `/ipo/[known-slug]`
- `/nifty50`
- `/sensex`
- `/methodology`

### Admin checks

Verify these still load:

- `/admin`
- `/admin/sources`
- `/admin/indexes`
- `/admin/content/stocks/reliance-industries`

### Durable/import/refresh checks

Verify these still work:

- Yahoo import helpers that backfill from `instruments` / `companies`
- index refresh foundation and tracked index update flows
- market refresh jobs
- search index registry generation

### Negative write checks

Using anon/authenticated contexts, confirm:

- `insert` into `instruments` fails
- `update` on `companies` fails
- `delete` from `tracked_indexes` fails
- `insert` into `account_state_snapshots` fails

### Service-role checks

Using service-role, confirm:

- `select` still works for all listed tables
- `insert/update/upsert` still works for:
  - `tracked_indexes`
  - `index_tracker_snapshots`
  - `data_sources`
  - `account_state_snapshots`

## Recommended rollout sequence

1. Review the draft migration SQL.
2. Confirm the internal-only stance for:
   - `index_tracker_snapshots`
   - `data_sources`
3. Apply the migration in Supabase SQL Editor.
4. Reload PostgREST schema cache.
5. Run the verification checklist above.
6. Only after verification, treat the Security Advisor warnings as resolved.

## Final recommendation

Proceed with the drafted migration, but verify it in two layers:

1. **UI/runtime behavior**
2. **direct anon vs service-role access behavior**

That second layer is important because current admin-enabled server reads can hide RLS mistakes if we only test through pages.
