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

create index if not exists benchmark_ohlcv_history_lookup_idx
  on public.benchmark_ohlcv_history (index_slug, date desc);
