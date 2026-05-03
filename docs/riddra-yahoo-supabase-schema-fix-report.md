# Riddra Yahoo Supabase Schema Fix Report

Last updated: 2026-04-28 IST

## Verdict

**GO** for a controlled live one-stock Yahoo import from a **schema visibility** perspective.

No Yahoo import was run in this task. This report only covers schema diagnosis, repair, and service-role visibility.

## 1. Connected Supabase Project / Database

The app is currently pointed at:

- `NEXT_PUBLIC_SUPABASE_URL=https://jawojjmapxnevywrmmiq.supabase.co`
- project ref: `jawojjmapxnevywrmmiq`

Evidence source:

- `.env.local`
- `.env.production.local`
- live Supabase SQL Editor session in project `jawojjmapxnevywrmmiq`

## 2. What Was Broken Before the Fix

Before the repair:

- service-role `select('*').limit(1)` returned `PGRST205` for every Yahoo table
- direct SQL inspection of `information_schema.tables` in the same Supabase project showed that the Yahoo tables were physically missing from `public`
- non-Yahoo market-data tables such as `market_data_sources`, `market_data_import_batches`, `stock_ohlcv_history`, `stock_quote_history`, and `cms_admin_activity_log` were already readable through the same service-role path

That proved the issue was **not** general auth/network failure. It was a **target database schema visibility gap**: the Yahoo tables simply were not present in the app's actual database.

## 3. Migration 0044-0047 Status

Repo files existed locally:

- `db/migrations/0044_yahoo_finance_schema_foundation.sql`
- `db/migrations/0045_yahoo_raw_import_metadata_columns.sql`
- `db/migrations/0046_stock_price_history_yahoo_daily_unique.sql`
- `db/migrations/0047_stock_market_snapshot_nullable_price.sql`

However, before the repair, the target database did **not** reflect those migrations effectively:

- the Yahoo tables from those migrations were absent from `public`
- PostgREST could not resolve them and returned `PGRST205`

Conclusion:

- **0044-0047 were not effectively applied to the connected production database path before this fix**

## 4. Fix Applied

An idempotent repair SQL was executed directly in the Supabase SQL Editor for project `jawojjmapxnevywrmmiq`.

The repair did the following safely:

- ensured `pgcrypto` extension availability
- seeded `public.data_sources` with `yahoo_finance`
- created/backfilled `public.stocks_master`
- created the required Yahoo tables in `public`
- created the critical Yahoo price-history unique index for duplicate protection
- granted the required privileges to `service_role`
- enabled RLS on the newly created public Yahoo tables
- reloaded PostgREST schema visibility with:
  - `notify pgrst, 'reload schema';`

## 5. Existing Yahoo-Related Tables After the Fix

Physical table check in Supabase SQL Editor now returns all required Yahoo tables in schema `public`:

- `stocks_master`
- `raw_yahoo_imports`
- `stock_price_history`
- `stock_market_snapshot`
- `stock_valuation_metrics`
- `stock_financial_highlights`
- `stock_income_statement`
- `stock_balance_sheet`
- `stock_cash_flow`
- `stock_import_coverage`
- `stock_import_errors`
- `stock_import_jobs`
- `stock_import_job_items`

Missing Yahoo tables after the repair:

- none from the required list

## 6. Service-Role Visibility Check

The acceptance test was re-run using the app's real service-role credentials against the live project:

