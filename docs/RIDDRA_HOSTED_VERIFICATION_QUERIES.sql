-- Riddra hosted backend verification queries
-- Run this in Supabase SQL Editor after docs/RIDDRA_HOSTED_MIGRATION_PACK.sql.
--
-- Expected result:
-- - Every "status" column should be PASS.
-- - Every required table should show table_exists = true.
-- - Required row counts should be greater than zero where noted.

-- ---------------------------------------------------------------------------
-- 1. Required hosted backend tables
-- ---------------------------------------------------------------------------

with required_tables(table_schema, table_name, category) as (
  values
    ('public', 'product_user_profiles', 'user product'),
    ('public', 'product_user_watchlist_items', 'user product'),
    ('public', 'product_user_portfolio_holdings', 'user product'),
    ('public', 'product_system_settings', 'user product'),
    ('public', 'cms_media_assets', 'media'),
    ('public', 'cms_preview_sessions', 'cms core'),
    ('public', 'cms_record_versions', 'cms core'),
    ('public', 'cms_refresh_job_runs', 'cms core'),
    ('public', 'cms_membership_tiers', 'membership'),
    ('public', 'cms_admin_records', 'cms admin'),
    ('public', 'cms_admin_record_revisions', 'cms admin'),
    ('public', 'cms_admin_global_modules', 'cms admin'),
    ('public', 'cms_admin_global_revisions', 'cms admin'),
    ('public', 'cms_admin_refresh_jobs', 'cms admin'),
    ('public', 'cms_launch_config_sections', 'cms admin'),
    ('public', 'cms_admin_activity_log', 'activity'),
    ('public', 'cms_admin_editor_locks', 'editor locks'),
    ('public', 'cms_admin_pending_approvals', 'approvals'),
    ('public', 'cms_admin_import_batches', 'imports'),
    ('public', 'cms_admin_import_rows', 'imports')
)
select
  'required_tables' as check_group,
  required_tables.category,
  required_tables.table_name,
  (tables.table_name is not null) as table_exists,
  case when tables.table_name is not null then 'PASS' else 'FAIL' end as status
from required_tables
left join information_schema.tables as tables
  on tables.table_schema = required_tables.table_schema
 and tables.table_name = required_tables.table_name
order by required_tables.category, required_tables.table_name;

-- ---------------------------------------------------------------------------
-- 2. Required columns
-- ---------------------------------------------------------------------------

with required_columns(table_schema, table_name, column_name, category) as (
  values
    ('public', 'instruments', 'sector_index_slug', 'schema alignment'),
    ('public', 'mutual_funds', 'benchmark_index_slug', 'schema alignment'),
    ('public', 'product_user_profiles', 'profile_visible', 'user product'),
    ('public', 'product_user_profiles', 'capabilities', 'user product'),
    ('public', 'cms_media_assets', 'asset_type', 'media'),
    ('public', 'cms_media_assets', 'category', 'media'),
    ('public', 'cms_media_assets', 'updated_at', 'media'),
    ('public', 'cms_membership_tiers', 'feature_access', 'membership'),
    ('public', 'cms_admin_records', 'assigned_to', 'cms admin'),
    ('public', 'cms_admin_records', 'assigned_by', 'cms admin'),
    ('public', 'cms_admin_records', 'due_date', 'cms admin'),
    ('public', 'cms_admin_pending_approvals', 'snapshot', 'approvals'),
    ('public', 'cms_admin_import_batches', 'storage_mode', 'imports'),
    ('public', 'cms_admin_import_batches', 'field_mapping', 'imports'),
    ('public', 'cms_admin_import_rows', 'payload', 'imports')
)
select
  'required_columns' as check_group,
  required_columns.category,
  required_columns.table_name,
  required_columns.column_name,
  (columns.column_name is not null) as column_exists,
  case when columns.column_name is not null then 'PASS' else 'FAIL' end as status
from required_columns
left join information_schema.columns as columns
  on columns.table_schema = required_columns.table_schema
 and columns.table_name = required_columns.table_name
 and columns.column_name = required_columns.column_name
order by required_columns.category, required_columns.table_name, required_columns.column_name;

-- ---------------------------------------------------------------------------
-- 3. Required proof rows and benchmark mappings
-- ---------------------------------------------------------------------------

select
  'stock_sector_index_slug' as check_group,
  slug,
  sector_index_slug,
  case
    when slug = 'tata-motors' and sector_index_slug = 'nifty_auto' then 'PASS'
    when slug = 'infosys' and sector_index_slug = 'nifty_it' then 'PASS'
    when slug = 'hdfc-bank' and sector_index_slug = 'nifty_bank' then 'PASS'
    else 'FAIL'
  end as status
