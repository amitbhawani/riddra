-- Riddra RLS verification for current existing tables
--
-- Safe for Supabase SQL Editor.
-- Read-only, idempotent, and avoids cross-statement CTE scope issues by using temp tables.
--
-- It reports:
-- - required current tables and whether they exist
-- - whether RLS is enabled
-- - whether the expected policy exists
-- - whether anon/authenticated grants match the intended model
-- - whether any public write policies exist
-- - optional future tables and whether they are intentionally skipped/missing
-- - an overall PASS / FAIL summary

drop table if exists temp_riddra_required_tables;
create temporary table temp_riddra_required_tables (
  table_name text primary key,
  access_model text not null,
  expected_policy text not null
) on commit drop;

insert into temp_riddra_required_tables (table_name, access_model, expected_policy)
values
  ('product_user_profiles', 'self_service', 'product_user_profiles_select_own'),
  ('product_user_watchlist_items', 'self_service', 'product_user_watchlist_items_select_own'),
  ('product_user_portfolio_holdings', 'self_service', 'product_user_portfolio_holdings_select_own'),
  ('benchmark_ohlcv_history', 'public_read', 'benchmark_ohlcv_history_public_read'),
  ('fund_nav_history', 'public_read', 'fund_nav_history_public_read'),
  ('market_series_status', 'public_read', 'market_series_status_public_read'),
  ('stock_quote_history', 'public_read', 'stock_quote_history_public_read'),
  ('stock_ohlcv_history', 'public_read', 'stock_ohlcv_history_public_read'),
  ('stock_fundamental_snapshots', 'public_read', 'stock_fundamental_snapshots_public_read'),
  ('stocks_master', 'public_read', 'stocks_master_public_read'),
  ('stock_price_history', 'public_read', 'stock_price_history_public_read'),
  ('stock_market_snapshot', 'public_read', 'stock_market_snapshot_public_read'),
  ('stock_valuation_metrics', 'public_read', 'stock_valuation_metrics_public_read'),
  ('stock_share_statistics', 'public_read', 'stock_share_statistics_public_read'),
  ('stock_financial_highlights', 'public_read', 'stock_financial_highlights_public_read'),
  ('stock_income_statement', 'public_read', 'stock_income_statement_public_read'),
  ('stock_balance_sheet', 'public_read', 'stock_balance_sheet_public_read'),
  ('stock_cash_flow', 'public_read', 'stock_cash_flow_public_read'),
  ('market_data_import_batches', 'admin_only', 'market_data_import_batches_admin_all'),
  ('market_data_import_rows', 'admin_only', 'market_data_import_rows_admin_all'),
  ('market_data_sources', 'admin_only', 'market_data_sources_admin_all'),
  ('market_refresh_runs', 'admin_only', 'market_refresh_runs_admin_all'),
  ('raw_yahoo_imports', 'admin_only', 'raw_yahoo_imports_admin_all'),
  ('stock_import_jobs', 'admin_only', 'stock_import_jobs_admin_all'),
  ('stock_import_errors', 'admin_only', 'stock_import_errors_admin_all'),
  ('stock_import_coverage', 'admin_only', 'stock_import_coverage_admin_all'),
  ('stock_import_activity_log', 'admin_only', 'stock_import_activity_log_admin_all'),
  ('stock_import_reconciliation', 'admin_only', 'stock_import_reconciliation_admin_all'),
  ('stock_data_quality_summary', 'admin_only', 'stock_data_quality_summary_admin_all'),
  ('stock_data_freshness', 'admin_only', 'stock_data_freshness_admin_all'),
  ('stock_import_alerts', 'admin_only', 'stock_import_alerts_admin_all'),
  ('cms_admin_records', 'admin_only', 'cms_admin_records_admin_all'),
  ('cms_admin_record_revisions', 'admin_only', 'cms_admin_record_revisions_admin_all'),
  ('cms_admin_global_modules', 'admin_only', 'cms_admin_global_modules_admin_all'),
  ('cms_admin_global_revisions', 'admin_only', 'cms_admin_global_revisions_admin_all'),
  ('cms_admin_refresh_jobs', 'admin_only', 'cms_admin_refresh_jobs_admin_all'),
  ('cms_admin_activity_log', 'admin_only', 'cms_admin_activity_log_admin_all'),
  ('cms_admin_editor_locks', 'admin_only', 'cms_admin_editor_locks_admin_all'),
  ('cms_admin_pending_approvals', 'admin_only', 'cms_admin_pending_approvals_admin_all'),
  ('cms_admin_import_batches', 'admin_only', 'cms_admin_import_batches_admin_all'),
  ('cms_admin_import_rows', 'admin_only', 'cms_admin_import_rows_admin_all'),
  ('cms_launch_config_sections', 'admin_only', 'cms_launch_config_sections_admin_all'),
  ('cms_media_assets', 'admin_only', 'cms_media_assets_admin_all'),
  ('cms_preview_sessions', 'admin_only', 'cms_preview_sessions_admin_all'),
  ('cms_record_versions', 'admin_only', 'cms_record_versions_admin_all'),
  ('cms_refresh_job_runs', 'admin_only', 'cms_refresh_job_runs_admin_all'),
  ('cms_membership_tiers', 'admin_only', 'cms_membership_tiers_admin_all'),
  ('product_system_settings', 'admin_only', 'product_system_settings_admin_all');

