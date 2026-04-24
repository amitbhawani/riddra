create table if not exists source_snapshots (
  id uuid primary key default gen_random_uuid(),
  source_contract_id uuid,
  asset_id uuid,
  snapshot_key text not null,
  fetched_at timestamptz not null default now(),
  payload jsonb not null default '{}'::jsonb,
  status text not null default 'captured'
);

create table if not exists record_lineage (
  id uuid primary key default gen_random_uuid(),
  lineage_type text not null,
  source_record_type text not null,
  source_record_id text not null,
  derived_record_type text not null,
  derived_record_id text not null,
  created_at timestamptz not null default now(),
  metadata jsonb not null default '{}'::jsonb
);

create table if not exists delivery_artifacts (
  id uuid primary key default gen_random_uuid(),
  artifact_type text not null,
  artifact_key text not null,
  asset_id uuid,
  generated_from text not null,
  generated_at timestamptz not null default now(),
  expires_at timestamptz,
  metadata jsonb not null default '{}'::jsonb
);

create table if not exists operator_settings (
  id uuid primary key default gen_random_uuid(),
  scope text not null,
  setting_key text not null,
  setting_value jsonb not null default '{}'::jsonb,
  status text not null default 'draft',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists provider_registry (
  id uuid primary key default gen_random_uuid(),
  provider_class text not null,
  provider_name text not null,
  status text not null default 'queued',
  config_schema jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
