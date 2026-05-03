create table if not exists public.stock_data_freshness (
  stock_id uuid primary key references public.stocks_master (id) on delete cascade,
  has_today_price boolean not null default false,
  has_today_snapshot boolean not null default false,
  last_price_date date,
  last_snapshot_date date,
  is_stale boolean not null default true,
  checked_at timestamptz not null default now()
);

comment on table public.stock_data_freshness is
  'Daily stock freshness validation summary for the Yahoo chart-only import lane. This table flags stocks missing today price or snapshot coverage.';

create index if not exists stock_data_freshness_is_stale_idx
  on public.stock_data_freshness (is_stale, checked_at desc);

create index if not exists stock_data_freshness_checked_at_idx
  on public.stock_data_freshness (checked_at desc);

create index if not exists stock_data_freshness_last_price_date_idx
  on public.stock_data_freshness (last_price_date desc);

create index if not exists stock_data_freshness_last_snapshot_date_idx
  on public.stock_data_freshness (last_snapshot_date desc);
