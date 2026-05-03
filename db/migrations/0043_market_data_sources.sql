create table if not exists public.market_data_sources (
  id uuid primary key default gen_random_uuid(),
  source_type text not null,
  source_url text not null,
  asset_slug text,
  symbol text,
  scheme_code text,
  benchmark_slug text,
  timeframe text not null default '1D',
  last_synced_at timestamptz,
  last_synced_date date,
  sync_status text not null default 'active',
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.market_data_sources
  add column if not exists source_type text,
  add column if not exists source_url text,
  add column if not exists asset_slug text,
  add column if not exists symbol text,
  add column if not exists scheme_code text,
  add column if not exists benchmark_slug text,
  add column if not exists timeframe text not null default '1D',
  add column if not exists last_synced_at timestamptz,
  add column if not exists last_synced_date date,
  add column if not exists sync_status text not null default 'active',
  add column if not exists metadata jsonb not null default '{}'::jsonb,
  add column if not exists created_at timestamptz not null default now(),
  add column if not exists updated_at timestamptz not null default now();

update public.market_data_sources
set timeframe = coalesce(nullif(timeframe, ''), '1D'),
    sync_status = coalesce(nullif(sync_status, ''), 'active'),
    metadata = coalesce(metadata, '{}'::jsonb),
    updated_at = coalesce(updated_at, now())
where timeframe is null
   or timeframe = ''
   or sync_status is null
   or sync_status = ''
   or metadata is null
   or updated_at is null;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'market_data_sources_sync_status_check'
  ) then
    alter table public.market_data_sources
      add constraint market_data_sources_sync_status_check
      check (sync_status in ('active', 'paused', 'error'));
  end if;
end $$;

create index if not exists market_data_sources_status_idx
  on public.market_data_sources (sync_status, updated_at desc);

create unique index if not exists market_data_sources_identity_unique_idx
  on public.market_data_sources (
    source_type,
    source_url,
    timeframe,
    coalesce(asset_slug, ''),
    coalesce(symbol, ''),
    coalesce(scheme_code, ''),
    coalesce(benchmark_slug, '')
  );
