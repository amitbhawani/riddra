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
  sections jsonb not null default '{}'::jsonb,
  documents jsonb not null default '[]'::jsonb,
  imports jsonb not null default '[]'::jsonb,
  scheduled_publish_at timestamptz,
  scheduled_unpublish_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint cms_admin_records_family_slug_unique unique (family, slug),
  constraint cms_admin_records_status_check check (status in ('draft', 'review', 'published', 'archived')),
  constraint cms_admin_records_visibility_check check (visibility in ('public', 'private', 'archived'))
);

create index if not exists cms_admin_records_family_updated_idx
  on public.cms_admin_records (family, updated_at desc);

create index if not exists cms_admin_records_status_updated_idx
  on public.cms_admin_records (status, updated_at desc);

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
  edited_at timestamptz not null default now(),
  constraint cms_admin_record_revisions_state_check check (revision_state in ('Published', 'Review ready', 'Rollback staged'))
);

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
  updated_at timestamptz not null default now(),
  constraint cms_admin_global_modules_section_check check (section in ('sharedBlocks', 'banners', 'routeStrips', 'marketModules')),
  constraint cms_admin_global_modules_status_check check (status in ('draft', 'published'))
);

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
  edited_at timestamptz not null default now(),
  constraint cms_admin_global_revisions_section_check check (section in ('header', 'footer', 'sharedBlocks', 'banners', 'routeStrips', 'marketModules')),
  constraint cms_admin_global_revisions_status_check check (status in ('draft', 'published', 'reverted'))
);

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
  last_operator_note text,
  constraint cms_admin_refresh_jobs_status_check check (latest_status in ('healthy', 'running', 'warning', 'failed', 'paused', 'planned'))
);

create index if not exists cms_admin_refresh_jobs_family_idx
  on public.cms_admin_refresh_jobs (family, latest_status, next_scheduled_run_at);

create table if not exists public.cms_launch_config_sections (
  section text primary key,
  data jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

create index if not exists cms_launch_config_sections_updated_idx
  on public.cms_launch_config_sections (updated_at desc);
