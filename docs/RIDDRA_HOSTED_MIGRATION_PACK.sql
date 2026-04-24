-- Riddra hosted backend migration pack
-- Generated for manual execution in the Supabase SQL Editor.
--
-- Purpose:
-- - Close the hosted DB schema gap for the current admin/CMS backend.
-- - Keep the script idempotent and safe to run more than once.
-- - Do not truncate or delete production data.
--
-- Source migrations covered:
-- - db/migrations/0017_instruments_sector_index_slug.sql
-- - db/migrations/0021_mutual_funds_benchmark_index_slug.sql
-- - db/migrations/0024_user_product_cms_durable_state.sql
-- - db/migrations/0025_product_user_profile_capabilities.sql
-- - db/migrations/0026_cms_media_asset_metadata.sql
-- - db/migrations/0027_operator_backbone_durable_state.sql
-- - db/migrations/0028_admin_activity_log.sql
-- - db/migrations/0029_schema_alignment_sector_and_benchmark_slug.sql
-- - db/migrations/0030_cms_workflow_status_and_assignment.sql
-- - db/migrations/0031_cms_admin_editor_locks.sql
-- - db/migrations/0032_schema_alignment_closure_samples.sql
-- - db/migrations/0033_membership_feature_access.sql
-- - db/migrations/0034_cms_admin_pending_approvals.sql
-- - db/migrations/0035_cms_admin_import_batches.sql
-- - db/migrations/0036_product_user_profile_visibility.sql
--
-- Manual run order:
-- 1. Paste this complete file into Supabase SQL Editor and run it.
-- 2. Run docs/RIDDRA_HOSTED_VERIFICATION_QUERIES.sql.
-- 3. Restart the app in hosted DB mode only after verification passes.

begin;

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- Public content schema alignment
-- ---------------------------------------------------------------------------

alter table if exists public.instruments
  add column if not exists sector_index_slug text;

create index if not exists instruments_sector_index_slug_idx
  on public.instruments (sector_index_slug);

alter table if exists public.mutual_funds
  add column if not exists benchmark_index_slug text;

create index if not exists mutual_funds_benchmark_index_slug_idx
  on public.mutual_funds (benchmark_index_slug);

update public.instruments
set sector_index_slug = 'nifty_auto'
where slug = 'tata-motors'
  and (sector_index_slug is null or sector_index_slug = '');

update public.instruments
set sector_index_slug = 'nifty_it'
where slug = 'infosys'
  and (sector_index_slug is null or sector_index_slug = '');

update public.instruments
set sector_index_slug = 'nifty_bank'
where slug = 'hdfc-bank'
  and (sector_index_slug is null or sector_index_slug = '');

update public.mutual_funds
set benchmark_index_slug = 'niftymidcap150'
where slug = 'hdfc-mid-cap-opportunities'
  and (benchmark_index_slug is null or benchmark_index_slug = '');

update public.mutual_funds
set benchmark_index_slug = 'nifty100'
where slug = 'sbi-bluechip-fund'
  and (benchmark_index_slug is null or benchmark_index_slug = '');

-- ---------------------------------------------------------------------------
-- Product user and account state tables
-- ---------------------------------------------------------------------------

