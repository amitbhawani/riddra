# Riddra Yahoo DB Verification Report

Last verified: 2026-04-28

## Scope

This report verifies the target database readiness for the Yahoo Finance import system against these repo migrations:

- `db/migrations/0044_yahoo_finance_schema_foundation.sql`
- `db/migrations/0045_yahoo_raw_import_metadata_columns.sql`
- `db/migrations/0046_stock_price_history_yahoo_daily_unique.sql`
- `db/migrations/0047_stock_market_snapshot_nullable_price.sql`

This check intentionally does **not** run a live Yahoo import. It verifies whether the database state exposed to the app is ready for live Yahoo imports.

## Verification Method

The live check was performed using the same Supabase API path the app uses:

- service-role Supabase client from `.env.local`
- real `select('*').limit(1)` queries against each Yahoo-related table

This is stricter than `head: true` or metadata-only checks. A table is treated as ready only if the app can actually query it through the live API path.

## 1. Applied Migration Status

| Migration | Expected purpose | Live status | Evidence |
|---|---|---|---|
| `0044_yahoo_finance_schema_foundation.sql` | Create Yahoo schema foundation tables | Not verified as applied | All Yahoo tables created by this migration returned `PGRST205` (`Could not find the table ... in the schema cache`) when queried through the live Supabase API path |
| `0045_yahoo_raw_import_metadata_columns.sql` | Add Yahoo raw import metadata columns | Not verified as applied | Base table `raw_yahoo_imports` itself is not queryable through the live API path |
| `0046_stock_price_history_yahoo_daily_unique.sql` | Add Yahoo daily unique index on `stock_price_history` | Not verified as applied | Base table `stock_price_history` is not queryable through the live API path, so the index cannot be live-verified |
| `0047_stock_market_snapshot_nullable_price.sql` | Drop `NOT NULL` from `stock_market_snapshot.price` | Not verified as applied | Base table `stock_market_snapshot` is not queryable through the live API path, so the column change cannot be live-verified |

### Applied migration verdict

From the app's perspective, the Yahoo migrations are **not effectively applied** in the target database right now.

That can mean one of two things:

1. the migrations were never applied to the target DB, or
2. the tables exist in Postgres but are not exposed through the current Supabase/PostgREST schema cache

For production readiness, both cases must be treated as **not ready**.

## 2. Existing Yahoo-Related Tables

### Repo-defined Yahoo tables

The repo expects these Yahoo tables from `0044`:

- `stocks_master`
- `raw_yahoo_imports`
- `stock_company_profile`
- `stock_price_history`
- `stock_market_snapshot`
- `stock_valuation_metrics`
- `stock_share_statistics`
- `stock_financial_highlights`
- `stock_income_statement`
- `stock_balance_sheet`
- `stock_cash_flow`
- `stock_dividends`
- `stock_splits`
- `stock_corporate_actions`
- `stock_earnings_events`
- `stock_earnings_trend`
- `stock_analyst_ratings`
- `stock_holders_summary`
- `stock_holders_detail`
- `stock_options_contracts`
- `stock_news`
- `stock_technical_indicators`
- `stock_performance_metrics`
- `stock_growth_metrics`
- `stock_health_ratios`
- `stock_riddra_scores`
- `stock_import_jobs`
- `stock_import_job_items`
- `stock_import_errors`
- `stock_import_coverage`

### Live app-visible status

| Table group | Live status |
|---|---|
| Yahoo master/profile tables | Not queryable |
| Yahoo raw import table | Not queryable |
| Yahoo price/snapshot tables | Not queryable |
| Yahoo valuation/statistics tables | Not queryable |
| Yahoo financial statement tables | Not queryable |
| Yahoo actions/earnings/holders/options/news tables | Not queryable |
| Yahoo calculated-layer tables | Not queryable |
| Yahoo import monitoring tables | Not queryable |

### Existing live Yahoo-related tables verdict

No Yahoo-specific tables from migrations `0044` to `0047` are currently queryable through the target Supabase API path.

## 3. Missing Tables, If Any

The following tables are currently **missing from the live app-visible schema** or **missing from the PostgREST schema cache**:

