# Riddra 0050 Data Quality Live Verification Report

Last updated: 2026-04-30

## Migration status

Migration applied:

- `0050_stock_data_quality_summary.sql`

Live project:

- `jawojjmapxnevywrmmiq`

## PostgREST visibility

Service-role verification succeeded for:

- `public.stock_data_quality_summary`

Verification result before row generation:

- service-role `select(...).limit(1)` worked
- row count was `0`

That confirms the table is live and queryable through the same app runtime path used by the importer and admin dashboards.

## Durable row generation

Ran:

```bash
npm run stocks:generate-quality-summary
```

The first sandboxed run hit transient `fetch failed` behavior while paging large Supabase reads, so I hardened the generator script to:

- page more gently
- retry transient fetch failures

Then reran the script successfully with unrestricted network access to the live Supabase project.

## Live durable metrics

Confirmed after generation:

- row count: `2157`
- missing snapshot count: `0`
- average quality score: `74.96`
- stocks above `75`: `2155`
- stocks below `50`: `2`

Score distribution:

- score `25`: `2` stocks
- score `75`: `2154` stocks
- score `95`: `1` stock

This is consistent with the current price-data-focused model:

- historical prices
- latest snapshot
- valuation metrics
- financial statements
- no recent errors bonus

Because Yahoo protected fundamentals are still blocked at scale, the current durable score remains intentionally price-data-focused.

## Import Control Center confirmation

The control center code path is already durable-first when `stock_data_quality_summary` rows exist.

Confirmed in [lib/admin-import-control-center.ts](/Users/amitbhawani/Documents/Ai%20FinTech%20Platform/lib/admin-import-control-center.ts):

- `loadDurableQualityRows(...)` reads `stock_data_quality_summary`
- `useDurableQualityRows = durableQualityRows.length > 0`
- when durable rows are present, these control-center aggregates come from durable rows:
  - average data quality score
  - stocks above `75`
  - stocks below `50`
  - missing snapshot count
  - worst `20` stocks

Live route check:

- `/admin/market-data/import-control-center` -> `200`

So the control center now has durable rows available and will prefer them over runtime-only fallback.

## Files changed during verification

- [scripts/generate-stock-data-quality-summary.mjs](/Users/amitbhawani/Documents/Ai%20FinTech%20Platform/scripts/generate-stock-data-quality-summary.mjs)
- [docs/riddra-0050-data-quality-live-verification-report.md](/Users/amitbhawani/Documents/Ai%20FinTech%20Platform/docs/riddra-0050-data-quality-live-verification-report.md)

## Validation

- `npm run lint` -> PASS
- `npx tsc --noEmit` -> PASS

## Conclusion

`0050_stock_data_quality_summary.sql` is now live and usable.

Confirmed:

- PostgREST visibility is working
- service-role access is working
- durable rows were generated for all `2157` active stocks
- missing snapshot count is `0`
- the import control center has a working durable-first read path
