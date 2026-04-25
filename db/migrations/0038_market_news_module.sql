create table if not exists public.market_news_sources (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null,
  source_type text not null,
  feed_url text null,
  api_url text null,
  homepage_url text null,
  reliability_score numeric(5,2) not null default 50,
  is_enabled boolean not null default true,
  fetch_interval_minutes integer not null default 30,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint market_news_sources_source_type_check
    check (source_type in ('rss', 'api', 'official', 'manual')),
  constraint market_news_sources_reliability_score_check
    check (reliability_score >= 0 and reliability_score <= 100),
  constraint market_news_sources_fetch_interval_minutes_check
    check (fetch_interval_minutes > 0)
);

create unique index if not exists market_news_sources_slug_idx
  on public.market_news_sources (slug);

create table if not exists public.market_news_raw_items (
  id uuid primary key default gen_random_uuid(),
  source_id uuid not null references public.market_news_sources(id) on delete cascade,
  source_name text not null,
  original_title text not null,
  original_excerpt text null,
  source_url text not null,
  canonical_url text null,
  source_published_at timestamptz null,
  fetched_at timestamptz not null default timezone('utc', now()),
  raw_payload jsonb not null default '{}'::jsonb,
  image_url text null,
  content_hash text not null,
  duplicate_group_id uuid null,
  status text not null default 'new',
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint market_news_raw_items_status_check
    check (status in ('new', 'duplicate', 'processed', 'rejected', 'failed'))
);

create index if not exists market_news_raw_items_content_hash_idx
  on public.market_news_raw_items (content_hash);

create index if not exists market_news_raw_items_source_url_idx
  on public.market_news_raw_items (source_url);

create index if not exists market_news_raw_items_source_fetch_idx
  on public.market_news_raw_items (source_id, fetched_at desc);

create table if not exists public.market_news_articles (
  id uuid primary key default gen_random_uuid(),
  raw_item_id uuid null references public.market_news_raw_items(id) on delete set null,
  slug text not null,
  original_title text not null,
  rewritten_title text null,
  short_summary text null,
  summary text null,
  source_name text not null,
  source_url text not null,
  source_published_at timestamptz null,
  fetched_at timestamptz null,
  published_at timestamptz null,
  status text not null default 'draft',
  category text null,
  impact_label text not null default 'neutral',
  sentiment text null,
  language text not null default 'en',
  image_url text null,
  fallback_image_url text null,
  image_alt_text text null,
  canonical_url text null,
  duplicate_group_id uuid null,
  seo_title text null,
  seo_description text null,
  keywords text[] not null default '{}'::text[],
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint market_news_articles_status_check
    check (status in ('draft', 'ready', 'published', 'rejected', 'duplicate', 'failed_rewrite')),
  constraint market_news_articles_impact_label_check
    check (impact_label in ('positive', 'negative', 'neutral', 'regulatory', 'results', 'ipo', 'macro', 'fund', 'corporate_action'))
);

create unique index if not exists market_news_articles_slug_idx
  on public.market_news_articles (slug);

create index if not exists market_news_articles_status_published_idx
  on public.market_news_articles (status, published_at desc);

create index if not exists market_news_articles_source_url_idx
  on public.market_news_articles (source_url);

create index if not exists market_news_articles_canonical_url_idx
  on public.market_news_articles (canonical_url);

create table if not exists public.market_news_article_entities (
  id uuid primary key default gen_random_uuid(),
  article_id uuid not null references public.market_news_articles(id) on delete cascade,
  entity_type text not null,
  entity_slug text not null,
  symbol text null,
  display_name text not null,
  sector_slug text null,
  relevance_score numeric(5,2) not null default 0,
  created_at timestamptz not null default timezone('utc', now()),
  constraint market_news_article_entities_type_check
    check (entity_type in ('stock', 'mutual_fund', 'etf', 'ipo', 'sector', 'index', 'market'))
);

create index if not exists market_news_article_entities_article_idx
  on public.market_news_article_entities (article_id);

create index if not exists market_news_article_entities_type_slug_idx
  on public.market_news_article_entities (entity_type, entity_slug);

create index if not exists market_news_article_entities_symbol_idx
  on public.market_news_article_entities (symbol);

create index if not exists market_news_article_entities_sector_slug_idx
  on public.market_news_article_entities (sector_slug);

create table if not exists public.market_news_article_images (
  id uuid primary key default gen_random_uuid(),
  article_id uuid null references public.market_news_articles(id) on delete cascade,
  raw_item_id uuid null references public.market_news_raw_items(id) on delete set null,
  source_image_url text null,
  local_image_url text null,
  fallback_image_url text null,
  image_alt_text text null,
  image_credit text null,
  image_status text not null default 'pending',
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint market_news_article_images_target_check
    check (article_id is not null or raw_item_id is not null)
);

create index if not exists market_news_article_images_article_idx
  on public.market_news_article_images (article_id);

create index if not exists market_news_article_images_raw_item_idx
  on public.market_news_article_images (raw_item_id);

create table if not exists public.market_news_ingestion_runs (
  id uuid primary key default gen_random_uuid(),
  source_id uuid not null references public.market_news_sources(id) on delete cascade,
  started_at timestamptz not null default timezone('utc', now()),
  finished_at timestamptz null,
  status text not null default 'running',
  fetched_count integer not null default 0,
  inserted_count integer not null default 0,
  duplicate_count integer not null default 0,
  failed_count integer not null default 0,
  error_message text null,
  created_at timestamptz not null default timezone('utc', now()),
  constraint market_news_ingestion_runs_counts_check
    check (
      fetched_count >= 0
      and inserted_count >= 0
      and duplicate_count >= 0
      and failed_count >= 0
    )
);

create index if not exists market_news_ingestion_runs_source_started_idx
  on public.market_news_ingestion_runs (source_id, started_at desc);

create table if not exists public.market_news_rewrite_logs (
  id uuid primary key default gen_random_uuid(),
  raw_item_id uuid not null references public.market_news_raw_items(id) on delete cascade,
  article_id uuid null references public.market_news_articles(id) on delete set null,
  model text null,
  status text not null default 'pending',
  input_tokens integer not null default 0,
  output_tokens integer not null default 0,
  error_message text null,
  created_at timestamptz not null default timezone('utc', now()),
  constraint market_news_rewrite_logs_tokens_check
    check (input_tokens >= 0 and output_tokens >= 0)
);

create index if not exists market_news_rewrite_logs_raw_item_created_idx
  on public.market_news_rewrite_logs (raw_item_id, created_at desc);

create table if not exists public.market_news_analytics_events (
  id uuid primary key default gen_random_uuid(),
  article_id uuid not null references public.market_news_articles(id) on delete cascade,
  event_type text not null,
  entity_type text null,
  entity_slug text null,
  referrer text null,
  created_at timestamptz not null default timezone('utc', now()),
  constraint market_news_analytics_events_entity_type_check
    check (
      entity_type is null
      or entity_type in ('stock', 'mutual_fund', 'etf', 'ipo', 'sector', 'index', 'market')
    )
);

create index if not exists market_news_analytics_events_article_event_idx
  on public.market_news_analytics_events (article_id, event_type);
