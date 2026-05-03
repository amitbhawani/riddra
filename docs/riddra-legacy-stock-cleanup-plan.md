# Riddra Legacy Stock Cleanup Plan

Last updated: 2026-04-29

## Purpose

This document defines a safe, non-destructive cleanup plan for the legacy stock listing layer after the first public route migration to the canonical stock resolver.

This is a planning document only.

It does **not**:
- delete `instruments`
- deactivate legacy listings today
- change public route behavior automatically
- run any cleanup SQL

The guiding principle is:

**archive overlapping legacy stock rows, do not delete them, and only do that after the remaining listing/CMS dependencies are migrated or explicitly accepted.**

## Current State Summary

Based on the live stock-layer audit and route migration verification:

- `stocks_master` active NSE universe: `2157`
- active legacy stock `instruments`: `22`
- public stock detail route is now canonical-first and instrument-fallback
- public stock listing breadth is still legacy/publishable driven
- admin stock editor and some CMS source-backing paths still depend on the old `instruments` layer

This means:
- the duplicate-universe risk is reduced
- the remaining risk is route/listing/editor dependency on legacy source rows

## 1. Which `instruments` Overlap With `stocks_master`

The following active legacy stock instruments overlap the canonical stock universe and are cleanup candidates for future archive:

| Legacy instrument slug | Legacy symbol | Canonical `stocks_master` symbol | Canonical Yahoo symbol |
|---|---|---|---|
| `asian-paints` | `ASIANPAINT` | `ASIANPAINT` | `ASIANPAINT.NS` |
| `axis-bank` | `AXISBANK` | `AXISBANK` | `AXISBANK.NS` |
| `bajaj-auto` | `BAJAJ-AUTO` | `BAJAJ-AUTO` | `BAJAJ-AUTO.NS` |
| `bajaj-finance` | `BAJFINANCE` | `BAJFINANCE` | `BAJFINANCE.NS` |
| `bharti-airtel` | `BHARTIARTL` | `BHARTIARTL` | `BHARTIARTL.NS` |
| `hcltech` | `HCLTECH` | `HCLTECH` | `HCLTECH.NS` |
| `hdfc-bank` | `HDFCBANK` | `HDFCBANK` | `HDFCBANK.NS` |
| `hindustan-unilever` | `HINDUNILVR` | `HINDUNILVR` | `HINDUNILVR.NS` |
| `icici-bank` | `ICICIBANK` | `ICICIBANK` | `ICICIBANK.NS` |
| `infosys` | `INFY` | `INFY` | `INFY.NS` |
| `itc` | `ITC` | `ITC` | `ITC.NS` |
| `kotak-mahindra-bank` | `KOTAKBANK` | `KOTAKBANK` | `KOTAKBANK.NS` |
| `larsen-and-toubro` | `LT` | `LT` | `LT.NS` |
| `maruti-suzuki` | `MARUTI` | `MARUTI` | `MARUTI.NS` |
| `ntpc` | `NTPC` | `NTPC` | `NTPC.NS` |
| `power-grid` | `POWERGRID` | `POWERGRID` | `POWERGRID.NS` |
| `reliance-industries` | `RELIANCE` | `RELIANCE` | `RELIANCE.NS` |
| `state-bank-of-india` | `SBIN` | `SBIN` | `SBIN.NS` |
| `sun-pharma` | `SUNPHARMA` | `SUNPHARMA` | `SUNPHARMA.NS` |
| `tata-motors` | `TMCV` | `TMCV` | `TMCV.NS` |
| `tcs` | `TCS` | `TCS` | `TCS.NS` |
| `wipro` | `WIPRO` | `WIPRO` | `WIPRO.NS` |

Summary:
- overlapping active legacy stock instruments: `22`
- active legacy-only stock instruments not found in `stocks_master`: `0`

## 2. Which `instruments` Should Be Archived, Not Deleted

Recommended future archive scope:

- all `22` overlapping active stock `instruments`

Why archive instead of delete:

1. public route rollback stays easy
2. existing `source_row_id` references remain valid
3. `companies` and `stock_pages` children are preserved automatically
4. CMS/editor source-backing does not break immediately
5. canonical resolver fallback can still use the archived row if needed during transition

Recommended archive phases:

### Phase A: soft archive only

- set legacy stock `instruments.status = 'archived'`
- keep rows physically present
- keep `stocks_master.instrument_id` intact
- keep `companies` and `stock_pages` intact

### Phase B: detach source backing later

Only after listing, sitemap, and CMS source-backing migration is complete:

- migrate stock publishable bindings away from `source_table = instruments`
- optionally null `stocks_master.instrument_id`
- leave archived instrument rows in place for rollback history

## 3. Which Records Must Be Preserved For Redirects / SEO

These records must be preserved before and during cleanup:

