alter table if exists public.stock_market_snapshot
  alter column price drop not null;