create table if not exists public.product_user_profiles (
  id uuid primary key default gen_random_uuid(),
  user_key text not null unique,
  auth_user_id uuid,
  email text not null unique,
  name text not null,
  profile_visible boolean not null default true,
  membership_tier text,
  role text not null default 'user',
  capabilities jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  last_active_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.product_user_profiles
  add column if not exists user_key text,
  add column if not exists auth_user_id uuid,
  add column if not exists email text,
  add column if not exists name text,
  add column if not exists profile_visible boolean not null default true,
  add column if not exists membership_tier text,
  add column if not exists role text not null default 'user',
  add column if not exists capabilities jsonb not null default '[]'::jsonb,
  add column if not exists created_at timestamptz not null default now(),
  add column if not exists last_active_at timestamptz not null default now(),
  add column if not exists updated_at timestamptz not null default now();

alter table public.product_user_profiles
  drop constraint if exists product_user_profiles_role_check;

alter table public.product_user_profiles
  add constraint product_user_profiles_role_check
  check (role in ('admin', 'editor', 'user'));

create unique index if not exists product_user_profiles_user_key_unique_idx
  on public.product_user_profiles (user_key);

create unique index if not exists product_user_profiles_email_unique_idx
  on public.product_user_profiles (email);

create index if not exists product_user_profiles_email_idx
  on public.product_user_profiles (email);

create table if not exists public.product_user_watchlist_items (
  id uuid primary key default gen_random_uuid(),
  product_user_profile_id uuid not null references public.product_user_profiles (id) on delete cascade,
  stock_slug text not null,
  stock_symbol text not null,
  stock_name text not null,
  added_at timestamptz not null default now(),
  unique (product_user_profile_id, stock_slug)
);

alter table public.product_user_watchlist_items
  add column if not exists product_user_profile_id uuid references public.product_user_profiles (id) on delete cascade,
  add column if not exists stock_slug text,
  add column if not exists stock_symbol text,
  add column if not exists stock_name text,
  add column if not exists added_at timestamptz not null default now();

create unique index if not exists product_user_watchlist_items_profile_stock_unique_idx
  on public.product_user_watchlist_items (product_user_profile_id, stock_slug);

create index if not exists product_user_watchlist_items_profile_idx
  on public.product_user_watchlist_items (product_user_profile_id, added_at desc);

create table if not exists public.product_user_portfolio_holdings (
  id uuid primary key default gen_random_uuid(),
  product_user_profile_id uuid not null references public.product_user_profiles (id) on delete cascade,
  stock_slug text not null,
  stock_symbol text not null,
  stock_name text not null,
  quantity numeric(18,4) not null default 0,
  buy_price numeric(18,4) not null default 0,
  added_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (product_user_profile_id, stock_slug)
);

alter table public.product_user_portfolio_holdings
  add column if not exists product_user_profile_id uuid references public.product_user_profiles (id) on delete cascade,
  add column if not exists stock_slug text,
  add column if not exists stock_symbol text,
  add column if not exists stock_name text,
  add column if not exists quantity numeric(18,4) not null default 0,
  add column if not exists buy_price numeric(18,4) not null default 0,
  add column if not exists added_at timestamptz not null default now(),
  add column if not exists updated_at timestamptz not null default now();

create unique index if not exists product_user_portfolio_holdings_profile_stock_unique_idx
  on public.product_user_portfolio_holdings (product_user_profile_id, stock_slug);

create index if not exists product_user_portfolio_holdings_profile_idx
  on public.product_user_portfolio_holdings (product_user_profile_id, updated_at desc);

create table if not exists public.product_system_settings (
  settings_key text primary key,
  site_name text not null,
  default_meta_title_suffix text not null,
  default_meta_description text not null,
  default_og_image text not null default '',
  default_canonical_base text not null default '',
  public_head_code text not null default '',
  default_no_index boolean not null default false,
  default_membership_tier text not null default 'free',
  default_locked_cta_label text not null default 'Unlock with membership',
  support_email text not null default '',
  support_route text not null default '/contact',
  preview_enabled boolean not null default true,
  media_uploads_enabled boolean not null default true,
  watchlist_enabled boolean not null default true,
  portfolio_enabled boolean not null default true,
  updated_at timestamptz not null default now()
);

insert into public.product_system_settings (
  settings_key,
  site_name,
  default_meta_title_suffix,
  default_meta_description,
  default_og_image,
  default_canonical_base,
  public_head_code,
  default_no_index,
  default_membership_tier,
  default_locked_cta_label,
  support_email,
  support_route,
  preview_enabled,
  media_uploads_enabled,
  watchlist_enabled,
  portfolio_enabled
)
values (
  'default',
  'Riddra',
  'Riddra',
  'Riddra is a market intelligence and research platform for Indian investors.',
  '',
  '',
  '',
  false,
  'free',
  'Unlock with membership',
  '',
  '/contact',
  true,
  true,
  true,
  true
)
on conflict (settings_key) do nothing;

alter table if exists public.product_system_settings
  add column if not exists public_head_code text not null default '';

-- ---------------------------------------------------------------------------
-- Media, preview, versions, refresh runs, membership tiers
-- ---------------------------------------------------------------------------

create table if not exists public.cms_media_assets (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  alt_text text not null default '',
  url text not null,
  asset_type text not null default 'image',
  category text not null default 'content',
  source_kind text not null,
  file_name text not null,
  mime_type text not null,
  size_bytes bigint,
  tags jsonb not null default '[]'::jsonb,
  uploaded_by text not null,
  uploaded_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  status text not null default 'draft'
);

alter table public.cms_media_assets
  add column if not exists title text,
  add column if not exists alt_text text not null default '',
  add column if not exists url text,
  add column if not exists asset_type text not null default 'image',
  add column if not exists category text,
  add column if not exists source_kind text,
  add column if not exists file_name text,
  add column if not exists mime_type text,
  add column if not exists size_bytes bigint,
  add column if not exists tags jsonb not null default '[]'::jsonb,
  add column if not exists uploaded_by text,
  add column if not exists uploaded_at timestamptz not null default now(),
  add column if not exists updated_at timestamptz not null default now(),
  add column if not exists status text not null default 'draft';

update public.cms_media_assets
set
  category = coalesce(category, case when asset_type = 'document' then 'document' else 'content' end),
  updated_at = coalesce(updated_at, uploaded_at, now());

alter table public.cms_media_assets
  alter column category set default 'content',
  alter column category set not null;

alter table public.cms_media_assets
  drop constraint if exists cms_media_assets_asset_type_check,
  drop constraint if exists cms_media_assets_source_kind_check,
  drop constraint if exists cms_media_assets_status_check;

alter table public.cms_media_assets
  add constraint cms_media_assets_asset_type_check check (asset_type in ('image', 'document')),
  add constraint cms_media_assets_source_kind_check check (source_kind in ('upload', 'external_url')),
  add constraint cms_media_assets_status_check check (status in ('draft', 'published'));

create index if not exists cms_media_assets_uploaded_at_idx
  on public.cms_media_assets (uploaded_at desc);

create index if not exists cms_media_assets_type_updated_idx
  on public.cms_media_assets (asset_type, updated_at desc);

create table if not exists public.cms_preview_sessions (
  token text primary key,
  family text not null,
  slug text not null,
  title text not null,
  route_target text,
  created_by text not null,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null,
  payload jsonb not null default '{}'::jsonb
);

create index if not exists cms_preview_sessions_expiry_idx
  on public.cms_preview_sessions (expires_at desc);

create table if not exists public.cms_record_versions (
  id uuid primary key default gen_random_uuid(),
  family text not null,
  slug text not null,
  title text not null,
  saved_at timestamptz not null default now(),
  saved_by text not null,
  status text not null,
  route_target text,
  changed_fields jsonb not null default '[]'::jsonb,
  snapshot jsonb not null default '{}'::jsonb
);

alter table public.cms_record_versions
  drop constraint if exists cms_record_versions_status_check;

alter table public.cms_record_versions
  add constraint cms_record_versions_status_check
  check (status in ('draft', 'ready_for_review', 'needs_fix', 'published', 'archived'));

create index if not exists cms_record_versions_lookup_idx
  on public.cms_record_versions (family, slug, saved_at desc);

create table if not exists public.cms_refresh_job_runs (
  id uuid primary key default gen_random_uuid(),
  job_key text not null,
  status text not null,
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  error text,
  note text,
  requested_by text,
  retried_from_run_id text
);

alter table public.cms_refresh_job_runs
  drop constraint if exists cms_refresh_job_runs_status_check;

alter table public.cms_refresh_job_runs
  add constraint cms_refresh_job_runs_status_check
  check (status in ('running', 'healthy', 'failed', 'warning'));

create index if not exists cms_refresh_job_runs_lookup_idx
  on public.cms_refresh_job_runs (job_key, started_at desc);

create table if not exists public.cms_membership_tiers (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  description text not null default '',
  status text not null default 'active',
  active boolean not null default true,
  display_order integer not null default 1,
  visibility text not null default 'public',
  cta_label text not null default '',
  cta_href text not null default '',
  included_families jsonb not null default '[]'::jsonb,
  included_records jsonb not null default '[]'::jsonb,
  excluded_records jsonb not null default '[]'::jsonb,
  feature_access jsonb not null default '{}'::jsonb,
  internal_notes text,
  updated_at timestamptz not null default now()
);

alter table public.cms_membership_tiers
  add column if not exists feature_access jsonb not null default '{}'::jsonb;

alter table public.cms_membership_tiers
  drop constraint if exists cms_membership_tiers_status_check,
  drop constraint if exists cms_membership_tiers_visibility_check;

alter table public.cms_membership_tiers
  add constraint cms_membership_tiers_status_check check (status in ('active', 'archived')),
  add constraint cms_membership_tiers_visibility_check check (visibility in ('public', 'private'));

create index if not exists cms_membership_tiers_display_order_idx
  on public.cms_membership_tiers (display_order asc, updated_at desc);

-- ---------------------------------------------------------------------------
-- Admin CMS durable state tables
-- ---------------------------------------------------------------------------

create table if not exists public.cms_admin_records (
  id text primary key,
  family text not null,
  slug text not null,
  title text not null,
  symbol text,
  benchmark_mapping text,
  status text not null default 'draft',
  visibility text not null default 'private',
  public_href text,
  canonical_route text,
  source_table text,
  source_row_id text,
  source_label text not null default '',
  source_date text not null default '',
  source_url text not null default '',
  source_state jsonb not null default '{}'::jsonb,
  refresh_state jsonb not null default '{}'::jsonb,
  access_control jsonb not null default '{}'::jsonb,
  assigned_to text,
  assigned_by text,
  due_date timestamptz,
  sections jsonb not null default '{}'::jsonb,
  documents jsonb not null default '[]'::jsonb,
  imports jsonb not null default '[]'::jsonb,
  scheduled_publish_at timestamptz,
  scheduled_unpublish_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.cms_admin_records
  add column if not exists assigned_to text,
  add column if not exists assigned_by text,
  add column if not exists due_date timestamptz;

update public.cms_admin_records
set status = 'ready_for_review'
where status = 'review';

alter table public.cms_admin_records
  drop constraint if exists cms_admin_records_family_slug_unique,
  drop constraint if exists cms_admin_records_status_check,
  drop constraint if exists cms_admin_records_visibility_check;

alter table public.cms_admin_records
  add constraint cms_admin_records_family_slug_unique unique (family, slug),
  add constraint cms_admin_records_status_check
    check (status in ('draft', 'ready_for_review', 'needs_fix', 'published', 'archived')),
  add constraint cms_admin_records_visibility_check
    check (visibility in ('public', 'private', 'archived'));

create index if not exists cms_admin_records_family_updated_idx
  on public.cms_admin_records (family, updated_at desc);

create index if not exists cms_admin_records_status_updated_idx
  on public.cms_admin_records (status, updated_at desc);

create index if not exists cms_admin_records_assigned_to_idx
  on public.cms_admin_records (assigned_to, updated_at desc);

create index if not exists cms_admin_records_due_date_idx
  on public.cms_admin_records (due_date asc nulls last);

create table if not exists public.cms_admin_record_revisions (
  id text primary key,
  family text not null,
  slug text not null,
  title text not null,
  editor text not null default '',
  action text not null default '',
  changed_fields jsonb not null default '[]'::jsonb,
  reason text not null default '',
  revision_state text not null,
  route_target text not null default '',
  edited_at timestamptz not null default now()
);

alter table public.cms_admin_record_revisions
  drop constraint if exists cms_admin_record_revisions_state_check;

alter table public.cms_admin_record_revisions
  add constraint cms_admin_record_revisions_state_check
  check (revision_state in ('Published', 'Review ready', 'Needs fix', 'Rollback staged'));

create index if not exists cms_admin_record_revisions_lookup_idx
  on public.cms_admin_record_revisions (family, slug, edited_at desc);

create table if not exists public.cms_admin_global_modules (
  id text primary key,
  section text not null,
  title text not null default '',
  eyebrow text not null default '',
  body text not null default '',
  href text not null default '',
  cta_label text not null default '',
  module_type text not null default 'shared_module',
  featured boolean not null default false,
  priority integer not null default 1,
  archive_group text,
  visibility_families jsonb not null default '[]'::jsonb,
  assignments jsonb not null default '[]'::jsonb,
  coming_soon boolean not null default false,
  hide_until_ready boolean not null default false,
  enabled boolean not null default true,
  status text not null default 'draft',
  placement text not null default '',
  sort_order integer not null default 1,
  updated_at timestamptz not null default now()
);

alter table public.cms_admin_global_modules
  drop constraint if exists cms_admin_global_modules_section_check,
  drop constraint if exists cms_admin_global_modules_status_check;

alter table public.cms_admin_global_modules
  add constraint cms_admin_global_modules_section_check
    check (section in ('sharedBlocks', 'banners', 'routeStrips', 'marketModules')),
  add constraint cms_admin_global_modules_status_check
    check (status in ('draft', 'published'));

create index if not exists cms_admin_global_modules_section_sort_idx
  on public.cms_admin_global_modules (section, sort_order asc, updated_at desc);

create table if not exists public.cms_admin_global_revisions (
  id text primary key,
  section text not null,
  title text not null default '',
  editor text not null default '',
  action text not null default '',
  status text not null,
  changed_count integer not null default 0,
  edited_at timestamptz not null default now()
);

alter table public.cms_admin_global_revisions
  drop constraint if exists cms_admin_global_revisions_section_check,
  drop constraint if exists cms_admin_global_revisions_status_check;

alter table public.cms_admin_global_revisions
  add constraint cms_admin_global_revisions_section_check
    check (section in ('header', 'footer', 'pageSidebar', 'sharedBlocks', 'banners', 'routeStrips', 'marketModules')),
  add constraint cms_admin_global_revisions_status_check
    check (status in ('draft', 'published', 'reverted'));

create index if not exists cms_admin_global_revisions_section_idx
  on public.cms_admin_global_revisions (section, edited_at desc);

create table if not exists public.cms_admin_refresh_jobs (
  id text primary key,
  key text not null unique,
  name text not null,
  family text not null,
  lane text not null,
  enabled boolean not null default true,
  cadence text not null default '',
  source_dependency text not null default '',
  last_run_at timestamptz,
  last_success_at timestamptz,
  last_failure_at timestamptz,
  latest_status text not null default 'planned',
  latest_error text,
  next_scheduled_run_at timestamptz,
  manual_run_supported boolean not null default false,
  affected_records_count integer,
  last_operator_action_at timestamptz,
  last_operator_note text
);

alter table public.cms_admin_refresh_jobs
  drop constraint if exists cms_admin_refresh_jobs_status_check;

alter table public.cms_admin_refresh_jobs
  add constraint cms_admin_refresh_jobs_status_check
  check (latest_status in ('healthy', 'running', 'warning', 'failed', 'paused', 'planned'));

create index if not exists cms_admin_refresh_jobs_family_idx
  on public.cms_admin_refresh_jobs (family, latest_status, next_scheduled_run_at);

create table if not exists public.cms_launch_config_sections (
  section text primary key,
  data jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

create index if not exists cms_launch_config_sections_updated_idx
  on public.cms_launch_config_sections (updated_at desc);

create table if not exists public.cms_admin_activity_log (
  id text primary key,
  actor_user_id text,
  actor_email text not null default '',
  action_type text not null,
  target_type text not null,
  target_id text,
  target_family text,
  target_slug text,
  summary text not null default '',
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists cms_admin_activity_log_created_idx
  on public.cms_admin_activity_log (created_at desc);

create index if not exists cms_admin_activity_log_action_idx
  on public.cms_admin_activity_log (action_type, created_at desc);

create table if not exists public.cms_admin_editor_locks (
  id text primary key,
  family text not null,
  slug text not null,
  editor_user_id text,
  editor_email text not null,
  started_at timestamptz not null default now(),
  last_heartbeat_at timestamptz not null default now(),
  expires_at timestamptz not null
);

create unique index if not exists cms_admin_editor_locks_family_slug_email_idx
  on public.cms_admin_editor_locks (family, slug, editor_email);

create index if not exists cms_admin_editor_locks_family_slug_idx
  on public.cms_admin_editor_locks (family, slug);

create index if not exists cms_admin_editor_locks_expires_idx
  on public.cms_admin_editor_locks (expires_at);

create table if not exists public.cms_admin_pending_approvals (
  id text primary key,
  family text not null,
  slug text not null,
  title text not null,
  record_id text,
  submitted_by_user_id text,
  submitted_by_email text not null,
  submitted_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  decision text not null default 'pending',
  reviewed_at timestamptz,
  reviewed_by_user_id text,
  reviewed_by_email text,
  review_note text,
  action_type text not null,
  target_status text not null,
  summary text not null,
  changed_fields jsonb not null default '[]'::jsonb,
  snapshot jsonb not null default '{}'::jsonb,
  base_record_updated_at timestamptz
);

alter table public.cms_admin_pending_approvals
  drop constraint if exists cms_admin_pending_approvals_decision_check,
  drop constraint if exists cms_admin_pending_approvals_target_status_check;

alter table public.cms_admin_pending_approvals
  add constraint cms_admin_pending_approvals_decision_check
    check (decision in ('pending', 'approved', 'rejected')),
  add constraint cms_admin_pending_approvals_target_status_check
    check (target_status in ('draft', 'review', 'ready_for_review', 'needs_fix', 'published', 'archived'));

create index if not exists cms_admin_pending_approvals_decision_updated_idx
  on public.cms_admin_pending_approvals (decision, updated_at desc);

create index if not exists cms_admin_pending_approvals_record_lookup_idx
  on public.cms_admin_pending_approvals (family, slug, decision, updated_at desc);

create index if not exists cms_admin_pending_approvals_submitter_idx
  on public.cms_admin_pending_approvals (submitted_by_email, decision, updated_at desc);

create table if not exists public.cms_admin_import_batches (
  id text primary key,
  family text not null,
  actor_user_id text,
  actor_email text not null,
  file_name text not null,
  import_mode text not null,
  status text not null,
  source_kind text not null default 'csv',
  storage_mode text not null default 'durable',
  total_rows integer not null default 0,
  valid_rows integer not null default 0,
  warning_rows integer not null default 0,
  failed_rows integer not null default 0,
  created_count integer not null default 0,
  updated_count integer not null default 0,
  queued_count integer not null default 0,
  skipped_count integer not null default 0,
  failed_count integer not null default 0,
  summary text not null default '',
  field_mapping jsonb not null default '{}'::jsonb,
  uploaded_at timestamptz not null default timezone('utc', now()),
  completed_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

alter table public.cms_admin_import_batches
  alter column storage_mode set default 'durable';

alter table public.cms_admin_import_batches
  drop constraint if exists cms_admin_import_batches_mode_check,
  drop constraint if exists cms_admin_import_batches_status_check,
  drop constraint if exists cms_admin_import_batches_storage_mode_check;

alter table public.cms_admin_import_batches
  add constraint cms_admin_import_batches_mode_check
    check (import_mode in ('create_new_only', 'update_existing_only', 'create_or_update')),
  add constraint cms_admin_import_batches_status_check
    check (status in ('preview_ready', 'completed', 'completed_with_errors', 'queued_for_approval', 'failed')),
  add constraint cms_admin_import_batches_storage_mode_check
    check (storage_mode in ('durable', 'fallback'));

create index if not exists cms_admin_import_batches_family_updated_idx
  on public.cms_admin_import_batches (family, updated_at desc);

create index if not exists cms_admin_import_batches_actor_updated_idx
  on public.cms_admin_import_batches (actor_email, updated_at desc);

create table if not exists public.cms_admin_import_rows (
  id text primary key,
  batch_id text not null references public.cms_admin_import_batches(id) on delete cascade,
  row_number integer not null,
  identifier text,
  title text,
  slug text,
  matched_record_id text,
  matched_slug text,
  operation text not null,
  status text not null,
  warnings jsonb not null default '[]'::jsonb,
  errors jsonb not null default '[]'::jsonb,
  payload jsonb not null default '{}'::jsonb,
  result_note text not null default '',
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

alter table public.cms_admin_import_rows
  drop constraint if exists cms_admin_import_rows_operation_check,
  drop constraint if exists cms_admin_import_rows_status_check;

alter table public.cms_admin_import_rows
  add constraint cms_admin_import_rows_operation_check
    check (operation in ('create', 'update', 'skip', 'queue_for_approval')),
  add constraint cms_admin_import_rows_status_check
    check (status in ('valid', 'warning', 'failed', 'created', 'updated', 'skipped', 'queued_for_approval'));

create index if not exists cms_admin_import_rows_batch_status_idx
  on public.cms_admin_import_rows (batch_id, status, row_number asc);

-- ---------------------------------------------------------------------------
-- Required default rows for hosted proof
-- ---------------------------------------------------------------------------

insert into public.cms_membership_tiers (
  id,
  slug,
  name,
  description,
  status,
  active,
  display_order,
  visibility,
  cta_label,
  cta_href,
  included_families,
  included_records,
  excluded_records,
  feature_access,
  internal_notes,
  updated_at
)
values
  (
    '00000000-0000-0000-0000-000000000101',
    'free',
    'Free',
    'Basic market pages, account tools, and editorial learning surfaces.',
    'active',
    true,
    1,
    'public',
    'Upgrade to Pro',
    '/pricing',
    '[]'::jsonb,
    '[]'::jsonb,
    '[]'::jsonb,
    '{"stocks_basic":true,"stocks_forecasts":false,"mutual_funds_basic":true,"portfolio_tools":true,"research_access":true,"courses_access":false,"premium_analytics":false}'::jsonb,
    null,
    now()
  ),
  (
    '00000000-0000-0000-0000-000000000102',
    'pro',
    'Pro',
    'Forecast-style guidance, premium learning, and stronger product access.',
    'active',
    true,
    2,
    'public',
    'Upgrade to Pro Max',
    '/pricing',
    '[]'::jsonb,
    '[]'::jsonb,
    '[]'::jsonb,
    '{"stocks_basic":true,"stocks_forecasts":true,"mutual_funds_basic":true,"portfolio_tools":true,"research_access":true,"courses_access":true,"premium_analytics":false}'::jsonb,
    null,
    now()
  ),
  (
    '00000000-0000-0000-0000-000000000103',
    'pro-max',
    'Pro Max',
    'Full premium analytics and the broadest member product access.',
    'active',
    true,
    3,
    'public',
    'Current top tier',
    '/pricing',
    '[]'::jsonb,
    '[]'::jsonb,
    '[]'::jsonb,
    '{"stocks_basic":true,"stocks_forecasts":true,"mutual_funds_basic":true,"portfolio_tools":true,"research_access":true,"courses_access":true,"premium_analytics":true}'::jsonb,
    null,
    now()
  )
on conflict (slug) do update
set
  name = excluded.name,
  description = excluded.description,
  status = excluded.status,
  active = excluded.active,
  display_order = excluded.display_order,
  visibility = excluded.visibility,
  cta_label = excluded.cta_label,
  cta_href = excluded.cta_href,
  feature_access = excluded.feature_access,
  updated_at = now();

insert into public.cms_admin_refresh_jobs (
  id,
  key,
  name,
  family,
  lane,
  enabled,
  cadence,
  source_dependency,
  latest_status,
  latest_error,
  manual_run_supported,
  affected_records_count,
  last_operator_action_at,
  last_operator_note
)
values
  ('refresh_stock_quote_session', 'stock_quote_session', 'Stock quote / session refresh', 'stocks', 'stock_quote_session', true, 'Every 15 minutes during market hours', 'Market data provider', 'warning', 'Provider-backed intraday verification is still pending.', true, null, null, null),
  ('refresh_benchmark_history', 'benchmark_history', 'Benchmark history refresh', 'indices', 'benchmark_history', true, 'Daily after market close', 'Benchmark history durable lane', 'planned', null, true, null, null, null),
  ('refresh_stock_fundamentals', 'stock_fundamentals', 'Stock fundamentals refresh', 'stocks', 'stock_fundamentals', true, 'Weekly or on filing availability', 'Fundamentals durable lane', 'planned', null, true, null, null, null),
  ('refresh_stock_shareholding', 'stock_shareholding', 'Stock shareholding refresh', 'stocks', 'stock_shareholding', true, 'Quarterly', 'Shareholding durable lane', 'planned', null, true, null, null, null),
  ('refresh_mutual_fund_nav_history', 'mutual_fund_nav_history', 'Mutual-fund NAV history refresh', 'mutual-funds', 'mutual_fund_nav_history', true, 'Daily end of day', 'NAV history durable lane', 'planned', null, true, null, null, null),
  ('refresh_fund_factsheets', 'fund_factsheets', 'Fund factsheet refresh', 'mutual-funds', 'fund_factsheets', true, 'Monthly', 'Fund factsheet snapshot lane', 'planned', null, true, null, null, null),
  ('refresh_fund_holdings', 'fund_holdings', 'Fund holdings refresh', 'mutual-funds', 'fund_holdings', true, 'Monthly', 'Fund holdings durable lane', 'planned', null, true, null, null, null),
  ('refresh_fund_sector_allocation', 'fund_sector_allocation', 'Fund sector allocation refresh', 'mutual-funds', 'fund_sector_allocation', true, 'Monthly', 'Fund sector allocation durable lane', 'planned', null, true, null, null, null),
  ('refresh_sector_performance', 'sector_performance', 'Sector performance refresh', 'indices', 'sector_performance', true, 'Daily after market close', 'Sector performance durable lane', 'planned', null, true, null, null, null),
  ('refresh_index_composition', 'index_composition', 'Index composition refresh', 'indices', 'index_composition', true, 'Weekly', 'Index composition durable lane', 'planned', null, true, null, null, null),
  ('refresh_editorial_catalog', 'editorial_catalog', 'Editorial catalog refresh', 'editorial', 'editorial_catalog', false, 'Manual / CMS driven', 'Editorial CMS', 'paused', null, false, null, null, null)
on conflict (key) do update
set
  name = excluded.name,
  family = excluded.family,
  lane = excluded.lane,
  enabled = excluded.enabled,
  cadence = excluded.cadence,
  source_dependency = excluded.source_dependency,
  latest_status = excluded.latest_status,
  latest_error = excluded.latest_error,
  manual_run_supported = excluded.manual_run_supported;

insert into public.cms_launch_config_sections (section, data, updated_at)
values
  ('basic', '{}'::jsonb, now()),
  ('content', '{}'::jsonb, now()),
  ('experience', '{}'::jsonb, now()),
  ('supabase', '{}'::jsonb, now()),
  ('marketData', '{}'::jsonb, now()),
  ('referenceData', '{}'::jsonb, now()),
  ('billing', '{}'::jsonb, now()),
  ('charting', '{}'::jsonb, now()),
  ('communications', '{}'::jsonb, now()),
  ('compliance', '{}'::jsonb, now()),
  ('analytics', '{}'::jsonb, now()),
  ('ai', '{}'::jsonb, now()),
  ('automation', '{}'::jsonb, now()),
  ('distribution', '{}'::jsonb, now()),
  ('partners', '{}'::jsonb, now()),
  ('researchOps', '{}'::jsonb, now())
on conflict (section) do nothing;

commit;
