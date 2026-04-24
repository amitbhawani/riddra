create table if not exists public.chart_symbol_registry_overrides (
  id uuid primary key default gen_random_uuid(),
  asset_kind text not null,
  asset_slug text not null,
  tv_symbol text not null,
  display_name text,
  exchange text,
  listed_exchange text,
  session text not null default '0915-1530',
  timezone text not null default 'Asia/Kolkata',
  minmov integer not null default 1,
  pricescale integer not null default 100,
  volume_precision integer not null default 0,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (asset_kind, asset_slug),
  unique (tv_symbol)
);

create index if not exists chart_symbol_registry_overrides_kind_slug_idx
  on public.chart_symbol_registry_overrides (asset_kind, asset_slug);

create or replace view public.tradingview_daily_symbol_registry as
select
  coalesce(overrides.tv_symbol, concat(coalesce(nullif(i.exchange, ''), 'NSE'), ':', coalesce(nullif(i.symbol, ''), upper(replace(i.slug, '-', ''))))) as tv_symbol,
  'stock'::text as asset_kind,
  i.slug as asset_slug,
  coalesce(nullif(i.symbol, ''), upper(replace(i.slug, '-', ''))) as native_symbol,
  coalesce(overrides.display_name, i.name) as display_name,
  coalesce(nullif(overrides.exchange, ''), nullif(i.exchange, ''), 'NSE') as exchange,
  coalesce(nullif(overrides.listed_exchange, ''), nullif(i.exchange, ''), 'NSE') as listed_exchange,
  coalesce(i.primary_source_code, status.source_code) as source_code,
  coalesce(nullif(overrides.session, ''), '0915-1530') as session,
  coalesce(nullif(overrides.timezone, ''), 'Asia/Kolkata') as timezone,
  coalesce(overrides.minmov, 1) as minmov,
  coalesce(overrides.pricescale, 100) as pricescale,
  coalesce(overrides.volume_precision, 0) as volume_precision,
  array['1D']::text[] as supported_resolutions,
  i.status as lifecycle_state,
  status.source_label,
  status.latest_point_at,
  status.records_retained,
  jsonb_build_object(
    'seriesType', status.series_type,
    'timeframe', status.timeframe,
    'ingestMode', status.ingest_mode,
    'overrideMetadata', coalesce(overrides.metadata, '{}'::jsonb)
  ) as metadata
from public.instruments i
join public.market_series_status status
  on status.asset_slug = i.slug
 and status.series_type = 'stock_ohlcv'
 and status.timeframe = '1D'
 and status.refresh_status = 'live'
 and status.records_retained > 1
left join public.chart_symbol_registry_overrides overrides
  on overrides.asset_kind = 'stock'
 and overrides.asset_slug = i.slug
where i.instrument_type = 'stock'
  and i.status = 'active';
