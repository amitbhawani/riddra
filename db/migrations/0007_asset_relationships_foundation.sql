create table if not exists public.taxonomies (
  id uuid primary key default gen_random_uuid(),
  taxonomy_type text not null,
  slug text not null,
  label text not null,
  description text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (taxonomy_type, slug)
);

create table if not exists public.asset_taxonomies (
  id uuid primary key default gen_random_uuid(),
  asset_type text not null,
  asset_slug text not null,
  taxonomy_id uuid not null references public.taxonomies (id) on delete cascade,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  unique (asset_type, asset_slug, taxonomy_id)
);

create index if not exists asset_taxonomies_asset_lookup_idx
  on public.asset_taxonomies (asset_type, asset_slug, sort_order);

create table if not exists public.asset_relationships (
  id uuid primary key default gen_random_uuid(),
  source_asset_type text not null,
  source_asset_slug text not null,
  target_asset_type text not null,
  target_asset_slug text not null,
  relationship_type text not null,
  strength integer not null default 50,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (source_asset_type, source_asset_slug, target_asset_type, target_asset_slug, relationship_type)
);

create index if not exists asset_relationships_source_lookup_idx
  on public.asset_relationships (source_asset_type, source_asset_slug, relationship_type);

create index if not exists asset_relationships_target_lookup_idx
  on public.asset_relationships (target_asset_type, target_asset_slug, relationship_type);
