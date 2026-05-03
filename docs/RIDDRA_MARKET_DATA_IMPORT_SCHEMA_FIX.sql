-- Riddra Market Data Import schema alignment
-- Run this first in Supabase SQL Editor.
-- Safe goals:
-- - idempotent only
-- - no DROP / no TRUNCATE / no destructive DELETE
-- - create or align durable market-data history + import-tracking tables
-- - guarantee every column used by lib/market-data-imports.ts and app/api/admin/market-data/import/*

create extension if not exists pgcrypto;

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

alter table public.market_refresh_runs
  add column if not exists series_type text,
  add column if not exists asset_slug text,
  add column if not exists timeframe text,
  add column if not exists run_status text,
  add column if not exists trigger_source text,
  add column if not exists source_label text,
  add column if not exists source_code text,
  add column if not exists ingest_mode text,
  add column if not exists requested_by text,
  add column if not exists task_identifier text,
  add column if not exists started_at timestamptz,
  add column if not exists finished_at timestamptz,
  add column if not exists records_written integer,
  add column if not exists records_retained integer,
  add column if not exists latest_point_at text,
  add column if not exists error_message text,
  add column if not exists metadata jsonb,
  add column if not exists created_at timestamptz;

update public.market_refresh_runs
set
  timeframe = coalesce(nullif(timeframe, ''), 'spot'),
  run_status = coalesce(nullif(run_status, ''), 'running'),
  source_label = coalesce(source_label, ''),
  ingest_mode = coalesce(nullif(ingest_mode, ''), 'provider_sync'),
  started_at = coalesce(started_at, now()),
  records_written = coalesce(records_written, 0),
  records_retained = coalesce(records_retained, 0),
  metadata = coalesce(metadata, '{}'::jsonb),
  created_at = coalesce(created_at, now())
where
  timeframe is null
  or run_status is null
  or source_label is null
  or ingest_mode is null
  or started_at is null
  or records_written is null
  or records_retained is null
  or metadata is null
  or created_at is null;

alter table public.market_refresh_runs
  alter column timeframe set default 'spot',
  alter column run_status set default 'running',
  alter column source_label set default '',
  alter column ingest_mode set default 'provider_sync',
  alter column started_at set default now(),
  alter column records_written set default 0,
  alter column records_retained set default 0,
  alter column metadata set default '{}'::jsonb,
  alter column created_at set default now();

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

alter table public.market_series_status
  add column if not exists series_type text,
  add column if not exists asset_slug text,
  add column if not exists timeframe text,
  add column if not exists source_label text,
  add column if not exists source_code text,
  add column if not exists ingest_mode text,
  add column if not exists refresh_status text,
  add column if not exists last_refresh_run_id uuid references public.market_refresh_runs (id) on delete set null,
  add column if not exists last_successful_run_id uuid references public.market_refresh_runs (id) on delete set null,
  add column if not exists last_refreshed_at timestamptz,
  add column if not exists last_successful_at timestamptz,
  add column if not exists latest_point_at text,
  add column if not exists coverage_start text,
  add column if not exists coverage_end text,
  add column if not exists records_retained integer,
  add column if not exists latest_value numeric(20,6),
  add column if not exists latest_change_percent numeric(12,6),
  add column if not exists metadata jsonb,
  add column if not exists created_at timestamptz,
  add column if not exists updated_at timestamptz;

update public.market_series_status
set
  timeframe = coalesce(nullif(timeframe, ''), 'spot'),
  source_label = coalesce(source_label, ''),
  ingest_mode = coalesce(nullif(ingest_mode, ''), 'provider_sync'),
  refresh_status = coalesce(nullif(refresh_status, ''), 'pending'),
  records_retained = coalesce(records_retained, 0),
  metadata = coalesce(metadata, '{}'::jsonb),
  created_at = coalesce(created_at, now()),
  updated_at = coalesce(updated_at, now())
where
  timeframe is null
  or source_label is null
  or ingest_mode is null
  or refresh_status is null
  or records_retained is null
  or metadata is null
  or created_at is null
  or updated_at is null;

alter table public.market_series_status
  alter column timeframe set default 'spot',
  alter column source_label set default '',
  alter column ingest_mode set default 'provider_sync',
  alter column refresh_status set default 'pending',
  alter column records_retained set default 0,
  alter column metadata set default '{}'::jsonb,
  alter column created_at set default now(),
  alter column updated_at set default now();

create index if not exists market_series_status_lookup_idx
  on public.market_series_status (series_type, timeframe, updated_at desc);

create unique index if not exists market_series_status_series_asset_timeframe_unique_idx
  on public.market_series_status (series_type, asset_slug, timeframe);

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

alter table public.stock_quote_history
  add column if not exists slug text,
  add column if not exists source_label text,
  add column if not exists source_code text,
  add column if not exists quoted_at timestamptz,
  add column if not exists price numeric(20,6),
  add column if not exists change_percent numeric(12,6),
  add column if not exists refresh_run_id uuid references public.market_refresh_runs (id) on delete set null,
  add column if not exists payload jsonb,
  add column if not exists created_at timestamptz,
  add column if not exists updated_at timestamptz;

update public.stock_quote_history
set
  source_label = coalesce(source_label, ''),
  payload = coalesce(payload, '{}'::jsonb),
  created_at = coalesce(created_at, now()),
  updated_at = coalesce(updated_at, created_at, now())
where
  source_label is null
  or payload is null
  or created_at is null
  or updated_at is null;

alter table public.stock_quote_history
  alter column source_label set default '',
  alter column payload set default '{}'::jsonb,
  alter column created_at set default now(),
  alter column updated_at set default now();

create index if not exists stock_quote_history_lookup_idx
  on public.stock_quote_history (slug, quoted_at desc);

create unique index if not exists stock_quote_history_unique_idx
  on public.stock_quote_history (slug, quoted_at, source_label);

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

alter table public.stock_ohlcv_history
  add column if not exists slug text,
  add column if not exists timeframe text,
  add column if not exists source_label text,
  add column if not exists source_code text,
  add column if not exists bar_time text,
  add column if not exists open numeric(20,6),
  add column if not exists high numeric(20,6),
  add column if not exists low numeric(20,6),
  add column if not exists close numeric(20,6),
  add column if not exists volume numeric(20,6),
  add column if not exists refresh_run_id uuid references public.market_refresh_runs (id) on delete set null,
  add column if not exists payload jsonb,
  add column if not exists created_at timestamptz,
  add column if not exists updated_at timestamptz;

update public.stock_ohlcv_history
set
  timeframe = coalesce(nullif(timeframe, ''), '1D'),
  source_label = coalesce(source_label, ''),
  payload = coalesce(payload, '{}'::jsonb),
  created_at = coalesce(created_at, now()),
  updated_at = coalesce(updated_at, created_at, now())
where
  timeframe is null
  or source_label is null
  or payload is null
  or created_at is null
  or updated_at is null;

alter table public.stock_ohlcv_history
  alter column timeframe set default '1D',
  alter column source_label set default '',
  alter column payload set default '{}'::jsonb,
  alter column created_at set default now(),
  alter column updated_at set default now();

create index if not exists stock_ohlcv_history_lookup_idx
  on public.stock_ohlcv_history (slug, timeframe, bar_time desc);

create unique index if not exists stock_ohlcv_history_unique_idx
  on public.stock_ohlcv_history (slug, timeframe, bar_time, source_label);

create table if not exists public.benchmark_ohlcv_history (
  id uuid primary key default gen_random_uuid(),
  index_slug text not null,
  date date not null,
  open numeric not null,
  high numeric not null,
  low numeric not null,
  close numeric not null,
  volume numeric,
  source_label text not null default '',
  source_code text,
  refresh_run_id uuid references public.market_refresh_runs (id) on delete set null,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.benchmark_ohlcv_history
  add column if not exists index_slug text,
  add column if not exists date date,
  add column if not exists open numeric,
  add column if not exists high numeric,
  add column if not exists low numeric,
  add column if not exists close numeric,
  add column if not exists volume numeric,
  add column if not exists source_label text,
  add column if not exists source_code text,
  add column if not exists refresh_run_id uuid references public.market_refresh_runs (id) on delete set null,
  add column if not exists payload jsonb,
  add column if not exists created_at timestamptz,
  add column if not exists updated_at timestamptz;

update public.benchmark_ohlcv_history
set
  source_label = coalesce(source_label, ''),
  payload = coalesce(payload, '{}'::jsonb),
  created_at = coalesce(created_at, now()),
  updated_at = coalesce(updated_at, created_at, now())
where
  source_label is null
  or payload is null
  or created_at is null
  or updated_at is null;

alter table public.benchmark_ohlcv_history
  alter column source_label set default '',
  alter column payload set default '{}'::jsonb,
  alter column created_at set default now(),
  alter column updated_at set default now();

create index if not exists benchmark_ohlcv_history_lookup_idx
  on public.benchmark_ohlcv_history (index_slug, date desc);

create unique index if not exists benchmark_ohlcv_history_unique_idx
  on public.benchmark_ohlcv_history (index_slug, date, source_label);

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

alter table public.fund_nav_history
  add column if not exists slug text,
  add column if not exists source_label text,
  add column if not exists source_code text,
  add column if not exists nav_date date,
  add column if not exists nav numeric(20,6),
  add column if not exists returns_1y numeric(12,6),
  add column if not exists refresh_run_id uuid references public.market_refresh_runs (id) on delete set null,
  add column if not exists payload jsonb,
  add column if not exists created_at timestamptz,
  add column if not exists updated_at timestamptz;

update public.fund_nav_history
set
  source_label = coalesce(source_label, ''),
  payload = coalesce(payload, '{}'::jsonb),
  created_at = coalesce(created_at, now()),
  updated_at = coalesce(updated_at, created_at, now())
where
  source_label is null
  or payload is null
  or created_at is null
  or updated_at is null;

alter table public.fund_nav_history
  alter column source_label set default '',
  alter column payload set default '{}'::jsonb,
  alter column created_at set default now(),
  alter column updated_at set default now();

create index if not exists fund_nav_history_lookup_idx
  on public.fund_nav_history (slug, nav_date desc);

create unique index if not exists fund_nav_history_unique_idx
  on public.fund_nav_history (slug, nav_date, source_label);

create table if not exists public.market_data_import_batches (
  id uuid primary key default gen_random_uuid(),
  data_type text not null,
  import_type text,
  execution_mode text not null,
  import_mode text,
  duplicate_mode text not null,
  duplicate_strategy text,
  status text not null,
  source_type text not null default 'manual_csv',
  source_label text,
  source_url text,
  file_name text not null,
  actor_user_id text,
  actor_email text not null,
  imported_by text not null default '',
  imported_at timestamptz not null default now(),
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  row_count integer not null default 0,
  total_rows integer,
  valid_rows integer not null default 0,
  warning_rows integer not null default 0,
  warning_count integer,
  failed_rows integer not null default 0,
  error_count integer,
  duplicate_rows integer not null default 0,
  success_count integer not null default 0,
  failure_count integer not null default 0,
  skipped_count integer not null default 0,
  summary text not null default '',
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.market_data_import_batches
  add column if not exists data_type text,
  add column if not exists import_type text,
  add column if not exists execution_mode text,
  add column if not exists import_mode text,
  add column if not exists duplicate_mode text,
  add column if not exists duplicate_strategy text,
  add column if not exists status text,
  add column if not exists source_type text,
  add column if not exists source_label text,
  add column if not exists source_url text,
  add column if not exists file_name text,
  add column if not exists actor_user_id text,
  add column if not exists actor_email text,
  add column if not exists imported_by text,
  add column if not exists imported_at timestamptz,
  add column if not exists started_at timestamptz,
  add column if not exists completed_at timestamptz,
  add column if not exists row_count integer,
  add column if not exists total_rows integer,
  add column if not exists valid_rows integer,
  add column if not exists warning_rows integer,
  add column if not exists warning_count integer,
  add column if not exists failed_rows integer,
  add column if not exists error_count integer,
  add column if not exists duplicate_rows integer,
  add column if not exists success_count integer,
  add column if not exists failure_count integer,
  add column if not exists skipped_count integer,
  add column if not exists summary text,
  add column if not exists metadata jsonb,
  add column if not exists created_at timestamptz,
  add column if not exists updated_at timestamptz;

update public.market_data_import_batches
set
  data_type = coalesce(nullif(data_type, ''), import_type, 'stock_ohlcv'),
  import_type = coalesce(nullif(import_type, ''), data_type, 'stock_ohlcv'),
  execution_mode = coalesce(nullif(execution_mode, ''), import_mode, 'validate_only'),
  import_mode = coalesce(nullif(import_mode, ''), execution_mode, 'validate_only'),
  duplicate_mode = coalesce(nullif(duplicate_mode, ''), duplicate_strategy, 'replace_matching_dates'),
  duplicate_strategy = coalesce(nullif(duplicate_strategy, ''), duplicate_mode, 'replace_matching_dates'),
  status = coalesce(nullif(status, ''), 'preview_ready'),
  source_type = coalesce(nullif(source_type, ''), 'manual_csv'),
  file_name = coalesce(nullif(file_name, ''), '__market_data_import__.csv'),
  actor_email = coalesce(nullif(actor_email, ''), 'unknown@riddra.com'),
  imported_by = coalesce(nullif(imported_by, ''), actor_email, 'unknown@riddra.com'),
  imported_at = coalesce(imported_at, now()),
  started_at = coalesce(started_at, imported_at, created_at, now()),
  completed_at = coalesce(
    completed_at,
    case
      when coalesce(nullif(status, ''), 'preview_ready') in ('preview_ready', 'completed', 'completed_with_errors', 'failed')
        then coalesce(imported_at, updated_at, created_at, now())
      else null
    end
  ),
  row_count = coalesce(row_count, total_rows, 0),
  total_rows = coalesce(total_rows, row_count, 0),
  valid_rows = coalesce(valid_rows, 0),
  warning_rows = coalesce(warning_rows, warning_count, 0),
  warning_count = coalesce(warning_count, warning_rows, 0),
  failed_rows = coalesce(failed_rows, error_count, 0),
  error_count = coalesce(error_count, failed_rows, 0),
  duplicate_rows = coalesce(duplicate_rows, 0),
  success_count = coalesce(success_count, 0),
  failure_count = coalesce(failure_count, 0),
  skipped_count = coalesce(skipped_count, 0),
  summary = coalesce(summary, ''),
  metadata = coalesce(metadata, '{}'::jsonb),
  created_at = coalesce(created_at, imported_at, now()),
  updated_at = coalesce(updated_at, imported_at, created_at, now())
where
  data_type is null
  or import_type is null
  or execution_mode is null
  or import_mode is null
  or duplicate_mode is null
  or duplicate_strategy is null
  or status is null
  or source_type is null
  or file_name is null
  or actor_email is null
  or imported_by is null
  or imported_at is null
  or started_at is null
  or row_count is null
  or total_rows is null
  or valid_rows is null
  or warning_rows is null
  or warning_count is null
  or failed_rows is null
  or error_count is null
  or duplicate_rows is null
  or success_count is null
  or failure_count is null
  or skipped_count is null
  or summary is null
  or metadata is null
  or created_at is null
  or updated_at is null;

alter table public.market_data_import_batches
  alter column data_type set default 'stock_ohlcv',
  alter column execution_mode set default 'validate_only',
  alter column duplicate_mode set default 'replace_matching_dates',
  alter column status set default 'preview_ready',
  alter column source_type set default 'manual_csv',
  alter column file_name set default '__market_data_import__.csv',
  alter column actor_email set default 'unknown@riddra.com',
  alter column imported_by set default '',
  alter column imported_at set default now(),
  alter column started_at set default now(),
  alter column row_count set default 0,
  alter column valid_rows set default 0,
  alter column warning_rows set default 0,
  alter column failed_rows set default 0,
  alter column duplicate_rows set default 0,
  alter column success_count set default 0,
  alter column failure_count set default 0,
  alter column skipped_count set default 0,
  alter column summary set default '',
  alter column metadata set default '{}'::jsonb,
  alter column created_at set default now(),
  alter column updated_at set default now();

create index if not exists market_data_import_batches_lookup_idx
  on public.market_data_import_batches (data_type, imported_at desc);

create index if not exists market_data_import_batches_status_idx
  on public.market_data_import_batches (status, imported_at desc);

create table if not exists public.market_data_import_rows (
  id uuid primary key default gen_random_uuid(),
  batch_id uuid not null references public.market_data_import_batches (id) on delete cascade,
  row_number integer not null,
  identifier text,
  mapped_slug text,
  mapped_label text,
  import_date date,
  status text not null,
  duplicate_state text not null default 'none',
  warnings jsonb not null default '[]'::jsonb,
  errors jsonb not null default '[]'::jsonb,
  payload jsonb not null default '{}'::jsonb,
  result_note text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (batch_id, row_number)
);

alter table public.market_data_import_rows
  add column if not exists batch_id uuid references public.market_data_import_batches (id) on delete cascade,
  add column if not exists row_number integer,
  add column if not exists identifier text,
  add column if not exists mapped_slug text,
  add column if not exists mapped_label text,
  add column if not exists import_date date,
  add column if not exists status text,
  add column if not exists duplicate_state text,
  add column if not exists warnings jsonb,
  add column if not exists errors jsonb,
  add column if not exists payload jsonb,
  add column if not exists result_note text,
  add column if not exists created_at timestamptz,
  add column if not exists updated_at timestamptz;

update public.market_data_import_rows
set
  row_number = coalesce(row_number, 0),
  status = coalesce(nullif(status, ''), 'valid'),
  duplicate_state = coalesce(nullif(duplicate_state, ''), 'none'),
  warnings = coalesce(warnings, '[]'::jsonb),
  errors = coalesce(errors, '[]'::jsonb),
  payload = coalesce(payload, '{}'::jsonb),
  result_note = coalesce(result_note, ''),
  created_at = coalesce(created_at, now()),
  updated_at = coalesce(updated_at, created_at, now())
where
  row_number is null
  or status is null
  or duplicate_state is null
  or warnings is null
  or errors is null
  or payload is null
  or result_note is null
  or created_at is null
  or updated_at is null;

alter table public.market_data_import_rows
  alter column status set default 'valid',
  alter column duplicate_state set default 'none',
  alter column warnings set default '[]'::jsonb,
  alter column errors set default '[]'::jsonb,
  alter column payload set default '{}'::jsonb,
  alter column result_note set default '',
  alter column created_at set default now(),
  alter column updated_at set default now();

create unique index if not exists market_data_import_rows_batch_row_unique_idx
  on public.market_data_import_rows (batch_id, row_number);

create index if not exists market_data_import_rows_batch_idx
  on public.market_data_import_rows (batch_id, row_number);