### Route identity and canonical slugs

- `stocks_master.slug`
- `stocks_master.symbol`
- `stocks_master.yahoo_symbol`
- `publishable_content_records.canonical_slug`
- `publishable_content_records.canonical_symbol`

### Existing public page and CMS truth

- underlying stock publishable CMS records that feed `publishable_content_records`
- stock-family admin-managed records
- stock-family revisions / approvals
- any `public_href`, `canonical_route`, and SEO fields tied to the stock CMS layer

### Legacy route rollback support

- `instruments.id`
- `companies.instrument_id`
- `stock_pages.instrument_id`
- `stocks_master.instrument_id`

Important note:

Do **not** remove or null legacy source linkage during the first cleanup step.  
Preserve it until:
- stock listings are canonical-backed
- sitemap is canonical-backed
- admin source-backing no longer requires `instruments`

## 4. How To Keep Old Slugs Working

Old stock slugs should keep working through this sequence:

1. Keep `stocks_master.slug` as the canonical route slug.
2. Keep the canonical stock resolver active on public stock routes.
3. Preserve existing publishable CMS stock slugs.
4. Preserve archived legacy `instruments` rows during the first cleanup stage.
5. Do not rename slugs during cleanup.

If a future canonical slug ever differs from a legacy slug:

- add an explicit redirect layer
- keep the legacy slug in metadata or a dedicated redirect table
- update sitemap and canonical tags only after redirects are live

For the current overlap set, slugs already align closely enough that redirect creation is **not** the first cleanup blocker.

## 5. How To Avoid Breaking CMS / Editor Pages

Current caution:

- admin stock detail loaders still flow through `getStocks()` / `getStock()`
- `lib/admin-content-registry.ts` still consumes the public stock loader path
- `lib/publishable-content.ts` still treats stock rows as source-backed content
- development/public fallback paths still know about `instruments`

Therefore the cleanup must be staged like this:

### Before archive

Complete or verify:

1. public detail route migration: done
2. stock list / stock hub migration: pending
3. sitemap / stock index migration: pending
4. admin stock editor source-backing migration: pending
5. publishable stock source-backing migration away from legacy-only assumptions: pending

### During archive

- archive legacy `instruments`
- do **not** delete them
- do **not** remove `source_row_id`
- do **not** remove `stocks_master.instrument_id`

### After soak period

Only after stable staging and production verification:

- migrate CMS source bindings to canonical source or adapter
- optionally stop using legacy `instrument` ids operationally

## 6. SQL Plan For Staging Only

The staging plan is intentionally archive-first and reversible.

### 6.1 Backup first

```sql
create schema if not exists cleanup_backup;

create table cleanup_backup.instruments__legacy_stock_cleanup_staging_20260429 as
select *
from public.instruments
where instrument_type = 'stock';

create table cleanup_backup.companies__legacy_stock_cleanup_staging_20260429 as
select *
from public.companies
where instrument_id in (
  select id from public.instruments where instrument_type = 'stock'
);

create table cleanup_backup.stock_pages__legacy_stock_cleanup_staging_20260429 as
select *
from public.stock_pages
where instrument_id in (
  select id from public.instruments where instrument_type = 'stock'
);
```

### 6.2 Build explicit cleanup candidate set

```sql
create table if not exists cleanup_backup.legacy_stock_archive_candidates__staging_20260429 as
select
  i.id as instrument_id,
  i.slug,
  i.symbol,
  sm.id as stocks_master_id,
  sm.slug as stocks_master_slug,
  sm.symbol as stocks_master_symbol,
  sm.yahoo_symbol
from public.instruments i
join public.stocks_master sm
  on sm.instrument_id = i.id
  or lower(sm.slug) = lower(i.slug)
  or upper(sm.symbol) = upper(i.symbol)
where i.instrument_type = 'stock'
  and i.status = 'active'
  and sm.exchange = 'NSE'
  and sm.status = 'active';
```

### 6.3 Pre-archive verification

```sql
select count(*) as candidate_count
from cleanup_backup.legacy_stock_archive_candidates__staging_20260429;

select slug, symbol, stocks_master_slug, yahoo_symbol
from cleanup_backup.legacy_stock_archive_candidates__staging_20260429
order by slug;
```

Expected today:
- `candidate_count = 22`

### 6.4 Soft archive only

```sql
begin;

update public.instruments
set
  status = 'archived',
  updated_at = now()
where id in (
  select instrument_id
  from cleanup_backup.legacy_stock_archive_candidates__staging_20260429
);

commit;
```

### 6.5 Post-archive checks

```sql
select status, count(*)
from public.instruments
where instrument_type = 'stock'
group by status
order by status;

select count(*) as archived_overlap_count
from public.instruments
where instrument_type = 'stock'
  and status = 'archived'
  and id in (
    select instrument_id
    from cleanup_backup.legacy_stock_archive_candidates__staging_20260429
  );
```

