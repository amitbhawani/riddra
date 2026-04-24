create table if not exists public.tracked_indexes (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  market_scope text not null default 'india',
  benchmark_type text not null default 'equity_index',
  primary_source_code text references public.data_sources (code),
  update_mode text not null default 'snapshot',
  refresh_target_seconds integer,
  public_access_level text not null default 'delayed',
  premium_access_level text not null default 'intraday',
  status text not null default 'planned',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.index_component_weights (
  id uuid primary key default gen_random_uuid(),
  tracked_index_id uuid not null references public.tracked_indexes (id) on delete cascade,
  component_symbol text not null,
  component_name text not null,
  weight numeric(10,4) not null,
  effective_from date not null default current_date,
  effective_to date,
  source_code text references public.data_sources (code),
  created_at timestamptz not null default now(),
  unique (tracked_index_id, component_symbol, effective_from)
);

create index if not exists index_component_weights_lookup_idx
  on public.index_component_weights (tracked_index_id, effective_from desc);

create table if not exists public.index_tracker_snapshots (
  id uuid primary key default gen_random_uuid(),
  tracked_index_id uuid not null references public.tracked_indexes (id) on delete cascade,
  snapshot_at timestamptz not null,
  session_phase text,
  move_percent numeric(10,4),
  weighted_breadth_score numeric(10,4),
  advancing_count integer,
  declining_count integer,
  positive_weight_share numeric(10,4),
  negative_weight_share numeric(10,4),
  market_mood text,
  dominance_label text,
  trend_label text,
  source_code text references public.data_sources (code),
  created_at timestamptz not null default now(),
  unique (tracked_index_id, snapshot_at)
);

create index if not exists index_tracker_snapshots_lookup_idx
  on public.index_tracker_snapshots (tracked_index_id, snapshot_at desc);

create table if not exists public.index_component_snapshots (
  id uuid primary key default gen_random_uuid(),
  index_snapshot_id uuid not null references public.index_tracker_snapshots (id) on delete cascade,
  component_symbol text not null,
  component_name text not null,
  weight numeric(10,4) not null,
  change_percent numeric(10,4),
  contribution numeric(10,4),
  signal text,
  created_at timestamptz not null default now(),
  unique (index_snapshot_id, component_symbol)
);

create index if not exists index_component_snapshots_lookup_idx
  on public.index_component_snapshots (index_snapshot_id, contribution desc);

create table if not exists public.index_refresh_runs (
  id uuid primary key default gen_random_uuid(),
  tracked_index_id uuid not null references public.tracked_indexes (id) on delete cascade,
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  run_status text not null default 'queued',
  trigger_source text not null default 'scheduler',
  source_code text references public.data_sources (code),
  records_written integer not null default 0,
  error_message text,
  created_at timestamptz not null default now()
);

create index if not exists index_refresh_runs_lookup_idx
  on public.index_refresh_runs (tracked_index_id, started_at desc);
