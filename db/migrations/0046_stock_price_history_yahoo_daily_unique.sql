create unique index if not exists stock_price_history_yahoo_daily_stock_trade_date_unique_idx
  on public.stock_price_history (stock_id, trade_date)
  where interval_type = '1d' and source_name = 'yahoo_finance';
