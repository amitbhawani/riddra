create table if not exists public.portfolios (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  name text not null default 'Primary Portfolio',
  portfolio_type text not null default 'self_directed',
  base_currency text not null default 'INR',
  broker_name text,
  import_source text not null default 'manual',
  status text not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists portfolios_user_lookup_idx
  on public.portfolios (user_id, created_at desc);

create table if not exists public.portfolio_holdings (
  id uuid primary key default gen_random_uuid(),
  portfolio_id uuid not null references public.portfolios (id) on delete cascade,
  instrument_id uuid references public.instruments (id) on delete set null,
  symbol text,
  asset_name text not null,
  asset_type text not null default 'equity',
  quantity numeric(18,4) not null default 0,
  average_cost numeric(18,4),
  current_price numeric(18,4),
  market_value numeric(18,4),
  unrealized_pnl numeric(18,4),
  weight_percent numeric(10,4),
  last_synced_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists portfolio_holdings_portfolio_lookup_idx
  on public.portfolio_holdings (portfolio_id, asset_name);

create table if not exists public.portfolio_import_runs (
  id uuid primary key default gen_random_uuid(),
  portfolio_id uuid not null references public.portfolios (id) on delete cascade,
  import_mode text not null default 'csv',
  source_label text,
  status text not null default 'queued',
  rows_received integer not null default 0,
  rows_matched integer not null default 0,
  rows_failed integer not null default 0,
  file_name text,
  error_message text,
  started_at timestamptz not null default now(),
  finished_at timestamptz
);

create index if not exists portfolio_import_runs_lookup_idx
  on public.portfolio_import_runs (portfolio_id, started_at desc);

create table if not exists public.broker_connections (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  broker_code text not null,
  broker_name text not null,
  connection_status text not null default 'planned',
  access_scope text,
  external_account_ref text,
  last_synced_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, broker_code)
);

alter table public.portfolios enable row level security;
alter table public.portfolio_holdings enable row level security;
alter table public.portfolio_import_runs enable row level security;
alter table public.broker_connections enable row level security;

create policy "portfolios_select_own"
on public.portfolios
for select
using (auth.uid() = user_id);

create policy "portfolio_holdings_select_own"
on public.portfolio_holdings
for select
using (
  exists (
    select 1
    from public.portfolios
    where public.portfolios.id = portfolio_holdings.portfolio_id
      and public.portfolios.user_id = auth.uid()
  )
);

create policy "portfolio_import_runs_select_own"
on public.portfolio_import_runs
for select
using (
  exists (
    select 1
    from public.portfolios
    where public.portfolios.id = portfolio_import_runs.portfolio_id
      and public.portfolios.user_id = auth.uid()
  )
);

create policy "broker_connections_select_own"
on public.broker_connections
for select
using (auth.uid() = user_id);
