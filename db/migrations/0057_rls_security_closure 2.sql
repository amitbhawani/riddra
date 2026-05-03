-- Riddra Supabase RLS security closure
--
-- Goals:
-- 1. Public stock/market-data reads use anon/authenticated plus explicit SELECT policies.
-- 2. Signed-in users can read and update only their own product profile rows.
-- 3. CMS/admin/internal market-data tables are blocked to anon and admin-gated for authenticated.
-- 4. No public table is writable by anon.
--
-- Notes:
-- - service_role continues to bypass RLS by Supabase design.
-- - this migration is safe to rerun because it uses drop policy if exists and idempotent grants/revokes.

create or replace function public.riddra_is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.product_user_profiles
    where auth_user_id = auth.uid()
      and role = 'admin'
  );
$$;

revoke all on function public.riddra_is_admin() from public;
grant execute on function public.riddra_is_admin() to authenticated;

-- Product user profiles: users can read/update their own row, admins can manage all rows.
alter table if exists public.product_user_profiles enable row level security;
revoke all on public.product_user_profiles from anon;
grant select, insert, update on public.product_user_profiles to authenticated;

drop policy if exists product_user_profiles_select_own on public.product_user_profiles;
create policy product_user_profiles_select_own
  on public.product_user_profiles
  for select
  to authenticated
  using (
    auth_user_id = auth.uid()
    or public.riddra_is_admin()
  );

drop policy if exists product_user_profiles_insert_own on public.product_user_profiles;
create policy product_user_profiles_insert_own
  on public.product_user_profiles
  for insert
  to authenticated
  with check (
    (
      auth_user_id = auth.uid()
      and lower(email) = lower(coalesce((auth.jwt() ->> 'email'), email))
    )
    or public.riddra_is_admin()
  );

drop policy if exists product_user_profiles_update_own on public.product_user_profiles;
create policy product_user_profiles_update_own
  on public.product_user_profiles
  for update
  to authenticated
  using (
    auth_user_id = auth.uid()
    or public.riddra_is_admin()
  )
  with check (
    auth_user_id = auth.uid()
    or public.riddra_is_admin()
  );

-- Related self-service user tables.
alter table if exists public.product_user_watchlist_items enable row level security;
revoke all on public.product_user_watchlist_items from anon;
grant select, insert, update, delete on public.product_user_watchlist_items to authenticated;

drop policy if exists product_user_watchlist_items_own_access on public.product_user_watchlist_items;
create policy product_user_watchlist_items_own_access
  on public.product_user_watchlist_items
  for all
  to authenticated
  using (
    exists (
      select 1
      from public.product_user_profiles
      where id = product_user_watchlist_items.product_user_profile_id
        and (
          auth_user_id = auth.uid()
          or public.riddra_is_admin()
        )
    )
  )
  with check (
    exists (
      select 1
      from public.product_user_profiles
      where id = product_user_watchlist_items.product_user_profile_id
        and (
          auth_user_id = auth.uid()
          or public.riddra_is_admin()
        )
    )
  );

alter table if exists public.product_user_portfolio_holdings enable row level security;
revoke all on public.product_user_portfolio_holdings from anon;
grant select, insert, update, delete on public.product_user_portfolio_holdings to authenticated;

drop policy if exists product_user_portfolio_holdings_own_access on public.product_user_portfolio_holdings;
create policy product_user_portfolio_holdings_own_access
  on public.product_user_portfolio_holdings
  for all
  to authenticated
  using (
    exists (
      select 1
      from public.product_user_profiles
      where id = product_user_portfolio_holdings.product_user_profile_id
        and (
          auth_user_id = auth.uid()
          or public.riddra_is_admin()
        )
    )
  )
  with check (
    exists (
      select 1
      from public.product_user_profiles
      where id = product_user_portfolio_holdings.product_user_profile_id
        and (
          auth_user_id = auth.uid()
          or public.riddra_is_admin()
        )
    )
  );