drop table if exists temp_riddra_optional_tables;
create temporary table temp_riddra_optional_tables (
  table_name text primary key
) on commit drop;

insert into temp_riddra_optional_tables (table_name)
values
  ('fund_holding_snapshots'),
  ('fund_sector_allocation_snapshots'),
  ('index_component_weight_snapshots'),
  ('mutual_fund_nav_history'),
  ('sector_performance_snapshots'),
  ('stock_shareholding_snapshots'),
  ('stock_forecast_snapshots'),
  ('stock_documents');

drop table if exists temp_riddra_required_status;
create temporary table temp_riddra_required_status as
select
  r.table_name,
  r.access_model,
  r.expected_policy,
  to_regclass('public.' || r.table_name) is not null as table_exists,
  coalesce(t.rowsecurity, false) as rls_enabled,
  exists (
    select 1
    from pg_policies p
    where p.schemaname = 'public'
      and p.tablename = r.table_name
      and p.policyname = r.expected_policy
  ) as expected_policy_exists,
  exists (
    select 1
    from information_schema.role_table_grants g
    where g.table_schema = 'public'
      and g.table_name = r.table_name
      and g.grantee = 'anon'
      and g.privilege_type = 'SELECT'
  ) as anon_select_granted,
  exists (
    select 1
    from information_schema.role_table_grants g
    where g.table_schema = 'public'
      and g.table_name = r.table_name
      and g.grantee = 'authenticated'
      and g.privilege_type = 'SELECT'
  ) as authenticated_select_granted,
  exists (
    select 1
    from information_schema.role_table_grants g
    where g.table_schema = 'public'
      and g.table_name = r.table_name
      and g.grantee = 'anon'
      and g.privilege_type in ('INSERT', 'UPDATE', 'DELETE', 'TRUNCATE', 'REFERENCES', 'TRIGGER')
  ) as anon_write_granted,
  exists (
    select 1
    from information_schema.role_table_grants g
    where g.table_schema = 'public'
      and g.table_name = r.table_name
      and g.grantee = 'authenticated'
      and g.privilege_type in ('INSERT', 'UPDATE', 'DELETE', 'TRUNCATE', 'REFERENCES', 'TRIGGER')
  ) as authenticated_write_granted,
  exists (
    select 1
    from pg_policies p
    where p.schemaname = 'public'
      and p.tablename = r.table_name
      and (
        p.roles @> array['anon']::name[]
        or p.roles = array['public']::name[]
      )
      and p.cmd in ('INSERT', 'UPDATE', 'DELETE', 'ALL')
  ) as has_public_write_policy,
  exists (
    select 1
    from pg_policies p
    where p.schemaname = 'public'
      and p.tablename = r.table_name
      and (
        p.roles @> array['anon']::name[]
        or p.roles = array['public']::name[]
      )
      and p.cmd = 'SELECT'
  ) as has_public_select_policy,
  exists (
    select 1
    from pg_policies p
    where p.schemaname = 'public'
      and p.tablename = r.table_name
      and p.roles @> array['authenticated']::name[]
      and p.cmd in ('INSERT', 'UPDATE', 'DELETE', 'ALL')
      and (
        (
          coalesce(p.qual, '') = ''
          and coalesce(p.with_check, '') = ''
        )
        or lower(coalesce(p.qual, '')) like '%using (true)%'
        or lower(coalesce(p.qual, '')) = 'true'
        or lower(coalesce(p.with_check, '')) like '%check (true)%'
        or lower(coalesce(p.with_check, '')) = 'true'
        or (
          position('auth.uid()' in coalesce(p.qual, '')) = 0
          and position('auth.uid()' in coalesce(p.with_check, '')) = 0
        )
      )
  ) as has_unscoped_authenticated_write_policy
from temp_riddra_required_tables r
left join pg_tables t
  on t.schemaname = 'public'
 and t.tablename = r.table_name;

