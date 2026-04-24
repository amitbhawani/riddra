create table if not exists public.content_sections (
  id uuid primary key default gen_random_uuid(),
  asset_type text not null,
  asset_slug text not null,
  section_key text not null,
  title text not null,
  body text not null,
  display_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (asset_type, asset_slug, section_key)
);

create index if not exists content_sections_asset_lookup_idx
  on public.content_sections (asset_type, asset_slug, display_order);
