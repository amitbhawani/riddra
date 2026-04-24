create table if not exists public.source_contracts (
  id uuid primary key default gen_random_uuid(),
  source_code text not null references public.data_sources (code) on delete cascade,
  domain text not null,
  asset_kind text not null,
  refresh_cadence text not null,
  latency_class text not null default 'delayed',
  legal_basis text,
  fallback_mode text not null default 'manual_override',
  target_tables text[] not null default '{}',
  status text not null default 'planned',
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (source_code, domain, asset_kind)
);

create table if not exists public.ingest_jobs (
  id uuid primary key default gen_random_uuid(),
  job_code text not null unique,
  contract_id uuid references public.source_contracts (id) on delete cascade,
  run_mode text not null default 'scheduled',
  job_status text not null default 'planned',
  cadence text,
  target_entity text not null,
  target_table text not null,
  last_success_at timestamptz,
  last_error_at timestamptz,
  next_run_at timestamptz,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.asset_lifecycle_transitions (
  id uuid primary key default gen_random_uuid(),
  registry_id uuid not null references public.asset_registry (id) on delete cascade,
  from_state text not null,
  to_state text not null,
  transition_reason text not null,
  automation_mode text not null default 'manual_review',
  source_job_code text references public.ingest_jobs (job_code),
  effective_at timestamptz,
  status text not null default 'planned',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.override_executions (
  id uuid primary key default gen_random_uuid(),
  override_scope text not null,
  target_record_kind text not null,
  target_record_id text not null,
  field_name text not null,
  override_value jsonb,
  reason text not null,
  owner text,
  severity text not null default 'review',
  source_recovery_mode text not null default 'manual_revert',
  status text not null default 'active',
  review_at timestamptz,
  expires_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.market_data_readiness (
  id uuid primary key default gen_random_uuid(),
  surface_code text not null unique,
  surface_name text not null,
  latency_requirement text not null,
  source_strategy text not null,
  cache_strategy text,
  entitlement_scope text not null default 'public',
  status text not null default 'planned',
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists source_contracts_domain_idx on public.source_contracts(domain);
create index if not exists ingest_jobs_status_idx on public.ingest_jobs(job_status);
create index if not exists lifecycle_transitions_registry_idx on public.asset_lifecycle_transitions(registry_id);
create index if not exists override_executions_status_idx on public.override_executions(status);
create index if not exists market_data_readiness_status_idx on public.market_data_readiness(status);
