alter table if exists public.market_news_articles
  add column if not exists impact_note text,
  add column if not exists author_name text,
  add column if not exists author_slug text;