```json
{
  "url": "https://jawojjmapxnevywrmmiq.supabase.co",
  "results": [
    { "table": "stocks_master", "status": 200, "ok": true, "rows": 1 },
    { "table": "raw_yahoo_imports", "status": 200, "ok": true, "rows": 0 },
    { "table": "stock_price_history", "status": 200, "ok": true, "rows": 0 },
    { "table": "stock_market_snapshot", "status": 200, "ok": true, "rows": 0 },
    { "table": "stock_valuation_metrics", "status": 200, "ok": true, "rows": 0 },
    { "table": "stock_financial_highlights", "status": 200, "ok": true, "rows": 0 },
    { "table": "stock_income_statement", "status": 200, "ok": true, "rows": 0 },
    { "table": "stock_balance_sheet", "status": 200, "ok": true, "rows": 0 },
    { "table": "stock_cash_flow", "status": 200, "ok": true, "rows": 0 },
    { "table": "stock_import_coverage", "status": 200, "ok": true, "rows": 0 },
    { "table": "stock_import_errors", "status": 200, "ok": true, "rows": 0 },
    { "table": "stock_import_jobs", "status": 200, "ok": true, "rows": 0 },
    { "table": "stock_import_job_items", "status": 200, "ok": true, "rows": 0 }
  ]
}
```

Result:

- **no `PGRST205` remains**
- every required Yahoo table now supports service-role `select('*').limit(1)`

## 7. Critical Indexes

SQL-side index inspection confirmed the presence of critical Yahoo indexes in `public`, including:

- `raw_yahoo_imports_pkey`
- `raw_yahoo_imports_imported_at_idx`
- `stock_price_history_pkey`
- `stock_price_history_yahoo_daily_stock_trade_date_unique_idx`
- `stock_market_snapshot_pkey`
- `stock_income_statement_pkey`
- `stock_balance_sheet_pkey`
- `stock_cash_flow_pkey`
- `stock_import_coverage_pkey`
- `stock_import_errors_pkey`
- `stock_import_jobs_pkey`
- `stock_import_job_items_pkey`

Notes:

- the most important duplicate-safety index for the first live Yahoo OHLCV run is present:
  - `stock_price_history_yahoo_daily_stock_trade_date_unique_idx`
- some logical uniqueness rules may be represented as constraint-backed indexes with auto-generated names depending on how Supabase/Postgres stored them
- no missing critical Yahoo table index was found that would block a controlled one-stock pilot

## 8. Schema Location

All required Yahoo tables are now in:

- schema: `public`

This is the schema expected by the app's Supabase REST client path.

## 9. RLS / Security Findings

RLS status inspection confirmed:

- RLS is enabled on all required Yahoo tables in `public`

Verified tables with `relrowsecurity = true`:

- `stocks_master`
- `raw_yahoo_imports`
- `stock_price_history`
- `stock_market_snapshot`
- `stock_valuation_metrics`
- `stock_financial_highlights`
- `stock_income_statement`
- `stock_balance_sheet`
- `stock_cash_flow`
- `stock_import_coverage`
- `stock_import_errors`
- `stock_import_jobs`
- `stock_import_job_items`

Security concern level:

- **acceptable for admin/service-role importer usage**

Notes:

- RLS being enabled is safer than leaving these tables open by default
- the service-role path still works, which is expected
- this report did not audit end-user anon/authenticated policies in depth because the Yahoo importer uses server-side service-role access

## 10. Final Diagnosis

Root cause:

- the app was connected to the correct Supabase project
- the Yahoo migration files existed in the repo
- but the connected production database did not actually contain the Yahoo tables in `public`
- therefore PostgREST schema cache correctly returned `PGRST205`

Fix result:

- Yahoo schema now exists in the correct project and correct schema
- PostgREST schema cache has been reloaded
- service-role visibility is restored

## 11. Acceptance Criteria Check

- Every required Yahoo table returns a successful service-role select query: **PASS**
- No `PGRST205` remains: **PASS**
- Report clearly says GO or NO-GO for live one-stock Yahoo import: **PASS**

## 12. Final Go / No-Go

**GO** for a controlled **one-stock Yahoo live import** preflight.

Recommended next step:

- run the RELIANCE.NS live Yahoo import test only
- verify writes into:
  - `raw_yahoo_imports`
  - `stock_price_history`
  - `stock_market_snapshot`
  - `stock_valuation_metrics`
  - `stock_financial_highlights`
  - `stock_income_statement`
  - `stock_balance_sheet`
  - `stock_cash_flow`
  - `stock_import_coverage`
  - `stock_import_errors`

Not done in this task:

- no Yahoo import executed
- no batch import executed
