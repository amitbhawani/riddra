create table if not exists public.market_refresh_runs (
  id uuid primary key default gen_random_uuid(),
  series_type text not null,
  asset_slug text not null,
  timeframe text not null default 'spot',
  run_status text not null default 'running',
  trigger_source text not null,
  source_label text not null default '',
  source_code text,
  ingest_mode text not null default 'provider_sync',
  requested_by text,
  task_identifier text,
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  records_written integer not null default 0,
  records_retained integer not null default 0,
  latest_point_at text,
  error_message text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists market_refresh_runs_lookup_idx
  on public.market_refresh_runs (series_type, asset_slug, timeframe, started_at desc);

create table if not exists public.market_series_status (
  id uuid primary key default gen_random_uuid(),
  series_type text not null,
  asset_slug text not null,
  timeframe text not null default 'spot',
  source_label text not null default '',
  source_code text,
  ingest_mode text not null default 'provider_sync',
  refresh_status text not null default 'pending',
  last_refresh_run_id uuid references public.market_refresh_runs (id) on delete set null,
  last_successful_run_id uuid references public.market_refresh_runs (id) on delete set null,
  last_refreshed_at timestamptz,
  last_successful_at timestamptz,
  latest_point_at text,
  coverage_start text,
  coverage_end text,
  records_retained integer not null default 0,
  latest_value numeric(20,6),
  latest_change_percent numeric(12,6),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (series_type, asset_slug, timeframe)
);

create index if not exists market_series_status_lookup_idx
  on public.market_series_status (series_type, timeframe, updated_at desc);

create table if not exists public.stock_quote_history (
  id uuid primary key default gen_random_uuid(),
  slug text not null,
  source_label text not null default '',
  source_code text,
  quoted_at timestamptz not null,
  price numeric(20,6) not null,
  change_percent numeric(12,6) not null,
  refresh_run_id uuid references public.market_refresh_runs (id) on delete set null,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (slug, quoted_at, source_label)
);

create index if not exists stock_quote_history_lookup_idx
  on public.stock_quote_history (slug, quoted_at desc);

create table if not exists public.stock_ohlcv_history (
  id uuid primary key default gen_random_uuid(),
  slug text not null,
  timeframe text not null default '1D',
  source_label text not null default '',
  source_code text,
  bar_time text not null,
  open numeric(20,6) not null,
  high numeric(20,6) not null,
  low numeric(20,6) not null,
  close numeric(20,6) not null,
  volume numeric(20,6),
  refresh_run_id uuid references public.market_refresh_runs (id) on delete set null,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (slug, timeframe, bar_time, source_label)
);

create index if not exists stock_ohlcv_history_lookup_idx
  on public.stock_ohlcv_history (slug, timeframe, bar_time desc);

create table if not exists public.fund_nav_history (
  id uuid primary key default gen_random_uuid(),
  slug text not null,
  source_label text not null default '',
  source_code text,
  nav_date date not null,
  nav numeric(20,6) not null,
  returns_1y numeric(12,6),
  refresh_run_id uuid references public.market_refresh_runs (id) on delete set null,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (slug, nav_date, source_label)
);

create index if not exists fund_nav_history_lookup_idx
  on public.fund_nav_history (slug, nav_date desc);

alter table public.index_tracker_snapshots
  add column if not exists source_label text not null default '',
  add column if not exists ingest_mode text not null default 'provider_sync',
  add column if not exists refresh_run_id uuid references public.market_refresh_runs (id) on delete set null,
  add column if not exists payload jsonb not null default '{}'::jsonb,
  add column if not exists component_count integer not null default 0,
  add column if not exists last_updated_at timestamptz;

create index if not exists index_tracker_snapshots_refresh_run_idx
  on public.index_tracker_snapshots (refresh_run_id);