from public.instruments
where slug in ('tata-motors', 'infosys', 'hdfc-bank')
order by slug;

select
  'fund_benchmark_index_slug' as check_group,
  slug,
  benchmark_index_slug,
  case
    when slug = 'hdfc-mid-cap-opportunities' and benchmark_index_slug = 'niftymidcap150' then 'PASS'
    when slug = 'sbi-bluechip-fund' and benchmark_index_slug = 'nifty100' then 'PASS'
    else 'FAIL'
  end as status
from public.mutual_funds
where slug in ('hdfc-mid-cap-opportunities', 'sbi-bluechip-fund')
order by slug;

-- ---------------------------------------------------------------------------
-- 4. Required default rows
-- ---------------------------------------------------------------------------

select
  'membership_tiers' as check_group,
  slug,
  name,
  status as tier_status,
  active,
  display_order,
  case
    when slug in ('free', 'pro', 'pro-max')
      and status = 'active'
      and active = true
      and feature_access is not null
      then 'PASS'
    else 'FAIL'
  end as status
from public.cms_membership_tiers
where slug in ('free', 'pro', 'pro-max')
order by display_order;

select
  'product_system_settings' as check_group,
  settings_key,
  site_name,
  default_membership_tier,
  public_head_code,
  case
    when settings_key = 'default'
      and site_name <> ''
      and default_membership_tier = 'free'
      then 'PASS'
    else 'FAIL'
  end as status
from public.product_system_settings
where settings_key = 'default';

select
  'product_system_settings_public_head_code_column' as check_group,
  column_name,
  data_type,
  case
    when column_name = 'public_head_code' and data_type = 'text' then 'PASS'
    else 'FAIL'
  end as status
from information_schema.columns
where table_schema = 'public'
  and table_name = 'product_system_settings'
  and column_name = 'public_head_code';

select
  'admin_refresh_jobs' as check_group,
  count(*) as row_count,
  count(*) filter (where key in (
    'stock_quote_session',
    'benchmark_history',
    'stock_fundamentals',
    'stock_shareholding',
    'mutual_fund_nav_history',
    'fund_factsheets',
    'fund_holdings',
    'fund_sector_allocation',
    'sector_performance',
    'index_composition',
    'editorial_catalog'
  )) as required_job_count,
  case
    when count(*) filter (where key in (
      'stock_quote_session',
      'benchmark_history',
      'stock_fundamentals',
      'stock_shareholding',
      'mutual_fund_nav_history',
      'fund_factsheets',
      'fund_holdings',
      'fund_sector_allocation',
      'sector_performance',
      'index_composition',
      'editorial_catalog'
    )) = 11 then 'PASS'
    else 'FAIL'
  end as status
from public.cms_admin_refresh_jobs;

select
  'launch_config_sections' as check_group,
  count(*) as row_count,
  case when count(*) >= 16 then 'PASS' else 'FAIL' end as status
from public.cms_launch_config_sections;

-- ---------------------------------------------------------------------------
-- 5. Empty-but-ready workflow tables
-- ---------------------------------------------------------------------------

select 'cms_admin_records' as check_group, count(*) as row_count, 'PASS' as status from public.cms_admin_records;
select 'cms_admin_record_revisions' as check_group, count(*) as row_count, 'PASS' as status from public.cms_admin_record_revisions;
select 'cms_admin_global_modules' as check_group, count(*) as row_count, 'PASS' as status from public.cms_admin_global_modules;
select 'cms_admin_global_revisions' as check_group, count(*) as row_count, 'PASS' as status from public.cms_admin_global_revisions;
select 'cms_admin_activity_log' as check_group, count(*) as row_count, 'PASS' as status from public.cms_admin_activity_log;
select 'cms_admin_editor_locks' as check_group, count(*) as row_count, 'PASS' as status from public.cms_admin_editor_locks;
select 'cms_admin_pending_approvals' as check_group, count(*) as row_count, 'PASS' as status from public.cms_admin_pending_approvals;
select 'cms_admin_import_batches' as check_group, count(*) as row_count, 'PASS' as status from public.cms_admin_import_batches;
select 'cms_admin_import_rows' as check_group, count(*) as row_count, 'PASS' as status from public.cms_admin_import_rows;
select 'cms_media_assets' as check_group, count(*) as row_count, 'PASS' as status from public.cms_media_assets;
select 'product_user_profiles' as check_group, count(*) as row_count, 'PASS' as status from public.product_user_profiles;

-- ---------------------------------------------------------------------------
-- 6. Constraint spot checks
-- ---------------------------------------------------------------------------

