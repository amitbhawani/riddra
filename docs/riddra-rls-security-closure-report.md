# Riddra RLS Security Closure Report

Date: 2026-05-01

## Scope

This pass focused on two security goals:

1. Stop the shared Supabase read client from silently upgrading to `service_role`.
2. Add a local migration that introduces explicit RLS for:
   - `product_user_profiles` and related self-service user tables
   - public stock and market-data read tables
   - admin/internal market-data control tables
   - CMS/admin durable tables

This pass does **not** apply the migration live by itself.

## Files Changed

- `lib/supabase/admin.ts`
- `db/migrations/0057_rls_security_closure.sql`

## What Changed

### 1. Service-role general read leak removed in code

`createSupabaseReadClient()` in `lib/supabase/admin.ts` now always uses the public anon key.

Before:
- it used `service_role` whenever admin env vars were present
- this meant ordinary server reads could bypass RLS accidentally

After:
- it always uses `supabaseAnonKey`
- public and general read paths now depend on explicit RLS / grants

### 2. Local RLS migration created

Migration:
- `db/migrations/0057_rls_security_closure.sql`

It creates:

#### User-owned access

- `public.riddra_is_admin()` helper
- own-row RLS for:
  - `product_user_profiles`
  - `product_user_watchlist_items`
  - `product_user_portfolio_holdings`

Behavior:
- signed-in users can read/update their own profile
- signed-in users can access only their own watchlist and portfolio rows
- admins can manage all of these rows

#### Public read-only stock / market data

Read-only `SELECT` policies for `anon` and `authenticated` on:
- `stock_quote_history`
- `stock_ohlcv_history`
- `benchmark_ohlcv_history`
- `fund_nav_history`
- `market_series_status`
- `stock_fundamental_snapshots`
- `stock_shareholding_snapshots`
- `fund_holding_snapshots`
- `fund_sector_allocation_snapshots`
- `sector_performance_snapshots`
- `index_component_weight_snapshots`
- `mutual_fund_nav_history`
- `stocks_master`
- `stock_price_history`
- `stock_market_snapshot`
- `stock_valuation_metrics`
- `stock_share_statistics`
- `stock_financial_highlights`
- `stock_income_statement`
- `stock_balance_sheet`
- `stock_cash_flow`

#### Admin-only market-data control / telemetry

Admin-only RLS for:
- `market_data_import_batches`
- `market_data_import_rows`
- `market_data_sources`
- `market_refresh_runs`
- `raw_yahoo_imports`
- `stock_import_jobs`
- `stock_import_errors`
- `stock_import_coverage`
- `stock_import_activity_log`
- `stock_import_reconciliation`
- `stock_data_quality_summary`
- `stock_data_freshness`
- `stock_import_alerts`

#### Admin-only CMS / system tables

Admin-only RLS for:
- `cms_admin_records`
- `cms_admin_record_revisions`
- `cms_admin_global_modules`
- `cms_admin_global_revisions`
- `cms_admin_refresh_jobs`
- `cms_admin_activity_log`
- `cms_admin_editor_locks`
- `cms_admin_pending_approvals`
- `cms_admin_import_batches`
- `cms_admin_import_rows`
- `cms_launch_config_sections`
- `cms_media_assets`
- `cms_preview_sessions`
- `cms_record_versions`
- `cms_refresh_job_runs`
- `cms_membership_tiers`
- `product_system_settings`

## Policies Created

### User self-service policies

- `product_user_profiles_select_own`
- `product_user_profiles_insert_own`
- `product_user_profiles_update_own`
- `product_user_watchlist_items_own_access`
- `product_user_portfolio_holdings_own_access`

### Public read-only stock / market data policies

- `stock_quote_history_public_read`
- `stock_ohlcv_history_public_read`
- `benchmark_ohlcv_history_public_read`
- `fund_nav_history_public_read`
- `market_series_status_public_read`
- `stock_fundamental_snapshots_public_read`
- `stock_shareholding_snapshots_public_read`
- `fund_holding_snapshots_public_read`
- `fund_sector_allocation_snapshots_public_read`
- `sector_performance_snapshots_public_read`
- `index_component_weight_snapshots_public_read`
- `mutual_fund_nav_history_public_read`
- `stocks_master_public_read`
- `stock_price_history_public_read`
- `stock_market_snapshot_public_read`
- `stock_valuation_metrics_public_read`
- `stock_share_statistics_public_read`
- `stock_financial_highlights_public_read`
- `stock_income_statement_public_read`
- `stock_balance_sheet_public_read`
- `stock_cash_flow_public_read`

### Admin-only market-data policies

- `market_data_import_batches_admin_all`
- `market_data_import_rows_admin_all`
- `market_data_sources_admin_all`
- `market_refresh_runs_admin_all`
- `raw_yahoo_imports_admin_all`
- `stock_import_jobs_admin_all`
- `stock_import_errors_admin_all`
- `stock_import_coverage_admin_all`
- `stock_import_activity_log_admin_all`
- `stock_import_reconciliation_admin_all`
- `stock_data_quality_summary_admin_all`
- `stock_data_freshness_admin_all`
- `stock_import_alerts_admin_all`

### Admin-only CMS / system policies

- `cms_admin_records_admin_all`
- `cms_admin_record_revisions_admin_all`
- `cms_admin_global_modules_admin_all`
- `cms_admin_global_revisions_admin_all`
- `cms_admin_refresh_jobs_admin_all`
- `cms_admin_activity_log_admin_all`
- `cms_admin_editor_locks_admin_all`
- `cms_admin_pending_approvals_admin_all`
- `cms_admin_import_batches_admin_all`
- `cms_admin_import_rows_admin_all`
- `cms_launch_config_sections_admin_all`
- `cms_media_assets_admin_all`
- `cms_preview_sessions_admin_all`
- `cms_record_versions_admin_all`
- `cms_refresh_job_runs_admin_all`
- `cms_membership_tiers_admin_all`
- `product_system_settings_admin_all`

## Security Risk Removed

### Removed

- General server-side read paths no longer inherit `service_role` automatically.
- Public stock-data reads can now be moved behind explicit read-only RLS instead of privilege bypass.
- User profile ownership boundaries are now defined in a migration instead of being implied only in application code.

### Still Remaining

This is the important honest caveat:

The platform is **not fully closed yet** against service-role overuse.

Reason:
- `lib/cms-durable-state.ts` still uses `createSupabaseAdminClient()` for many ordinary user-scoped durable operations.
- `lib/user-product-store.ts` still depends on those admin-client-backed helpers for normal signed-in profile, watchlist, portfolio, and settings flows.

That means:
- the shared public read client leak is fixed
- but the durable user layer still has admin-client usage beyond strict “admin writes and background jobs only”

## Residual Risk

Severity: High

Residual issue:
- service-role use is now narrower, but not yet restricted only to admin writes and background jobs

Exact remaining area:
- normal user durable-state reads/writes routed through `cms-durable-state` and `user-product-store`

## Final Verdict

### Secure or not?

**Not fully secure yet.**

More precisely:
- the most dangerous general-read privilege leak is fixed locally
- the RLS closure migration is prepared locally
- but the system is not fully at the target state until ordinary signed-in user durable operations stop relying on the admin client

## Recommended Next Step

Before calling the Supabase access model fully secure:

1. Apply `0057_rls_security_closure.sql` in Supabase.
2. Refactor ordinary signed-in user durable profile/watchlist/portfolio reads and writes to use session-scoped Supabase access instead of `createSupabaseAdminClient()`.
3. Re-test:
   - public stock reads
   - self-profile access
   - admin CMS access
   - background import jobs
