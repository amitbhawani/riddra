create table if not exists public.stock_data_quality_summary (
  stock_id uuid primary key references public.stocks_master (id) on delete cascade,
  yahoo_symbol text,
  has_historical_prices boolean not null default false,
  historical_first_date date,
  historical_last_date date,
  historical_row_count integer not null default 0,
  has_latest_snapshot boolean not null default false,
  has_valuation_metrics boolean not null default false,
  has_financial_statements boolean not null default false,
  missing_module_count integer not null default 0,
  warning_count integer not null default 0,
  error_count integer not null default 0,
  overall_data_score integer not null default 0,
  last_import_at timestamptz,
  updated_at timestamptz not null default now(),
  score_model text not null default 'price_data_focused_v1',
  score_notes text
);

alter table public.stock_data_quality_summary
  add column if not exists yahoo_symbol text,
  add column if not exists has_historical_prices boolean not null default false,
  add column if not exists historical_first_date date,
  add column if not exists historical_last_date date,
  add column if not exists historical_row_count integer not null default 0,
  add column if not exists has_latest_snapshot boolean not null default false,
  add column if not exists has_valuation_metrics boolean not null default false,
  add column if not exists has_financial_statements boolean not null default false,
  add column if not exists missing_module_count integer not null default 0,
  add column if not exists warning_count integer not null default 0,
  add column if not exists error_count integer not null default 0,
  add column if not exists overall_data_score integer not null default 0,
  add column if not exists last_import_at timestamptz,
  add column if not exists updated_at timestamptz not null default now(),
  add column if not exists score_model text not null default 'price_data_focused_v1',
  add column if not exists score_notes text;

create index if not exists stock_data_quality_summary_yahoo_symbol_idx
  on public.stock_data_quality_summary (yahoo_symbol);

create index if not exists stock_data_quality_summary_score_idx
  on public.stock_data_quality_summary (overall_data_score desc);

create index if not exists stock_data_quality_summary_last_import_idx
  on public.stock_data_quality_summary (last_import_at desc);

create index if not exists stock_data_quality_summary_updated_at_idx
  on public.stock_data_quality_summary (updated_at desc);