select
  'constraint_page_sidebar_revision_support' as check_group,
  conname,
  pg_get_constraintdef(oid) as definition,
  case
    when pg_get_constraintdef(oid) like '%pageSidebar%' then 'PASS'
    else 'FAIL'
  end as status
from pg_constraint
where conrelid = 'public.cms_admin_global_revisions'::regclass
  and conname = 'cms_admin_global_revisions_section_check';

select
  'import_storage_mode_default' as check_group,
  column_default,
  case when column_default like '%durable%' then 'PASS' else 'FAIL' end as status
from information_schema.columns
where table_schema = 'public'
  and table_name = 'cms_admin_import_batches'
  and column_name = 'storage_mode';

-- ---------------------------------------------------------------------------
-- 7. Final compact summary
-- ---------------------------------------------------------------------------

with required_table_status as (
  select count(*) as missing_count
  from (
    values
      ('product_user_profiles'),
      ('product_user_watchlist_items'),
      ('product_user_portfolio_holdings'),
      ('product_system_settings'),
      ('cms_media_assets'),
      ('cms_preview_sessions'),
      ('cms_record_versions'),
      ('cms_refresh_job_runs'),
      ('cms_membership_tiers'),
      ('cms_admin_records'),
      ('cms_admin_record_revisions'),
      ('cms_admin_global_modules'),
      ('cms_admin_global_revisions'),
      ('cms_admin_refresh_jobs'),
      ('cms_launch_config_sections'),
      ('cms_admin_activity_log'),
      ('cms_admin_editor_locks'),
      ('cms_admin_pending_approvals'),
      ('cms_admin_import_batches'),
      ('cms_admin_import_rows')
  ) as required(table_name)
  left join information_schema.tables as tables
    on tables.table_schema = 'public'
   and tables.table_name = required.table_name
  where tables.table_name is null
),
required_column_status as (
  select count(*) as missing_count
  from (
    values
      ('instruments', 'sector_index_slug'),
      ('mutual_funds', 'benchmark_index_slug'),
      ('product_user_profiles', 'profile_visible'),
      ('product_user_profiles', 'capabilities'),
      ('cms_media_assets', 'category'),
      ('cms_media_assets', 'updated_at'),
      ('cms_membership_tiers', 'feature_access'),
      ('cms_admin_records', 'assigned_to'),
      ('cms_admin_records', 'assigned_by'),
      ('cms_admin_records', 'due_date'),
      ('cms_admin_pending_approvals', 'snapshot'),
      ('cms_admin_import_batches', 'storage_mode'),
      ('cms_admin_import_rows', 'payload')
  ) as required(table_name, column_name)
  left join information_schema.columns as columns
    on columns.table_schema = 'public'
   and columns.table_name = required.table_name
   and columns.column_name = required.column_name
  where columns.column_name is null
),
proof_status as (
  select
    (
      select count(*)
      from public.instruments
      where (slug = 'tata-motors' and sector_index_slug = 'nifty_auto')
         or (slug = 'infosys' and sector_index_slug = 'nifty_it')
         or (slug = 'hdfc-bank' and sector_index_slug = 'nifty_bank')
    ) as stock_proofs,
    (
      select count(*)
      from public.mutual_funds
      where (slug = 'hdfc-mid-cap-opportunities' and benchmark_index_slug = 'niftymidcap150')
         or (slug = 'sbi-bluechip-fund' and benchmark_index_slug = 'nifty100')
    ) as fund_proofs,
    (
      select count(*)
      from public.cms_membership_tiers
      where slug in ('free', 'pro', 'pro-max')
        and status = 'active'
        and active = true
    ) as membership_proofs,
    (
      select count(*)
      from public.cms_admin_refresh_jobs
      where key in (
        'stock_quote_session',
        'benchmark_history',
        'stock_fundamentals',
        'stock_shareholding',
        'mutual_fund_nav_history',
        'fund_factsheets',
        'fund_holdings',
        'fund_sector_allocation',
        'sector_performance',
        'index_composition',
        'editorial_catalog'
      )
    ) as refresh_job_proofs
)
select
  'final_summary' as check_group,
  required_table_status.missing_count as missing_tables,
  required_column_status.missing_count as missing_columns,
  proof_status.stock_proofs,
  proof_status.fund_proofs,
  proof_status.membership_proofs,
  proof_status.refresh_job_proofs,
  case
    when required_table_status.missing_count = 0
      and required_column_status.missing_count = 0
      and proof_status.stock_proofs = 3
      and proof_status.fund_proofs = 2
      and proof_status.membership_proofs = 3
      and proof_status.refresh_job_proofs = 11
      then 'PASS'
    else 'FAIL'
  end as status
from required_table_status, required_column_status, proof_status;
