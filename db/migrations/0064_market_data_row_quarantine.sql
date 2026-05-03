create table if not exists public.market_data_row_quarantine (
  id uuid primary key default gen_random_uuid(),
  row_id uuid null,
  stock_id uuid null,
  yahoo_symbol text null,
  table_name text not null,
  row_date date null,
  reason text not null,
  evidence jsonb not null default '{}'::jsonb,
  status text not null default 'active',
  created_at timestamptz not null default now(),
  resolved_at timestamptz null,
  constraint market_data_row_quarantine_table_name_check
    check (table_name in ('stock_price_history', 'stock_market_snapshot')),
  constraint market_data_row_quarantine_status_check
    check (status in ('active', 'resolved'))
);

create index if not exists market_data_row_quarantine_table_status_created_idx
  on public.market_data_row_quarantine (table_name, status, created_at desc);

create index if not exists market_data_row_quarantine_stock_status_created_idx
  on public.market_data_row_quarantine (stock_id, status, created_at desc);

create index if not exists market_data_row_quarantine_table_row_date_idx
  on public.market_data_row_quarantine (table_name, row_date desc);

create unique index if not exists market_data_row_quarantine_active_row_id_idx
  on public.market_data_row_quarantine (table_name, row_id)
  where status = 'active' and row_id is not null;

create unique index if not exists market_data_row_quarantine_active_stock_date_idx
  on public.market_data_row_quarantine (table_name, stock_id, row_date)
  where status = 'active' and row_id is null and stock_id is not null and row_date is not null;

alter table if exists public.market_data_row_quarantine enable row level security;

revoke all on public.market_data_row_quarantine from anon;
revoke all on public.market_data_row_quarantine from authenticated;

comment on table public.market_data_row_quarantine is
  'Operational quarantine registry for suspicious market-data rows. Active rows are excluded from public chart and snapshot reads without deleting the underlying evidence.';
