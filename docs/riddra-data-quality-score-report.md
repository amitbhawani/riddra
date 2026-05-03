# Riddra Data Quality Score Report

Last updated: 2026-04-29

## Objective

Add an import coverage and data quality score per stock, while making it explicit that the current score is **price-data-focused** because Yahoo protected fundamentals remain blocked or degraded at scale.

## What Changed

### 1. Added durable summary schema

Created migration:

- `db/migrations/0050_stock_data_quality_summary.sql`

New table:

- `public.stock_data_quality_summary`

Fields included:

- `stock_id`
- `yahoo_symbol`
- `has_historical_prices`
- `historical_first_date`
- `historical_last_date`
- `historical_row_count`
- `has_latest_snapshot`
- `has_valuation_metrics`
- `has_financial_statements`
- `missing_module_count`
- `warning_count`
- `error_count`
- `overall_data_score`
- `last_import_at`
- `updated_at`

Also added:

- `score_model`
- `score_notes`

Indexes added for:

- `yahoo_symbol`
- `overall_data_score`
- `last_import_at`
- `updated_at`

### 2. Added runtime stock quality scoring

Updated:

- `lib/admin-stock-import-dashboard.ts`

Each stock now gets a computed quality summary derived from:

- `stock_import_coverage`
- `stock_import_errors`
- latest import job timing
- current module completion state

The shared dashboard row now carries:

- `dataQualityScore`
- `missingModuleCount`
- `warningCount`
- `errorCount`
- `hasRecentErrors`
- `priceDataFocusedScore`

### 3. Score model

Current scoring model:

- historical prices: `50`
- latest snapshot: `25`
- valuation metrics: `10`
- financial statements: `10`
- no recent import errors: `5`

Recent error window:

- `14` days

Why this is framed as price-data-focused:

- historical coverage and latest snapshot are the only broad Yahoo lanes currently safe at scale
- protected valuation/statistics/highlights are still degraded
- financial statements remain batch-disabled

So the score is honest about the current system:

- strong price coverage can score well
- blocked Yahoo fundamentals are **not** falsely represented as complete

## Import Control Center Changes

Updated:

- `lib/admin-import-control-center.ts`
- `components/admin/admin-import-control-center-client.tsx`
- `app/admin/market-data/import-control-center/page.tsx`

New data quality visibility:

- average data quality score
- stocks above `75`
- stocks below `50`
- missing snapshot count
- worst `20` stocks by quality
- score model note explaining the price-data-focused weighting

The worst-stock list now shows:

- stock name / symbol / Yahoo symbol
- score out of `100`
- whether historical and snapshot coverage exist
- missing module count
- warning count
- error count
- last import
- next recommended action

## Important Behavior Notes

1. The score is currently computed at runtime from durable import evidence.
2. The new summary table is ready for future importer upserts, but this change does not force writes on page load.
3. Missing Yahoo protected fundamentals are reflected as missing or degraded coverage, not silently treated as healthy data.
4. Control-center rendering remains safe even if the new table has not been populated yet.

## Files Changed

- `db/migrations/0050_stock_data_quality_summary.sql`
- `lib/admin-stock-import-dashboard.ts`
- `lib/admin-import-control-center.ts`
- `components/admin/admin-import-control-center-client.tsx`
- `app/admin/market-data/import-control-center/page.tsx`

## Validation

- `npm run lint` -> PASS
- `npx tsc --noEmit` -> PASS
- `GET /admin/market-data/import-control-center` -> `200`

## Conclusion

Riddra now has a clear per-stock quality scoring model that matches the real current Yahoo rollout:

- price data is heavily weighted because it is the safest broad lane
- blocked fundamentals are clearly treated as incomplete
- the control center now surfaces strong stocks, weak stocks, and missing snapshot gaps in a way admins can act on immediately