-- Public read-only market data used by public pages and charts.
alter table if exists public.stock_quote_history enable row level security;
alter table if exists public.stock_ohlcv_history enable row level security;
alter table if exists public.benchmark_ohlcv_history enable row level security;
alter table if exists public.fund_nav_history enable row level security;
alter table if exists public.market_series_status enable row level security;
alter table if exists public.stock_fundamental_snapshots enable row level security;
alter table if exists public.stock_shareholding_snapshots enable row level security;
alter table if exists public.fund_holding_snapshots enable row level security;
alter table if exists public.fund_sector_allocation_snapshots enable row level security;
alter table if exists public.sector_performance_snapshots enable row level security;
alter table if exists public.index_component_weight_snapshots enable row level security;
alter table if exists public.mutual_fund_nav_history enable row level security;
alter table if exists public.stocks_master enable row level security;
alter table if exists public.stock_price_history enable row level security;
alter table if exists public.stock_market_snapshot enable row level security;
alter table if exists public.stock_valuation_metrics enable row level security;
alter table if exists public.stock_share_statistics enable row level security;
alter table if exists public.stock_financial_highlights enable row level security;
alter table if exists public.stock_income_statement enable row level security;
alter table if exists public.stock_balance_sheet enable row level security;
alter table if exists public.stock_cash_flow enable row level security;

revoke all on
  public.stock_quote_history,
  public.stock_ohlcv_history,
  public.benchmark_ohlcv_history,
  public.fund_nav_history,
  public.market_series_status,
  public.stock_fundamental_snapshots,
  public.stock_shareholding_snapshots,
  public.fund_holding_snapshots,
  public.fund_sector_allocation_snapshots,
  public.sector_performance_snapshots,
  public.index_component_weight_snapshots,
  public.mutual_fund_nav_history,
  public.stocks_master,
  public.stock_price_history,
  public.stock_market_snapshot,
  public.stock_valuation_metrics,
  public.stock_share_statistics,
  public.stock_financial_highlights,
  public.stock_income_statement,
  public.stock_balance_sheet,
  public.stock_cash_flow
from anon, authenticated;

grant select on
  public.stock_quote_history,
  public.stock_ohlcv_history,
  public.benchmark_ohlcv_history,
  public.fund_nav_history,
  public.market_series_status,
  public.stock_fundamental_snapshots,
  public.stock_shareholding_snapshots,
  public.fund_holding_snapshots,
  public.fund_sector_allocation_snapshots,
  public.sector_performance_snapshots,
  public.index_component_weight_snapshots,
  public.mutual_fund_nav_history,
  public.stocks_master,
  public.stock_price_history,
  public.stock_market_snapshot,
  public.stock_valuation_metrics,
  public.stock_share_statistics,
  public.stock_financial_highlights,
  public.stock_income_statement,
  public.stock_balance_sheet,
  public.stock_cash_flow
to anon, authenticated;

drop policy if exists stock_quote_history_public_read on public.stock_quote_history;
create policy stock_quote_history_public_read
  on public.stock_quote_history
  for select
  to anon, authenticated
  using (true);

drop policy if exists stock_ohlcv_history_public_read on public.stock_ohlcv_history;
create policy stock_ohlcv_history_public_read
  on public.stock_ohlcv_history
  for select
  to anon, authenticated
  using (true);

drop policy if exists benchmark_ohlcv_history_public_read on public.benchmark_ohlcv_history;
create policy benchmark_ohlcv_history_public_read
  on public.benchmark_ohlcv_history
  for select
  to anon, authenticated
  using (true);

drop policy if exists fund_nav_history_public_read on public.fund_nav_history;
create policy fund_nav_history_public_read
  on public.fund_nav_history
  for select
  to anon, authenticated
  using (true);

