-- Riddra admin-only RLS closure grant cleanup
--
-- Scope:
-- - only the 30 admin-only tables that still failed the strict 0057 verifier
-- - object-level grants only
-- - no RLS policy changes
-- - no service_role changes
--
-- Goal:
-- - remove direct anon/authenticated object grants from admin-only tables
-- - preserve service-role/admin server access paths
-- - keep the fix rerunnable and safe for partial schema states

do $$
declare
  table_name text;
begin
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
