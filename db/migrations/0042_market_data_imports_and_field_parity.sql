create table if not exists public.benchmark_ohlcv_history (
  id uuid primary key default gen_random_uuid(),
  index_slug text not null,
  date date not null,
  open numeric not null,
  high numeric not null,
  low numeric not null,
  close numeric not null,
  volume numeric,
  created_at timestamptz not null default now()
);

alter table public.benchmark_ohlcv_history
  add column if not exists source_label text not null default '',
  add column if not exists source_code text,
  add column if not exists refresh_run_id uuid references public.market_refresh_runs (id) on delete set null,
  add column if not exists payload jsonb not null default '{}'::jsonb,
  add column if not exists updated_at timestamptz not null default now();

create index if not exists benchmark_ohlcv_history_lookup_idx
  on public.benchmark_ohlcv_history (index_slug, date desc);

create unique index if not exists benchmark_ohlcv_history_unique_idx
  on public.benchmark_ohlcv_history (index_slug, date, source_label);

create table if not exists public.market_data_import_batches (
  id uuid primary key default gen_random_uuid(),
  data_type text not null,
  execution_mode text not null,
  duplicate_mode text not null,
  status text not null,
  source_type text not null default 'manual_csv',
  source_label text,
  source_url text,
  file_name text not null,
  actor_user_id text,
  actor_email text not null,
  imported_by text not null default '',
  imported_at timestamptz not null default now(),
  row_count integer not null default 0,
  valid_rows integer not null default 0,
  warning_rows integer not null default 0,
  failed_rows integer not null default 0,
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
  add column if not exists execution_mode text,
  add column if not exists duplicate_mode text,
  add column if not exists status text,
  add column if not exists source_type text not null default 'manual_csv',
  add column if not exists source_label text,
  add column if not exists source_url text,
  add column if not exists file_name text,
  add column if not exists actor_user_id text,
  add column if not exists actor_email text,
  add column if not exists imported_by text not null default '',
  add column if not exists imported_at timestamptz not null default now(),
  add column if not exists row_count integer not null default 0,
  add column if not exists valid_rows integer not null default 0,
  add column if not exists warning_rows integer not null default 0,
  add column if not exists failed_rows integer not null default 0,
  add column if not exists duplicate_rows integer not null default 0,
  add column if not exists success_count integer not null default 0,
  add column if not exists failure_count integer not null default 0,
  add column if not exists skipped_count integer not null default 0,
  add column if not exists summary text not null default '',
  add column if not exists metadata jsonb not null default '{}'::jsonb,
  add column if not exists created_at timestamptz not null default now(),
  add column if not exists updated_at timestamptz not null default now();

create index if not exists market_data_import_batches_lookup_idx
  on public.market_data_import_batches (data_type, imported_at desc);

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
  add column if not exists duplicate_state text not null default 'none',
  add column if not exists warnings jsonb not null default '[]'::jsonb,
  add column if not exists errors jsonb not null default '[]'::jsonb,
  add column if not exists payload jsonb not null default '{}'::jsonb,
  add column if not exists result_note text not null default '',
  add column if not exists created_at timestamptz not null default now(),
  add column if not exists updated_at timestamptz not null default now();

create unique index if not exists market_data_import_rows_batch_row_unique_idx
  on public.market_data_import_rows (batch_id, row_number);

create index if not exists market_data_import_rows_batch_idx
  on public.market_data_import_rows (batch_id, row_number);