Important note:

This staging SQL does **not** delete anything and does **not** detach `stocks_master.instrument_id`.

## 7. SQL Plan For Production

**Manual approval required. Do not run automatically.**

### 7.1 Production backup first

```sql
create schema if not exists cleanup_backup;

create table cleanup_backup.instruments__legacy_stock_cleanup_prod_YYYYMMDD as
select *
from public.instruments
where instrument_type = 'stock';

create table cleanup_backup.companies__legacy_stock_cleanup_prod_YYYYMMDD as
select *
from public.companies
where instrument_id in (
  select id from public.instruments where instrument_type = 'stock'
);

create table cleanup_backup.stock_pages__legacy_stock_cleanup_prod_YYYYMMDD as
select *
from public.stock_pages
where instrument_id in (
  select id from public.instruments where instrument_type = 'stock'
);
```

### 7.2 Production candidate set

```sql
create table if not exists cleanup_backup.legacy_stock_archive_candidates__prod_YYYYMMDD as
select
  i.id as instrument_id,
  i.slug,
  i.symbol,
  sm.id as stocks_master_id,
  sm.slug as stocks_master_slug,
  sm.symbol as stocks_master_symbol,
  sm.yahoo_symbol
from public.instruments i
join public.stocks_master sm
  on sm.instrument_id = i.id
  or lower(sm.slug) = lower(i.slug)
  or upper(sm.symbol) = upper(i.symbol)
where i.instrument_type = 'stock'
  and i.status = 'active'
  and sm.exchange = 'NSE'
  and sm.status = 'active';
```

### 7.3 Manual approval gate

Before archive, confirm all of these are true:

- canonical stock detail routes are stable
- stock listing/hub migration is complete or explicitly accepted
- sitemap behavior is verified
- admin stock editor paths are verified
- publishable stock source-backing no longer requires legacy active rows for normal operation

### 7.4 Production soft archive

```sql
begin;

update public.instruments
set
  status = 'archived',
  updated_at = now()
where id in (
  select instrument_id
  from cleanup_backup.legacy_stock_archive_candidates__prod_YYYYMMDD
);

commit;
```

### 7.5 Do not do this in the first production cleanup

Do **not** run this yet:

```sql
-- not approved for first cleanup wave
delete from public.instruments where instrument_type = 'stock';
```

Do **not** null out:

```sql
-- future-only, not part of first cleanup wave
update public.stocks_master
set instrument_id = null
where instrument_id in (...);
```

## 8. Rollback Plan

If staging or production archive causes regressions:

### 8.1 Immediate rollback

```sql
update public.instruments
set
  status = 'active',
  updated_at = now()
where instrument_type = 'stock'
  and id in (
    select instrument_id
    from cleanup_backup.legacy_stock_archive_candidates__staging_20260429
  );
```

Production uses the equivalent production candidate table.

### 8.2 Data restore fallback

If any row was changed unexpectedly:

```sql
delete from public.instruments
where instrument_type = 'stock'
  and id in (
    select id
    from cleanup_backup.instruments__legacy_stock_cleanup_prod_YYYYMMDD
  );

insert into public.instruments
select *
from cleanup_backup.instruments__legacy_stock_cleanup_prod_YYYYMMDD;
```

Only use full restore if the simple status rollback is insufficient.

### 8.3 App verification after rollback

Recheck:

- `/stocks/reliance-industries`
- `/stocks/tcs`
- `/stocks/infosys`
- `/stocks/hdfc-bank`
- `/stocks/icici-bank`
- `/stocks/20-microns-limited`
- `/stocks`
- `/admin/content/stocks/reliance-industries`
- `/admin/market-data/import-control-center`

## 9. Final Checklist Before Cleanup

All of the following should be true before staging archive:

- [ ] `stocks_master` remains the canonical stock universe.
- [ ] public stock detail route migration is complete and verified.
- [ ] stock listing page behavior is verified after canonical migration or explicitly accepted.
- [ ] sitemap / stock discovery behavior is verified.
- [ ] admin stock editor still works without depending on active legacy status.
- [ ] publishable stock source-backing assumptions are reviewed.
- [ ] backup/export completed for `instruments`, `companies`, and `stock_pages`.
- [ ] candidate overlap set reviewed and approved.
- [ ] no deletion SQL is included in the first cleanup wave.
- [ ] rollback SQL is ready.
- [ ] staging soak succeeds before production approval.
- [ ] production run is manually approved.

## Recommended Decision

Proceed only with:

- **archive-first cleanup**
- **staging before production**
- **no deletion**
- **no source-link detachment in wave one**

Do not treat this as a data-deletion task.  
Treat it as a reversible compatibility cleanup after route migration.
