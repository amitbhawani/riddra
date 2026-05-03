-- Riddra RLS diagnostic query for existing required tables
--
-- Safe for Supabase SQL Editor.
-- Read-only, idempotent, and avoids cross-statement CTE scope issues by using temp tables.
--
-- Output columns:
-- - table_name
-- - rls_enabled
-- - missing_expected_policy
-- - has_public_write_grant
-- - has_public_write_policy
-- - anon_grants
-- - authenticated_grants
-- - expected_category
-- - failure_reason

drop table if exists temp_riddra_required_tables_diag;
create temporary table temp_riddra_required_tables_diag (
  table_name text primary key,
  expected_category text not null,
  expected_policy text not null
) on commit drop;

insert into temp_riddra_required_tables_diag (table_name, expected_category, expected_policy)
values
  ('product_user_profiles', 'self_service', 'product_user_profiles_select_own'),
  ('product_user_watchlist_items', 'self_service', 'product_user_watchlist_items_own_access'),
  ('product_user_portfolio_holdings', 'self_service', 'product_user_portfolio_holdings_own_access'),
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

drop table if exists temp_riddra_grants_diag;
create temporary table temp_riddra_grants_diag as
select
  g.table_name,
  g.grantee,
  string_agg(g.privilege_type, ', ' order by g.privilege_type) as grants
from information_schema.role_table_grants g
where g.table_schema = 'public'
  and g.grantee in ('anon', 'authenticated')
group by g.table_name, g.grantee;

drop table if exists temp_riddra_status_diag;
create temporary table temp_riddra_status_diag as
select
  r.table_name,
  r.expected_category,
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
      and g.grantee in ('anon', 'authenticated')
      and g.privilege_type in ('INSERT', 'UPDATE', 'DELETE', 'TRUNCATE', 'REFERENCES', 'TRIGGER')
  ) as has_public_write_grant,
  exists (
    select 1
    from pg_policies p
    where p.schemaname = 'public'
      and p.tablename = r.table_name
      and (
        p.roles @> array['anon']::name[]
        or p.roles @> array['authenticated']::name[]
        or p.roles = array['public']::name[]
      )
      and p.cmd in ('INSERT', 'UPDATE', 'DELETE', 'ALL')
  ) as has_public_write_policy,
  coalesce(ag.grants, '') as anon_grants,
  coalesce(au.grants, '') as authenticated_grants
from temp_riddra_required_tables_diag r
left join pg_tables t
  on t.schemaname = 'public'
 and t.tablename = r.table_name
left join temp_riddra_grants_diag ag
  on ag.table_name = r.table_name
 and ag.grantee = 'anon'
left join temp_riddra_grants_diag au
  on au.table_name = r.table_name
 and au.grantee = 'authenticated';

select
  table_name,
  rls_enabled,
  case
    when expected_category = 'admin_only' then false
    else not expected_policy_exists
  end as missing_expected_policy,
  has_public_write_grant,
  has_public_write_policy,
  anon_grants,
  authenticated_grants,
  expected_category,
  case
    when not table_exists then 'required_table_missing'
    when not rls_enabled then 'rls_disabled'
    when expected_category <> 'admin_only' and not expected_policy_exists then 'missing_expected_policy'
    when expected_category = 'public_read'
      and not anon_select_granted
      and not authenticated_select_granted
      then 'missing_public_select_grants_for_anon_and_authenticated'
    when expected_category = 'public_read'
      and not anon_select_granted
      then 'missing_public_select_grant_for_anon'
    when expected_category = 'public_read'
      and not authenticated_select_granted
      then 'missing_public_select_grant_for_authenticated'
    when expected_category in ('admin_only', 'self_service')
      and anon_select_granted
      and authenticated_select_granted
      then 'unexpected_public_select_grants_for_anon_and_authenticated'
    when expected_category in ('admin_only', 'self_service')
      and anon_select_granted
      then 'unexpected_public_select_grant_for_anon'
    when expected_category in ('admin_only', 'self_service')
      and authenticated_select_granted
      then 'unexpected_public_select_grant_for_authenticated'
    when has_public_write_grant and has_public_write_policy
      then 'public_write_grant_and_policy_present'
    when has_public_write_grant
      then 'public_write_grant_present'
    when has_public_write_policy
      then 'public_write_policy_present'
    else 'pass'
  end as failure_reason
from temp_riddra_status_diag
where table_exists
  and (
    not rls_enabled
    or (expected_category <> 'admin_only' and not expected_policy_exists)
    or (expected_category = 'public_read' and not anon_select_granted)
    or (expected_category = 'public_read' and not authenticated_select_granted)
    or (expected_category in ('admin_only', 'self_service') and anon_select_granted)
    or (expected_category in ('admin_only', 'self_service') and authenticated_select_granted)
    or has_public_write_grant
    or has_public_write_policy
  )
order by expected_category, table_name;
