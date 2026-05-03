-- Riddra RLS write-policy cleanup
--
-- Purpose:
-- - remove lingering public write policies that still cause `public_write_policy_present`
-- - leave admin-only tables with no anon/authenticated policies at all
-- - leave self-service tables with only auth.uid()-scoped user policies
-- - leave public-read tables with only SELECT policies
--
-- Important:
-- - this migration does not touch grants
-- - this migration does not touch service_role
-- - all table operations are guarded with to_regclass(...)
-- - all policy rewrites are rerunnable

do $$
declare
  table_name text;
  policy_record record;
begin
  -- Admin-only tables must not have any public-facing policy at all.
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
      for policy_record in
        select p.policyname
        from pg_policies p
        where p.schemaname = 'public'
          and p.tablename = table_name
          and (
            p.roles = array['public']::name[]
            or p.roles @> array['anon']::name[]
            or p.roles @> array['authenticated']::name[]
          )
      loop
        execute format('drop policy if exists %I on public.%I', policy_record.policyname, table_name);
      end loop;
    end if;
  end loop;
end
$$;

do $$
declare
  policy_record record;
begin
  if to_regclass('public.product_user_profiles') is not null then
    for policy_record in
      select p.policyname
      from pg_policies p
      where p.schemaname = 'public'
        and p.tablename = 'product_user_profiles'
    loop
      execute format('drop policy if exists %I on public.product_user_profiles', policy_record.policyname);
    end loop;

    execute $policy$
      create policy product_user_profiles_select_own
      on public.product_user_profiles
      for select
      to authenticated
      using (auth_user_id = auth.uid())
    $policy$;

    execute $policy$
      create policy product_user_profiles_insert_own
      on public.product_user_profiles
      for insert
      to authenticated
      with check (
        auth_user_id = auth.uid()
        and lower(email) = lower(coalesce((auth.jwt() ->> 'email'), email))
      )
    $policy$;

    execute $policy$
      create policy product_user_profiles_update_own
      on public.product_user_profiles
      for update
      to authenticated
      using (auth_user_id = auth.uid())
      with check (auth_user_id = auth.uid())
    $policy$;

    execute $policy$
      create policy product_user_profiles_delete_own
      on public.product_user_profiles
      for delete
      to authenticated
      using (auth_user_id = auth.uid())
    $policy$;
  end if;
end
$$;

do $$
declare
  policy_record record;
begin
  if to_regclass('public.product_user_watchlist_items') is not null then
    for policy_record in
      select p.policyname
      from pg_policies p
      where p.schemaname = 'public'
        and p.tablename = 'product_user_watchlist_items'
    loop
      execute format('drop policy if exists %I on public.product_user_watchlist_items', policy_record.policyname);
    end loop;

    execute $policy$
      create policy product_user_watchlist_items_select_own
      on public.product_user_watchlist_items
      for select
      to authenticated
      using (
        exists (
          select 1
          from public.product_user_profiles
          where id = product_user_watchlist_items.product_user_profile_id
            and auth_user_id = auth.uid()
        )
      )
    $policy$;

    execute $policy$
      create policy product_user_watchlist_items_insert_own
      on public.product_user_watchlist_items
      for insert
      to authenticated
      with check (
        exists (
          select 1
          from public.product_user_profiles
          where id = product_user_watchlist_items.product_user_profile_id
            and auth_user_id = auth.uid()
        )
      )
    $policy$;

    execute $policy$
      create policy product_user_watchlist_items_update_own
      on public.product_user_watchlist_items
      for update
      to authenticated
      using (
        exists (
          select 1
          from public.product_user_profiles
          where id = product_user_watchlist_items.product_user_profile_id
            and auth_user_id = auth.uid()
        )
      )
      with check (
        exists (
          select 1
          from public.product_user_profiles
          where id = product_user_watchlist_items.product_user_profile_id
            and auth_user_id = auth.uid()
        )
      )
    $policy$;

    execute $policy$
      create policy product_user_watchlist_items_delete_own
      on public.product_user_watchlist_items
      for delete
      to authenticated
      using (
        exists (
          select 1
          from public.product_user_profiles
          where id = product_user_watchlist_items.product_user_profile_id
            and auth_user_id = auth.uid()
        )
      )
    $policy$;
  end if;
end
$$;

do $$
declare
  policy_record record;
begin
  if to_regclass('public.product_user_portfolio_holdings') is not null then
    for policy_record in
      select p.policyname
      from pg_policies p
      where p.schemaname = 'public'
        and p.tablename = 'product_user_portfolio_holdings'
    loop
      execute format('drop policy if exists %I on public.product_user_portfolio_holdings', policy_record.policyname);
    end loop;

    execute $policy$
      create policy product_user_portfolio_holdings_select_own
      on public.product_user_portfolio_holdings
      for select
      to authenticated
      using (
        exists (
          select 1
          from public.product_user_profiles
          where id = product_user_portfolio_holdings.product_user_profile_id
            and auth_user_id = auth.uid()
        )
      )
    $policy$;

    execute $policy$
      create policy product_user_portfolio_holdings_insert_own
      on public.product_user_portfolio_holdings
      for insert
      to authenticated
      with check (
        exists (
          select 1
          from public.product_user_profiles
          where id = product_user_portfolio_holdings.product_user_profile_id
            and auth_user_id = auth.uid()
        )
      )
    $policy$;

    execute $policy$
      create policy product_user_portfolio_holdings_update_own
      on public.product_user_portfolio_holdings
      for update
      to authenticated
      using (
        exists (
          select 1
          from public.product_user_profiles
          where id = product_user_portfolio_holdings.product_user_profile_id
            and auth_user_id = auth.uid()
        )
      )
      with check (
        exists (
          select 1
          from public.product_user_profiles
          where id = product_user_portfolio_holdings.product_user_profile_id
            and auth_user_id = auth.uid()
        )
      )
    $policy$;

    execute $policy$
      create policy product_user_portfolio_holdings_delete_own
      on public.product_user_portfolio_holdings
      for delete
      to authenticated
      using (
        exists (
          select 1
          from public.product_user_profiles
          where id = product_user_portfolio_holdings.product_user_profile_id
            and auth_user_id = auth.uid()
        )
      )
    $policy$;
  end if;
end
$$;

do $$
declare
  table_name text;
  policy_record record;
begin
  -- Public-read tables must keep only the single SELECT policy.
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
      for policy_record in
        select p.policyname
        from pg_policies p
        where p.schemaname = 'public'
          and p.tablename = table_name
      loop
        execute format('drop policy if exists %I on public.%I', policy_record.policyname, table_name);
      end loop;

      execute format(
        'create policy %I on public.%I for select to anon, authenticated using (true)',
        table_name || '_public_read',
        table_name
      );
    end if;
  end loop;
end
$$;