drop policy if exists market_series_status_public_read on public.market_series_status;
create policy market_series_status_public_read
  on public.market_series_status
  for select
  to anon, authenticated
  using (true);

drop policy if exists stock_fundamental_snapshots_public_read on public.stock_fundamental_snapshots;
create policy stock_fundamental_snapshots_public_read
  on public.stock_fundamental_snapshots
  for select
  to anon, authenticated
  using (true);

drop policy if exists stock_shareholding_snapshots_public_read on public.stock_shareholding_snapshots;
create policy stock_shareholding_snapshots_public_read
  on public.stock_shareholding_snapshots
  for select
  to anon, authenticated
  using (true);

drop policy if exists fund_holding_snapshots_public_read on public.fund_holding_snapshots;
create policy fund_holding_snapshots_public_read
  on public.fund_holding_snapshots
  for select
  to anon, authenticated
  using (true);

drop policy if exists fund_sector_allocation_snapshots_public_read on public.fund_sector_allocation_snapshots;
create policy fund_sector_allocation_snapshots_public_read
  on public.fund_sector_allocation_snapshots
  for select
  to anon, authenticated
  using (true);

drop policy if exists sector_performance_snapshots_public_read on public.sector_performance_snapshots;
create policy sector_performance_snapshots_public_read
  on public.sector_performance_snapshots
  for select
  to anon, authenticated
  using (true);

drop policy if exists index_component_weight_snapshots_public_read on public.index_component_weight_snapshots;
create policy index_component_weight_snapshots_public_read
  on public.index_component_weight_snapshots
  for select
  to anon, authenticated
  using (true);

drop policy if exists mutual_fund_nav_history_public_read on public.mutual_fund_nav_history;
create policy mutual_fund_nav_history_public_read
  on public.mutual_fund_nav_history
  for select
  to anon, authenticated
  using (true);

drop policy if exists stocks_master_public_read on public.stocks_master;
create policy stocks_master_public_read
  on public.stocks_master
  for select
  to anon, authenticated
  using (true);

drop policy if exists stock_price_history_public_read on public.stock_price_history;
create policy stock_price_history_public_read
  on public.stock_price_history
  for select
  to anon, authenticated
  using (true);

drop policy if exists stock_market_snapshot_public_read on public.stock_market_snapshot;
create policy stock_market_snapshot_public_read
  on public.stock_market_snapshot
  for select
  to anon, authenticated
  using (true);

drop policy if exists stock_valuation_metrics_public_read on public.stock_valuation_metrics;
create policy stock_valuation_metrics_public_read
  on public.stock_valuation_metrics
  for select
  to anon, authenticated
  using (true);

drop policy if exists stock_share_statistics_public_read on public.stock_share_statistics;
create policy stock_share_statistics_public_read
  on public.stock_share_statistics
  for select
  to anon, authenticated
  using (true);

drop policy if exists stock_financial_highlights_public_read on public.stock_financial_highlights;
create policy stock_financial_highlights_public_read
  on public.stock_financial_highlights
  for select
  to anon, authenticated
  using (true);

drop policy if exists stock_income_statement_public_read on public.stock_income_statement;
create policy stock_income_statement_public_read
  on public.stock_income_statement
  for select
  to anon, authenticated
  using (true);

drop policy if exists stock_balance_sheet_public_read on public.stock_balance_sheet;
create policy stock_balance_sheet_public_read
  on public.stock_balance_sheet
  for select
  to anon, authenticated
  using (true);

drop policy if exists stock_cash_flow_public_read on public.stock_cash_flow;
create policy stock_cash_flow_public_read
  on public.stock_cash_flow
  for select
  to anon, authenticated
  using (true);

