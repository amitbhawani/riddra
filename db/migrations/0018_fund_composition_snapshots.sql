create table if not exists public.fund_holding_snapshots (
  id uuid primary key default gen_random_uuid(),
  fund_slug text not null,
  source_label text not null,
  source_date date not null,
  reference_url text,
  payload_json jsonb not null,
  created_at timestamptz not null default now()
);

create index if not exists fund_holding_snapshots_fund_slug_source_date_idx
on public.fund_holding_snapshots (fund_slug, source_date desc);

create table if not exists public.fund_sector_allocation_snapshots (
  id uuid primary key default gen_random_uuid(),
  fund_slug text not null,
  source_label text not null,
  source_date date not null,
  reference_url text,
  payload_json jsonb not null,
  created_at timestamptz not null default now()
);

create index if not exists fund_sector_allocation_snapshots_fund_slug_source_date_idx
on public.fund_sector_allocation_snapshots (fund_slug, source_date desc);
