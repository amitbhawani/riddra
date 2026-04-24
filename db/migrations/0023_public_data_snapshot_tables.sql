create table if not exists public.fund_factsheet_snapshots (
  id uuid primary key default gen_random_uuid(),
  fund_slug text not null,
  fund_name text not null,
  amc_name text not null,
  benchmark_label text,
  benchmark_index_slug text,
  aum text not null,
  expense_ratio text not null,
  fund_manager_name text not null,
  source_label text not null,
  source_date date not null,
  reference_url text,
  document_label text not null,
  created_at timestamptz not null default now()
);

create index if not exists fund_factsheet_snapshots_fund_slug_source_date_idx
  on public.fund_factsheet_snapshots (fund_slug, source_date desc);

create table if not exists public.stock_fundamental_snapshots (
  id uuid primary key default gen_random_uuid(),
  stock_slug text not null,
  company_name text not null,
  market_cap text not null,
  pe_ratio text not null,
  pb_ratio text not null,
  roe text not null,
  roce text not null,
  dividend_yield text,
  source_label text not null,
  source_date date not null,
  reference_url text not null,
  created_at timestamptz not null default now()
);

create index if not exists stock_fundamental_snapshots_stock_slug_source_date_idx
  on public.stock_fundamental_snapshots (stock_slug, source_date desc);

create table if not exists public.stock_shareholding_snapshots (
  id uuid primary key default gen_random_uuid(),
  stock_slug text not null,
  company_name text not null,
  promoter_percent text not null,
  fii_percent text not null,
  dii_percent text not null,
  public_percent text not null,
  source_label text not null,
  source_date text not null,
  reference_url text not null,
  created_at timestamptz not null default now()
);

create index if not exists stock_shareholding_snapshots_stock_slug_source_date_idx
  on public.stock_shareholding_snapshots (stock_slug, created_at desc);
