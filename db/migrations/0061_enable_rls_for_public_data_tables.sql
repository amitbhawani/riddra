-- Riddra public-table RLS enablement for newly flagged Security Advisor tables
--
-- Purpose:
-- - enable RLS on newly flagged public-schema tables
-- - keep internal and private system tables closed to anon/authenticated
-- - expose only explicit SELECT policies for tables that back public routes
--
-- Categories in this migration:
-- 1. Internal/private system tables:
--    - no anon/authenticated grants
--    - no anon/authenticated/public policies
-- 2. Public read-only tables:
--    - grant select only to anon, authenticated
--    - create a single select-only policy
--    - no insert/update/delete policies for anon/authenticated
--
-- Important:
-- - all operations are guarded with to_regclass(...)
-- - all policy rewrites are rerunnable
-- - service_role is not modified and continues to bypass RLS by Supabase design

do $$
declare
  table_name text;
  policy_record record;
begin
  -- Internal and private system tables:
  -- no public access, no public policies, no public grants.
  foreach table_name in array array[
    'index_refresh_runs',
    'index_tracker_snapshots',
    'data_sources',
    'account_state_snapshots',
    'market_news_raw_items',
    'market_news_ingestion_runs',
    'market_news_rewrite_logs',
    'market_news_analytics_events'
  ] loop
    if to_regclass(format('public.%I', table_name)) is not null then
      execute format('alter table public.%I enable row level security', table_name);
      execute format('revoke all on public.%I from anon, authenticated', table_name);

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
  table_name text;
  policy_record record;
begin
  -- Public read-only tables:
  -- grant select only and enforce a single select policy.
  foreach table_name in array array[
    'instruments',
    'companies',
    'stock_pages',
    'mutual_funds',
    'ipos',
    'ipo_pages',
    'mutual_fund_pages',
    'tracked_indexes',
    'index_component_weights',
    'index_component_snapshots',
    'market_news_articles',
    'market_news_article_entities',
    'market_news_article_images',
    'market_news_sources'
  ] loop
    if to_regclass(format('public.%I', table_name)) is not null then
      execute format('alter table public.%I enable row level security', table_name);
      execute format('revoke all on public.%I from anon, authenticated', table_name);
      execute format('grant select on public.%I to anon, authenticated', table_name);

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