- `stocks_master`
- `raw_yahoo_imports`
- `stock_company_profile`
- `stock_price_history`
- `stock_market_snapshot`
- `stock_valuation_metrics`
- `stock_share_statistics`
- `stock_financial_highlights`
- `stock_income_statement`
- `stock_balance_sheet`
- `stock_cash_flow`
- `stock_dividends`
- `stock_splits`
- `stock_corporate_actions`
- `stock_earnings_events`
- `stock_earnings_trend`
- `stock_analyst_ratings`
- `stock_holders_summary`
- `stock_holders_detail`
- `stock_options_contracts`
- `stock_news`
- `stock_technical_indicators`
- `stock_performance_metrics`
- `stock_growth_metrics`
- `stock_health_ratios`
- `stock_riddra_scores`
- `stock_import_jobs`
- `stock_import_job_items`
- `stock_import_errors`
- `stock_import_coverage`

## 4. Critical Indexes Present or Missing

### Repo-required critical indexes

The Yahoo migrations define or rely on critical indexes such as:

- `stocks_master_yahoo_symbol_unique_idx`
- `raw_yahoo_imports_module_name_idx`
- `raw_yahoo_imports_request_type_idx`
- `raw_yahoo_imports_status_idx`
- `stock_price_history_stock_trade_date_idx`
- `stock_price_history_symbol_trade_date_idx`
- `stock_price_history_yahoo_daily_stock_trade_date_unique_idx`
- `stock_market_snapshot_stock_trade_date_idx`
- `stock_news_external_news_id_unique_idx`
- `stock_import_jobs_status_started_idx`

### Live verification result

These indexes could **not** be verified live.

Reason:

- the base Yahoo tables are not queryable through the live Supabase API path
- direct catalog inspection via exposed Supabase REST schemas is not available from this app path

Additional note:

- a direct attempt to inspect `pg_catalog.pg_indexes` through Supabase REST returned `PGRST106` because only `public` and `graphql_public` are exposed there

### Index verdict

Critical Yahoo indexes are **not live-verified**. Until the tables themselves are queryable and the indexes are confirmed in SQL Editor or direct Postgres access, treat index readiness as **not confirmed**.

## 5. RLS / Security Concerns

### What could be verified

- No Yahoo tables are currently queryable through the live app path, so there is no evidence that these new Yahoo tables are publicly exposed yet.

### What could not be verified

- actual RLS policies on Yahoo tables
- explicit grants on Yahoo tables
- whether anon can read/write any of these tables once they become visible

### Security concerns to address before go-live

These tables should be reviewed carefully before live imports begin:

- `raw_yahoo_imports`
- `stock_import_jobs`
- `stock_import_job_items`
- `stock_import_errors`
- `stock_import_coverage`

These contain operational/provider/debug data and should generally not be publicly readable.

### RLS / security verdict

RLS and grants are **not yet verified** for the Yahoo schema. Security review is still required before production use.

## 6. Can Live Yahoo Imports Safely Begin?

**No.**

Live Yahoo imports should **not** begin yet.

### Why

- the app cannot query any Yahoo tables through the current live Supabase API path
- migration application status is not confirmed
- critical indexes are not live-verified
- RLS/grant posture is not live-verified

## Evidence Summary

The live service-role verification returned `PGRST205` for every Yahoo table checked, including:

- `stocks_master`
- `raw_yahoo_imports`
- `stock_price_history`
- `stock_market_snapshot`
- `stock_import_jobs`
- `stock_import_errors`
- `stock_import_coverage`

That is sufficient to block live Yahoo imports from a production-readiness perspective.

## Recommended Next Steps

1. Apply or reapply migrations `0044` through `0047` in the target database.
2. Refresh the Supabase/PostgREST schema cache if the tables already exist in Postgres.
3. Re-run verification using real `select('*').limit(1)` queries, not metadata-only or `head: true` checks.
4. Verify critical indexes directly in Supabase SQL Editor or a direct Postgres connection.
5. Review RLS policies and grants before enabling live Yahoo imports.

## Final Verification Verdict

- Repo migrations exist: **Yes**
- Live Yahoo tables queryable by the app: **No**
- Critical indexes live-verified: **No**
- RLS/security verified: **No**
- Live Yahoo imports can safely begin: **No**
