-- Public-page performance indexes for stock, fund, IPO, index, and market-news reads.
--
-- Important:
-- - This migration intentionally does not use CREATE INDEX CONCURRENTLY.
-- - Supabase migration files are typically executed inside a transaction, and
--   Postgres does not allow CONCURRENTLY inside a transaction block.
-- - If zero-lock index creation is required later, run the same CREATE INDEX
--   statements manually in Supabase SQL Editor outside a wrapping transaction.
-- - This migration is safe for partial schemas: every index is guarded with
--   to_regclass(...) so no table is assumed to exist.

-- ---------------------------------------------------------------------------
-- Stock detail / native chart public reads
-- ---------------------------------------------------------------------------
-- Speeds latest company profile lookup:
--   where stock_id = ? order by profile_date desc, imported_at desc limit 1
do $$
begin
  if to_regclass('public.stock_company_profile') is not null then
    execute '
      create index if not exists stock_company_profile_stock_profile_imported_idx
        on public.stock_company_profile (stock_id, profile_date desc, imported_at desc)
    ';
  end if;
end $$;

-- Speeds latest snapshot lookup on stock pages:
--   where stock_id = ? order by trade_date desc, snapshot_at desc limit 1
do $$
begin
  if to_regclass('public.stock_market_snapshot') is not null then
    execute '
      create index if not exists stock_market_snapshot_stock_trade_snapshot_idx
        on public.stock_market_snapshot (stock_id, trade_date desc, snapshot_at desc)
    ';
  end if;
end $$;

-- Helps native chart reads which always filter by stock_id + interval_type and
-- then order/range on trade_date.
do $$
begin
  if to_regclass('public.stock_price_history') is not null then
    execute '
      create index if not exists stock_price_history_stock_interval_trade_date_idx
        on public.stock_price_history (stock_id, interval_type, trade_date desc)
    ';
  end if;
end $$;

-- ---------------------------------------------------------------------------
-- Market news public listing/detail/entity hydration
-- ---------------------------------------------------------------------------
-- Public market-news listing filters by status and often also category or
-- impact_label, then sorts by recency. Using a single recency expression keeps
-- the planner closer to the app's fallback ordering logic.
do $$
begin
  if to_regclass('public.market_news_articles') is not null then
    execute '
      create index if not exists market_news_articles_public_status_recency_idx
        on public.market_news_articles (
          status,
          (coalesce(published_at, source_published_at, created_at)) desc
        )
        where status in (''ready'', ''published'')
    ';

    execute '
      create index if not exists market_news_articles_public_status_category_recency_idx
        on public.market_news_articles (
          status,
          category,
          (coalesce(published_at, source_published_at, created_at)) desc
        )
        where status in (''ready'', ''published'')
    ';

    execute '
      create index if not exists market_news_articles_public_status_impact_recency_idx
        on public.market_news_articles (
          status,
          impact_label,
          (coalesce(published_at, source_published_at, created_at)) desc
        )
        where status in (''ready'', ''published'')
    ';
  end if;
end $$;

-- Supports article detail hydration where public reads fetch all entities for a
-- set of article ids and sort by relevance_score, created_at.
do $$
begin
  if to_regclass('public.market_news_article_entities') is not null then
    execute '
      create index if not exists market_news_article_entities_article_relevance_created_idx
        on public.market_news_article_entities (article_id, relevance_score desc, created_at asc)
    ';

    -- Supports stock fallback matching by symbol, while preserving entity_type
    -- selectivity.
    execute '
      create index if not exists market_news_article_entities_type_symbol_idx
        on public.market_news_article_entities (entity_type, symbol)
    ';

    -- Supports sector fallback matching by sector_slug with entity_type kept first.
    execute '
      create index if not exists market_news_article_entities_type_sector_slug_idx
        on public.market_news_article_entities (entity_type, sector_slug)
    ';
  end if;
end $$;

-- Speeds article image hydration for a set of article ids ordered by created_at.
do $$
begin
  if to_regclass('public.market_news_article_images') is not null then
    execute '
      create index if not exists market_news_article_images_article_created_idx
        on public.market_news_article_images (article_id, created_at asc)
    ';
  end if;
end $$;

-- Speeds source reliability hydration during public article rendering:
--   where name in (...)
do $$
begin
  if to_regclass('public.market_news_sources') is not null then
    execute '
      create index if not exists market_news_sources_name_idx
        on public.market_news_sources (name)
    ';
  end if;
end $$;

-- ---------------------------------------------------------------------------
-- Index public page roster reads
-- ---------------------------------------------------------------------------
-- Existing indexes already cover:
-- - tracked_indexes.slug (unique)
-- - index_tracker_snapshots (tracked_index_id, snapshot_at desc)
-- - index_component_snapshots (index_snapshot_id, contribution desc)
--
-- This additional index helps active roster selection, where the app filters on:
--   tracked_index_id in (...)
--   effective_from <= today
-- and then applies active-window logic with effective_to.
do $$
begin
  if to_regclass('public.index_component_weights') is not null then
    execute '
      create index if not exists index_component_weights_tracked_effective_window_idx
        on public.index_component_weights (tracked_index_id, effective_from desc, effective_to)
    ';
  end if;
end $$;
