-- Riddra public grant cleanup
--
-- Important:
-- - This migration only adjusts object-level GRANT/REVOKE state.
-- - It does not modify any existing RLS policies.
-- - It does not touch service_role.
-- - Every table operation is guarded with to_regclass(...) so missing tables are skipped safely.
--
-- Why this exists:
-- - diagnostics showed many existing tables still had direct grants for anon/authenticated
-- - that produces failures such as:
--   - unexpected_public_select_grant_for_authenticated
--   - public_write_grant_present
--
-- Grant model applied here:
-- - admin_only tables:
--   revoke all from anon, authenticated
-- - self_service tables:
--   revoke all from anon, authenticated
-- - public_read tables:
--   revoke all from anon, authenticated
--   then grant select only to anon, authenticated

do $$
declare
  table_name text;
begin
  -- Admin-only control, import, monitoring, and CMS/system tables.
  foreach table_name in array array[
    'market_data_import_batches',
    'market_data_import_rows',
    'market_data_sources',
    'market_refresh_runs',
    'raw_yahoo_imports',
    'stock_import_jobs',
    'stock_import_errors',
    'stock_import_coverage',
    'stock_import_activity_log',
    'stock_import_reconciliation',
    'stock_data_quality_summary',
    'stock_data_freshness',
    'stock_import_alerts',
    'cms_admin_records',
    'cms_admin_record_revisions',
    'cms_admin_global_modules',
    'cms_admin_global_revisions',
    'cms_admin_refresh_jobs',
    'cms_admin_activity_log',
    'cms_admin_editor_locks',
    'cms_admin_pending_approvals',
    'cms_admin_import_batches',
    'cms_admin_import_rows',
    'cms_launch_config_sections',
    'cms_media_assets',
    'cms_preview_sessions',
    'cms_record_versions',
    'cms_refresh_job_runs',
    'cms_membership_tiers',
    'product_system_settings'
  ] loop
    if to_regclass(format('public.%I', table_name)) is not null then
      execute format('revoke all on public.%I from anon, authenticated', table_name);
    end if;
  end loop;
end
$$;

do $$
declare
  table_name text;
begin
  -- Self-service tables: revoke direct grants so RLS is the only row-level access path.
  foreach table_name in array array[
    'product_user_profiles',
    'product_user_watchlist_items',
    'product_user_portfolio_holdings'
  ] loop
    if to_regclass(format('public.%I', table_name)) is not null then
      execute format('revoke all on public.%I from anon, authenticated', table_name);
    end if;
  end loop;
end
$$;

do $$
declare
  table_name text;
begin
  -- Public read-only tables: keep only SELECT for anon/authenticated.
  foreach table_name in array array[
    'benchmark_ohlcv_history',
    'fund_nav_history',
    'market_series_status',
    'stock_quote_history',
    'stock_ohlcv_history',
    'stock_fundamental_snapshots',
    'stocks_master',
    'stock_price_history',
    'stock_market_snapshot',
    'stock_valuation_metrics',
    'stock_share_statistics',
    'stock_financial_highlights',
    'stock_income_statement',
    'stock_balance_sheet',
    'stock_cash_flow'
  ] loop
    if to_regclass(format('public.%I', table_name)) is not null then
      execute format('revoke all on public.%I from anon, authenticated', table_name);
      execute format('grant select on public.%I to anon, authenticated', table_name);
    end if;
  end loop;
end
$$;