-- Internal/admin-only market-data control and telemetry tables.
alter table if exists public.market_data_import_batches enable row level security;
alter table if exists public.market_data_import_rows enable row level security;
alter table if exists public.market_data_sources enable row level security;
alter table if exists public.market_refresh_runs enable row level security;
alter table if exists public.raw_yahoo_imports enable row level security;
alter table if exists public.stock_import_jobs enable row level security;
alter table if exists public.stock_import_errors enable row level security;
alter table if exists public.stock_import_coverage enable row level security;
alter table if exists public.stock_import_activity_log enable row level security;
alter table if exists public.stock_import_reconciliation enable row level security;
alter table if exists public.stock_data_quality_summary enable row level security;
alter table if exists public.stock_data_freshness enable row level security;
alter table if exists public.stock_import_alerts enable row level security;

revoke all on
  public.market_data_import_batches,
  public.market_data_import_rows,
  public.market_data_sources,
  public.market_refresh_runs,
  public.raw_yahoo_imports,
  public.stock_import_jobs,
  public.stock_import_errors,
  public.stock_import_coverage,
  public.stock_import_activity_log,
  public.stock_import_reconciliation,
  public.stock_data_quality_summary,
  public.stock_data_freshness,
  public.stock_import_alerts
from anon;

grant select, insert, update, delete on
  public.market_data_import_batches,
  public.market_data_import_rows,
  public.market_data_sources,
  public.market_refresh_runs,
  public.raw_yahoo_imports,
  public.stock_import_jobs,
  public.stock_import_errors,
  public.stock_import_coverage,
  public.stock_import_activity_log,
  public.stock_import_reconciliation,
  public.stock_data_quality_summary,
  public.stock_data_freshness,
  public.stock_import_alerts
to authenticated;

drop policy if exists market_data_import_batches_admin_all on public.market_data_import_batches;
create policy market_data_import_batches_admin_all on public.market_data_import_batches
  for all to authenticated using (public.riddra_is_admin()) with check (public.riddra_is_admin());

drop policy if exists market_data_import_rows_admin_all on public.market_data_import_rows;
create policy market_data_import_rows_admin_all on public.market_data_import_rows
  for all to authenticated using (public.riddra_is_admin()) with check (public.riddra_is_admin());

drop policy if exists market_data_sources_admin_all on public.market_data_sources;
create policy market_data_sources_admin_all on public.market_data_sources
  for all to authenticated using (public.riddra_is_admin()) with check (public.riddra_is_admin());

drop policy if exists market_refresh_runs_admin_all on public.market_refresh_runs;
create policy market_refresh_runs_admin_all on public.market_refresh_runs
  for all to authenticated using (public.riddra_is_admin()) with check (public.riddra_is_admin());

drop policy if exists raw_yahoo_imports_admin_all on public.raw_yahoo_imports;
create policy raw_yahoo_imports_admin_all on public.raw_yahoo_imports
  for all to authenticated using (public.riddra_is_admin()) with check (public.riddra_is_admin());

drop policy if exists stock_import_jobs_admin_all on public.stock_import_jobs;
create policy stock_import_jobs_admin_all on public.stock_import_jobs
  for all to authenticated using (public.riddra_is_admin()) with check (public.riddra_is_admin());

drop policy if exists stock_import_errors_admin_all on public.stock_import_errors;
create policy stock_import_errors_admin_all on public.stock_import_errors
  for all to authenticated using (public.riddra_is_admin()) with check (public.riddra_is_admin());

drop policy if exists stock_import_coverage_admin_all on public.stock_import_coverage;
create policy stock_import_coverage_admin_all on public.stock_import_coverage
  for all to authenticated using (public.riddra_is_admin()) with check (public.riddra_is_admin());

drop policy if exists stock_import_activity_log_admin_all on public.stock_import_activity_log;
create policy stock_import_activity_log_admin_all on public.stock_import_activity_log
  for all to authenticated using (public.riddra_is_admin()) with check (public.riddra_is_admin());

drop policy if exists stock_import_reconciliation_admin_all on public.stock_import_reconciliation;
create policy stock_import_reconciliation_admin_all on public.stock_import_reconciliation
  for all to authenticated using (public.riddra_is_admin()) with check (public.riddra_is_admin());

