create table if not exists public.stock_import_activity_log (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references public.stock_import_jobs (id) on delete cascade,
  job_item_id uuid references public.stock_import_job_items (id) on delete set null,
  stock_id uuid references public.stocks_master (id) on delete set null,
  yahoo_symbol text,
  module_name text not null,
  step_name text not null,
  status text not null default 'completed',
  message text,
  rows_fetched integer not null default 0,
  rows_inserted integer not null default 0,
  rows_updated integer not null default 0,
  rows_skipped integer not null default 0,
  mapped_fields_count integer not null default 0,
  missing_fields_count integer not null default 0,
  fill_percentage numeric(12,2),
  affected_table text,
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  error_message text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint stock_import_activity_log_step_name_check
    check (
      step_name in (
        'fetch_started',
        'fetch_completed',
        'raw_saved',
        'normalization_started',
        'normalization_completed',
        'coverage_updated',
        'reconciliation_completed',
        'import_failed'
      )
    ),
  constraint stock_import_activity_log_status_check
    check (status in ('running', 'completed', 'warning', 'failed'))
);

create index if not exists stock_import_activity_log_job_id_idx
  on public.stock_import_activity_log (job_id);

create index if not exists stock_import_activity_log_job_item_id_idx
  on public.stock_import_activity_log (job_item_id);

create index if not exists stock_import_activity_log_stock_id_idx
  on public.stock_import_activity_log (stock_id);

create index if not exists stock_import_activity_log_yahoo_symbol_idx
  on public.stock_import_activity_log (yahoo_symbol);

create index if not exists stock_import_activity_log_module_name_idx
  on public.stock_import_activity_log (module_name);

create index if not exists stock_import_activity_log_status_started_idx
  on public.stock_import_activity_log (status, started_at desc);

create index if not exists stock_import_activity_log_completed_at_idx
  on public.stock_import_activity_log (completed_at desc);

create table if not exists public.stock_import_reconciliation (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references public.stock_import_jobs (id) on delete cascade,
  stock_id uuid not null references public.stocks_master (id) on delete cascade,
  yahoo_symbol text,
  module_name text not null,
  raw_import_id uuid references public.raw_yahoo_imports (id) on delete set null,
  target_table text not null,
  raw_records_count integer not null default 0,
  normalized_records_count integer not null default 0,
  unmapped_records_count integer not null default 0,
  missing_required_fields jsonb not null default '[]'::jsonb,
  missing_optional_fields jsonb not null default '[]'::jsonb,
  reconciliation_status text not null default 'completed',
  reconciliation_notes text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint stock_import_reconciliation_status_check
    check (
      reconciliation_status in (
        'completed',
        'completed_with_warnings',
        'failed',
        'no_data'
      )
    ),
  constraint stock_import_reconciliation_unique
    unique (job_id, stock_id, module_name, target_table)
);

create index if not exists stock_import_reconciliation_job_id_idx
  on public.stock_import_reconciliation (job_id);

create index if not exists stock_import_reconciliation_stock_id_idx
  on public.stock_import_reconciliation (stock_id);

create index if not exists stock_import_reconciliation_yahoo_symbol_idx
  on public.stock_import_reconciliation (yahoo_symbol);

create index if not exists stock_import_reconciliation_module_name_idx
  on public.stock_import_reconciliation (module_name);

create index if not exists stock_import_reconciliation_raw_import_id_idx
  on public.stock_import_reconciliation (raw_import_id);

create index if not exists stock_import_reconciliation_status_created_idx
  on public.stock_import_reconciliation (reconciliation_status, created_at desc);
