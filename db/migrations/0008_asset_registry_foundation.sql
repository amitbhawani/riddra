create table if not exists asset_registry (
  id uuid primary key default gen_random_uuid(),
  asset_kind text not null,
  canonical_slug text not null unique,
  canonical_name text not null,
  exchange_code text,
  lifecycle_state text not null default 'active',
  parent_asset_id uuid references asset_registry(id) on delete set null,
  target_asset_id uuid references asset_registry(id) on delete set null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists asset_aliases (
  id uuid primary key default gen_random_uuid(),
  asset_id uuid not null references asset_registry(id) on delete cascade,
  alias_value text not null,
  alias_kind text not null,
  is_primary boolean not null default false,
  created_at timestamptz not null default now(),
  unique (asset_id, alias_value, alias_kind)
);

create index if not exists asset_registry_kind_idx on asset_registry(asset_kind);
create index if not exists asset_registry_lifecycle_idx on asset_registry(lifecycle_state);
create index if not exists asset_aliases_value_idx on asset_aliases(alias_value);
