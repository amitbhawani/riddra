create table if not exists public.product_user_profiles (
  id uuid primary key default gen_random_uuid(),
  user_key text not null unique,
  auth_user_id uuid,
  email text not null unique,
  name text not null,
  membership_tier text,
  role text not null default 'user',
  created_at timestamptz not null default now(),
  last_active_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint product_user_profiles_role_check check (role in ('admin', 'editor', 'user'))
);

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

create index if not exists product_user_portfolio_holdings_profile_idx
  on public.product_user_portfolio_holdings (product_user_profile_id, updated_at desc);

create table if not exists public.product_system_settings (
  settings_key text primary key,
  site_name text not null,
  default_meta_title_suffix text not null,
  default_meta_description text not null,
  default_og_image text not null default '',
  default_canonical_base text not null default '',
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

create table if not exists public.cms_media_assets (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  alt_text text not null default '',
  url text not null,
  asset_type text not null default 'image',
  source_kind text not null,
  file_name text not null,
  mime_type text not null,
  size_bytes bigint,
  tags jsonb not null default '[]'::jsonb,
  uploaded_by text not null,
  uploaded_at timestamptz not null default now(),
  status text not null default 'draft',
  constraint cms_media_assets_asset_type_check check (asset_type in ('image')),
  constraint cms_media_assets_source_kind_check check (source_kind in ('upload', 'external_url')),
  constraint cms_media_assets_status_check check (status in ('draft', 'published'))
);

create index if not exists cms_media_assets_uploaded_at_idx
  on public.cms_media_assets (uploaded_at desc);

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
  snapshot jsonb not null default '{}'::jsonb,
  constraint cms_record_versions_status_check check (status in ('draft', 'review', 'published', 'archived'))
);

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
  retried_from_run_id text,
  constraint cms_refresh_job_runs_status_check check (status in ('running', 'healthy', 'failed', 'warning'))
);

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
  internal_notes text,
  updated_at timestamptz not null default now(),
  constraint cms_membership_tiers_status_check check (status in ('active', 'archived')),
  constraint cms_membership_tiers_visibility_check check (visibility in ('public', 'private'))
);

create index if not exists cms_membership_tiers_display_order_idx
  on public.cms_membership_tiers (display_order asc, updated_at desc);
