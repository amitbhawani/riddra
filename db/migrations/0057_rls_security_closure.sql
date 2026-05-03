-- Riddra Supabase RLS security closure
--
-- Existing-tables-only edition.
--
-- Why this version exists:
-- - the earlier draft assumed future tables were already present
-- - connected environments can differ
-- - every table block in this migration must be safe to rerun and safe to skip if the table does not exist yet
--
-- Rules:
-- - only tables that exist at migration runtime are modified
-- - future optional stock tables are intentionally excluded from this required migration
-- - service_role continues to bypass RLS by Supabase design

create or replace function public.riddra_is_admin()
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  is_admin boolean := false;
begin
  if auth.uid() is null then
    return false;
  end if;

  if to_regclass('public.product_user_profiles') is null then
    return false;
  end if;

  execute $sql$
    select exists (
      select 1
      from public.product_user_profiles
      where auth_user_id = auth.uid()
        and role = 'admin'
    )
  $sql$
  into is_admin;

  return coalesce(is_admin, false);
end;
$$;

revoke all on function public.riddra_is_admin() from public;
grant execute on function public.riddra_is_admin() to authenticated;

do $$
begin
  if to_regclass('public.product_user_profiles') is not null then
    execute 'alter table public.product_user_profiles enable row level security';
    execute 'revoke all on public.product_user_profiles from anon';
    execute 'grant select, insert, update on public.product_user_profiles to authenticated';

    execute 'drop policy if exists product_user_profiles_select_own on public.product_user_profiles';
    execute $policy$
      create policy product_user_profiles_select_own
      on public.product_user_profiles
      for select
      to authenticated
      using (
        auth_user_id = auth.uid()
        or public.riddra_is_admin()
      )
    $policy$;

    execute 'drop policy if exists product_user_profiles_insert_own on public.product_user_profiles';
    execute $policy$
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
      )
    $policy$;

    execute 'drop policy if exists product_user_profiles_update_own on public.product_user_profiles';
    execute $policy$
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
      )
    $policy$;
  end if;
end
$$;

do $$
begin
  if to_regclass('public.product_user_watchlist_items') is not null then
    execute 'alter table public.product_user_watchlist_items enable row level security';
    execute 'revoke all on public.product_user_watchlist_items from anon';
    execute 'grant select, insert, update, delete on public.product_user_watchlist_items to authenticated';
    execute 'drop policy if exists product_user_watchlist_items_own_access on public.product_user_watchlist_items';
    execute $policy$
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
      )
    $policy$;
  end if;
end
$$;

do $$
begin
  if to_regclass('public.product_user_portfolio_holdings') is not null then
    execute 'alter table public.product_user_portfolio_holdings enable row level security';
    execute 'revoke all on public.product_user_portfolio_holdings from anon';
    execute 'grant select, insert, update, delete on public.product_user_portfolio_holdings to authenticated';
    execute 'drop policy if exists product_user_portfolio_holdings_own_access on public.product_user_portfolio_holdings';
    execute $policy$
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
      )
    $policy$;
  end if;
end
$$;

do $$
declare
  table_name text;
begin
  -- Public stock and market-data tables that back public routes, charts, and read-only public surfaces.
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
      execute format('alter table public.%I enable row level security', table_name);
      execute format('revoke all on public.%I from anon, authenticated', table_name);
      execute format('grant select on public.%I to anon, authenticated', table_name);
      execute format('drop policy if exists %I on public.%I', table_name || '_public_read', table_name);
      execute format(
        'create policy %I on public.%I for select to anon, authenticated using (true)',
        table_name || '_public_read',
        table_name
      );
    end if;
  end loop;
end
$$;

do $$
declare
  table_name text;
begin
  -- Admin-only market-data control, import, monitoring, and telemetry tables.
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
    'stock_import_alerts'
  ] loop
    if to_regclass(format('public.%I', table_name)) is not null then
      execute format('alter table public.%I enable row level security', table_name);
      execute format('revoke all on public.%I from anon, authenticated', table_name);
      execute format('grant select, insert, update, delete on public.%I to authenticated', table_name);
      execute format('drop policy if exists %I on public.%I', table_name || '_admin_all', table_name);
      execute format(
        'create policy %I on public.%I for all to authenticated using (public.riddra_is_admin()) with check (public.riddra_is_admin())',
        table_name || '_admin_all',
        table_name
      );
    end if;
  end loop;
end
$$;

do $$
declare
  table_name text;
begin
  -- CMS and platform settings are admin-only.
  foreach table_name in array array[
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
      execute format('alter table public.%I enable row level security', table_name);
      execute format('revoke all on public.%I from anon, authenticated', table_name);
      execute format('grant select, insert, update, delete on public.%I to authenticated', table_name);
      execute format('drop policy if exists %I on public.%I', table_name || '_admin_all', table_name);
      execute format(
        'create policy %I on public.%I for all to authenticated using (public.riddra_is_admin()) with check (public.riddra_is_admin())',
        table_name || '_admin_all',
        table_name
      );
    end if;
  end loop;
end
$$;