drop table if exists temp_riddra_optional_status;
create temporary table temp_riddra_optional_status as
select
  o.table_name,
  to_regclass('public.' || o.table_name) is not null as table_exists
from temp_riddra_optional_tables o;

select
  table_name,
  access_model,
  expected_policy,
  table_exists,
  rls_enabled,
  expected_policy_exists,
  anon_select_granted,
  authenticated_select_granted,
  anon_write_granted,
  authenticated_write_granted,
  has_public_write_policy,
  has_public_select_policy,
  has_unscoped_authenticated_write_policy,
  case
    when not table_exists then 'SKIPPED_MISSING'
    when access_model = 'public_read'
      and rls_enabled
      and expected_policy_exists
      and anon_select_granted
      and authenticated_select_granted
      and not anon_write_granted
      and not authenticated_write_granted
      and not has_public_write_policy
      then 'PASS'
    when access_model = 'admin_only'
      and rls_enabled
      and not anon_select_granted
      and not authenticated_select_granted
      and not anon_write_granted
      and not authenticated_write_granted
      and not has_public_select_policy
      and not has_public_write_policy
      then 'PASS'
    when access_model = 'self_service'
      and rls_enabled
      and expected_policy_exists
      and not anon_select_granted
      and not anon_write_granted
      and not has_public_select_policy
      and not has_public_write_policy
      and not has_unscoped_authenticated_write_policy
      then 'PASS'
    else 'FAIL'
  end as status
from temp_riddra_required_status
order by access_model, table_name;

select
  table_name,
  table_exists,
  case
    when table_exists then 'OPTIONAL_PRESENT'
    else 'OPTIONAL_MISSING'
  end as status
from temp_riddra_optional_status
order by table_name;

select
  case
    when count(*) filter (
      where table_exists
        and (
          (access_model = 'public_read'
            and rls_enabled
            and expected_policy_exists
            and anon_select_granted
            and authenticated_select_granted
            and not anon_write_granted
            and not authenticated_write_granted
            and not has_public_write_policy)
          or
          (access_model = 'admin_only'
            and rls_enabled
            and not anon_select_granted
            and not authenticated_select_granted
            and not anon_write_granted
            and not authenticated_write_granted
            and not has_public_select_policy
            and not has_public_write_policy)
          or
          (access_model = 'self_service'
            and rls_enabled
            and expected_policy_exists
            and not anon_select_granted
            and not anon_write_granted
            and not has_public_select_policy
            and not has_public_write_policy
            and not has_unscoped_authenticated_write_policy)
        )
    ) = count(*) filter (where table_exists)
      then 'PASS'
    else 'FAIL'
  end as overall_verdict,
  count(*) as required_table_count,
  count(*) filter (where table_exists) as existing_required_tables,
  count(*) filter (where not table_exists) as skipped_missing_required_tables,
  count(*) filter (
    where table_exists
      and (
        (access_model = 'public_read'
          and rls_enabled
          and expected_policy_exists
          and anon_select_granted
          and authenticated_select_granted
          and not anon_write_granted
          and not authenticated_write_granted
          and not has_public_write_policy)
        or
        (access_model = 'admin_only'
          and rls_enabled
          and not anon_select_granted
          and not authenticated_select_granted
          and not anon_write_granted
          and not authenticated_write_granted
          and not has_public_select_policy
          and not has_public_write_policy)
        or
        (access_model = 'self_service'
          and rls_enabled
          and expected_policy_exists
          and not anon_select_granted
          and not anon_write_granted
          and not has_public_select_policy
          and not has_public_write_policy
          and not has_unscoped_authenticated_write_policy)
      )
  ) as passing_existing_required_tables,
  count(*) filter (
    where table_exists
      and not (
        (access_model = 'public_read'
          and rls_enabled
          and expected_policy_exists
          and anon_select_granted
          and authenticated_select_granted
          and not anon_write_granted
          and not authenticated_write_granted
          and not has_public_write_policy)
        or
        (access_model = 'admin_only'
          and rls_enabled
          and not anon_select_granted
          and not authenticated_select_granted
          and not anon_write_granted
          and not authenticated_write_granted
          and not has_public_select_policy
          and not has_public_write_policy)
        or
        (access_model = 'self_service'
          and rls_enabled
          and expected_policy_exists
          and not anon_select_granted
          and not anon_write_granted
          and not has_public_select_policy
          and not has_public_write_policy
          and not has_unscoped_authenticated_write_policy)
      )
  ) as failing_existing_required_tables,
  (
    select count(*)
    from temp_riddra_optional_status
    where table_exists
  ) as optional_present_count,
  (
    select count(*)
    from temp_riddra_optional_status
    where not table_exists
  ) as optional_missing_count
from temp_riddra_required_status;