drop policy if exists stock_data_quality_summary_admin_all on public.stock_data_quality_summary;
create policy stock_data_quality_summary_admin_all on public.stock_data_quality_summary
  for all to authenticated using (public.riddra_is_admin()) with check (public.riddra_is_admin());

drop policy if exists stock_data_freshness_admin_all on public.stock_data_freshness;
create policy stock_data_freshness_admin_all on public.stock_data_freshness
  for all to authenticated using (public.riddra_is_admin()) with check (public.riddra_is_admin());

drop policy if exists stock_import_alerts_admin_all on public.stock_import_alerts;
create policy stock_import_alerts_admin_all on public.stock_import_alerts
  for all to authenticated using (public.riddra_is_admin()) with check (public.riddra_is_admin());

-- CMS/admin durable state is admin-only.
alter table if exists public.cms_admin_records enable row level security;
alter table if exists public.cms_admin_record_revisions enable row level security;
alter table if exists public.cms_admin_global_modules enable row level security;
alter table if exists public.cms_admin_global_revisions enable row level security;
alter table if exists public.cms_admin_refresh_jobs enable row level security;
alter table if exists public.cms_admin_activity_log enable row level security;
alter table if exists public.cms_admin_editor_locks enable row level security;
alter table if exists public.cms_admin_pending_approvals enable row level security;
alter table if exists public.cms_admin_import_batches enable row level security;
alter table if exists public.cms_admin_import_rows enable row level security;
alter table if exists public.cms_launch_config_sections enable row level security;
alter table if exists public.cms_media_assets enable row level security;
alter table if exists public.cms_preview_sessions enable row level security;
alter table if exists public.cms_record_versions enable row level security;
alter table if exists public.cms_refresh_job_runs enable row level security;
alter table if exists public.cms_membership_tiers enable row level security;
alter table if exists public.product_system_settings enable row level security;

revoke all on
  public.cms_admin_records,
  public.cms_admin_record_revisions,
  public.cms_admin_global_modules,
  public.cms_admin_global_revisions,
  public.cms_admin_refresh_jobs,
  public.cms_admin_activity_log,
  public.cms_admin_editor_locks,
  public.cms_admin_pending_approvals,
  public.cms_admin_import_batches,
  public.cms_admin_import_rows,
  public.cms_launch_config_sections,
  public.cms_media_assets,
  public.cms_preview_sessions,
  public.cms_record_versions,
  public.cms_refresh_job_runs,
  public.cms_membership_tiers,
  public.product_system_settings
from anon;

grant select, insert, update, delete on
  public.cms_admin_records,
  public.cms_admin_record_revisions,
  public.cms_admin_global_modules,
  public.cms_admin_global_revisions,
  public.cms_admin_refresh_jobs,
  public.cms_admin_activity_log,
  public.cms_admin_editor_locks,
  public.cms_admin_pending_approvals,
  public.cms_admin_import_batches,
  public.cms_admin_import_rows,
  public.cms_launch_config_sections,
  public.cms_media_assets,
  public.cms_preview_sessions,
  public.cms_record_versions,
  public.cms_refresh_job_runs,
  public.cms_membership_tiers,
  public.product_system_settings
to authenticated;

drop policy if exists cms_admin_records_admin_all on public.cms_admin_records;
create policy cms_admin_records_admin_all on public.cms_admin_records
  for all to authenticated using (public.riddra_is_admin()) with check (public.riddra_is_admin());

drop policy if exists cms_admin_record_revisions_admin_all on public.cms_admin_record_revisions;
create policy cms_admin_record_revisions_admin_all on public.cms_admin_record_revisions
  for all to authenticated using (public.riddra_is_admin()) with check (public.riddra_is_admin());

