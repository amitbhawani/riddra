alter table public.market_news_sources
  add column if not exists category text,
  add column if not exists region text,
  add column if not exists last_checked_at timestamptz,
  add column if not exists last_status text,
  add column if not exists last_error text,
  add column if not exists detected_feed_url text,
  add column if not exists notes text;

alter table public.market_news_sources
  drop constraint if exists market_news_sources_source_type_check;

alter table public.market_news_sources
  add constraint market_news_sources_source_type_check
  check (source_type in ('rss', 'api', 'official', 'manual', 'candidate', 'blocked'));

create index if not exists market_news_sources_enabled_type_idx
  on public.market_news_sources (is_enabled, source_type);

create index if not exists market_news_sources_category_region_idx
  on public.market_news_sources (category, region);
