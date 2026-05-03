# Riddra Legacy Archive Staging Simulation Report

Date: 2026-04-30  
Scope: simulation only, based on [docs/riddra-legacy-stock-cleanup-plan.md](/Users/amitbhawani/Documents/Ai%20FinTech%20Platform/docs/riddra-legacy-stock-cleanup-plan.md), live Supabase reads, and current localhost route checks.

## Executive Summary

This was a **staging/simulation-only** review of archiving the overlapping legacy stock `instruments`.

Nothing was archived, deleted, detached, or rewritten.

Main conclusion:

- **Archive-first is still the correct cleanup strategy**
- **Do not execute production cleanup yet**
- **Do not delete or detach the 22 legacy instrument rows yet**
- The public stock detail route is now strong enough to survive a future archive-first move because it is canonical-first.
- But the broader content, publishable binding, sitemap/listing, and editor/source-backing layers are **still legacy-linked**, so production cleanup remains **migration-gated**.

## 1. Simulated Archive Scope

Live canonical overlap set confirmed from `stocks_master` with `instrument_id` populated:

- total overlapping legacy stock instruments: `22`

These are the current cleanup candidates:

1. `asian-paints`
2. `axis-bank`
3. `bajaj-auto`
4. `bajaj-finance`
5. `bharti-airtel`
6. `hcltech`
7. `hdfc-bank`
8. `hindustan-unilever`
9. `icici-bank`
10. `infosys`
11. `itc`
12. `kotak-mahindra-bank`
13. `larsen-and-toubro`
14. `maruti-suzuki`
15. `ntpc`
16. `power-grid`
17. `reliance-industries`
18. `state-bank-of-india`
19. `sun-pharma`
20. `tata-motors`
21. `tcs`
22. `wipro`

## 2. What Was Simulated

This simulation assumed only the **Phase A soft archive** from the cleanup plan:

- `public.instruments.status = 'archived'`
- rows remain physically present
- `stocks_master.instrument_id` remains intact
- no delete
- no detach
- no publishable record rewrite

This is the right simulation boundary because it tests the first cleanup wave without crossing into destructive or hard-to-rollback changes.

## 3. Public URL Resolution Safety

### Current route design status

The public stock detail route has already been migrated to:

- `stocks_master` first
- `instruments` fallback second

Reference:

- [docs/riddra-stock-route-migration-implementation-report.md](/Users/amitbhawani/Documents/Ai%20FinTech%20Platform/docs/riddra-stock-route-migration-implementation-report.md)

That means an archive-first move should not break public detail URLs **as long as**:

1. canonical slug identity stays unchanged
2. `stocks_master` rows remain active
3. legacy instrument rows remain present for rollback/fallback

### Previous broad route proof already available

The strongest existing route evidence is already in:

- [docs/riddra-stock-route-breadth-check-report.md](/Users/amitbhawani/Documents/Ai%20FinTech%20Platform/docs/riddra-stock-route-breadth-check-report.md)

That audit verified:

- `100` stock slugs tested
- included the full `22` legacy stock pages
- `200`: `100`
- `404`: `0`
- `500`: `0`

So from the public stock-page perspective, the current canonical-first route layer is already broad enough to support an archive-first cleanup later.

## 4. Admin / Editor Stability Check

Current local runtime checks in this simulation:

- `GET /admin` -> `200`
- `GET /admin/market-data/import-control-center` -> `200`
- `GET /admin/content/stocks/reliance-industries` -> `200`

This confirms that the current admin shell and a representative stock editor route are healthy **before** cleanup.

Important limitation:

This does **not** mean all admin/editor source-backing is ready for legacy archive execution.

It only confirms:

- the current routes are healthy
- no new runtime regression was introduced before cleanup

## 5. Redirect / Slug Preservation Check

Live publishable stock binding read confirms:

- all `22` stock publishable records still use:
  - `source_table = instruments`
- each has a preserved:
  - `canonical_slug`
  - `canonical_symbol`

Examples from live read:

- `reliance-industries` -> `RELIANCE`
- `tcs` -> `TCS`
- `icici-bank` -> `ICICIBANK`
- `tata-motors` -> `TATAMOTORS`

This means the slug preservation plan is still valid:

1. keep `stocks_master.slug` as canonical route slug
2. keep publishable `canonical_slug` intact
3. keep archived legacy rows present
4. do not rename slugs during cleanup

Result:

- redirect layer is **not** the first blocker
- source-backing migration is the real blocker

## 6. Current Risk Assessment

### Safe in a future archive-first wave

- public stock detail route resolution
- canonical slug preservation
- rollback identity preservation

### Not yet safe for production cleanup

- publishable stock source-backing
- listing pages / stock hub dependency chain
- sitemap / broader stock discovery surfaces
- admin/editor paths that still assume legacy-backed source rows

Why this is still blocked:

- all `22` publishable stock records still point to `source_table = instruments`
- the cleanup plan itself correctly warns that the stock listing, sitemap, and editor/source-backing migration is still pending

So the correct decision remains:

- **simulate now**
- **do not execute production archive yet**

## 7. Staging SQL Status

The staging SQL in [docs/riddra-legacy-stock-cleanup-plan.md](/Users/amitbhawani/Documents/Ai%20FinTech%20Platform/docs/riddra-legacy-stock-cleanup-plan.md) remains valid.

The simulation did **not** execute:

- backup SQL
- candidate-set SQL
- soft-archive update SQL

But the candidate assumptions were validated against live data:

- expected candidate count: `22`
- live overlapping legacy rows: `22`

## 8. Production SQL Status

Per plan, production SQL remains:

- manual approval required
- archive-first only
- no delete
- no `stocks_master.instrument_id` detach

That remains the correct production stance.

## 9. Rollback SQL Confirmation

Rollback from the plan is still sufficient because the first cleanup wave is only a status change.

Rollback principle:

```sql
update public.instruments
set
  status = 'active',
  updated_at = now()
where id in (
  select instrument_id
  from cleanup_backup.legacy_stock_archive_candidates__staging_20260429
);
```

Why rollback remains safe:

- no row delete
- no source-row detach
- no `stocks_master.instrument_id` mutation
- no canonical slug rewrite

## 10. Final Simulation Verdict

### GO

GO for a **future archive-first staging run only**, under these exact limits:

- archive, do not delete
- keep `stocks_master.instrument_id`
- preserve publishable stock records
- preserve legacy instrument rows for rollback

### NO-GO

NO-GO for production cleanup today, because:

1. all `22` stock publishable bindings still point to `source_table = instruments`
2. legacy-backed listing/sitemap/editor source migration is still incomplete
3. detaching or deleting legacy rows now would be premature

## 11. Recommended Next Step

Before any real archive execution:

1. migrate stock listing and sitemap consumers off legacy `instruments`
2. migrate publishable stock source-backing away from hard legacy dependency
3. repeat a pre-archive staging pass
4. then run the **archive-only** SQL in staging
5. only after soak verification, consider production manual approval