drop policy if exists cms_admin_global_modules_admin_all on public.cms_admin_global_modules;
create policy cms_admin_global_modules_admin_all on public.cms_admin_global_modules
  for all to authenticated using (public.riddra_is_admin()) with check (public.riddra_is_admin());

drop policy if exists cms_admin_global_revisions_admin_all on public.cms_admin_global_revisions;
create policy cms_admin_global_revisions_admin_all on public.cms_admin_global_revisions
  for all to authenticated using (public.riddra_is_admin()) with check (public.riddra_is_admin());

drop policy if exists cms_admin_refresh_jobs_admin_all on public.cms_admin_refresh_jobs;
create policy cms_admin_refresh_jobs_admin_all on public.cms_admin_refresh_jobs
  for all to authenticated using (public.riddra_is_admin()) with check (public.riddra_is_admin());

drop policy if exists cms_admin_activity_log_admin_all on public.cms_admin_activity_log;
create policy cms_admin_activity_log_admin_all on public.cms_admin_activity_log
  for all to authenticated using (public.riddra_is_admin()) with check (public.riddra_is_admin());

drop policy if exists cms_admin_editor_locks_admin_all on public.cms_admin_editor_locks;
create policy cms_admin_editor_locks_admin_all on public.cms_admin_editor_locks
  for all to authenticated using (public.riddra_is_admin()) with check (public.riddra_is_admin());

drop policy if exists cms_admin_pending_approvals_admin_all on public.cms_admin_pending_approvals;
create policy cms_admin_pending_approvals_admin_all on public.cms_admin_pending_approvals
  for all to authenticated using (public.riddra_is_admin()) with check (public.riddra_is_admin());

drop policy if exists cms_admin_import_batches_admin_all on public.cms_admin_import_batches;
create policy cms_admin_import_batches_admin_all on public.cms_admin_import_batches
  for all to authenticated using (public.riddra_is_admin()) with check (public.riddra_is_admin());

drop policy if exists cms_admin_import_rows_admin_all on public.cms_admin_import_rows;
create policy cms_admin_import_rows_admin_all on public.cms_admin_import_rows
  for all to authenticated using (public.riddra_is_admin()) with check (public.riddra_is_admin());

drop policy if exists cms_launch_config_sections_admin_all on public.cms_launch_config_sections;
create policy cms_launch_config_sections_admin_all on public.cms_launch_config_sections
  for all to authenticated using (public.riddra_is_admin()) with check (public.riddra_is_admin());

drop policy if exists cms_media_assets_admin_all on public.cms_media_assets;
create policy cms_media_assets_admin_all on public.cms_media_assets
  for all to authenticated using (public.riddra_is_admin()) with check (public.riddra_is_admin());

drop policy if exists cms_preview_sessions_admin_all on public.cms_preview_sessions;
create policy cms_preview_sessions_admin_all on public.cms_preview_sessions
  for all to authenticated using (public.riddra_is_admin()) with check (public.riddra_is_admin());

drop policy if exists cms_record_versions_admin_all on public.cms_record_versions;
create policy cms_record_versions_admin_all on public.cms_record_versions
  for all to authenticated using (public.riddra_is_admin()) with check (public.riddra_is_admin());

drop policy if exists cms_refresh_job_runs_admin_all on public.cms_refresh_job_runs;
create policy cms_refresh_job_runs_admin_all on public.cms_refresh_job_runs
  for all to authenticated using (public.riddra_is_admin()) with check (public.riddra_is_admin());

drop policy if exists cms_membership_tiers_admin_all on public.cms_membership_tiers;
create policy cms_membership_tiers_admin_all on public.cms_membership_tiers
  for all to authenticated using (public.riddra_is_admin()) with check (public.riddra_is_admin());

drop policy if exists product_system_settings_admin_all on public.product_system_settings;
create policy product_system_settings_admin_all on public.product_system_settings
  for all to authenticated using (public.riddra_is_admin()) with check (public.riddra_is_admin());
