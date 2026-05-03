alter table if exists public.stock_data_freshness
  drop constraint if exists stock_data_freshness_reason_category_check;

alter table if exists public.stock_data_freshness
  add constraint stock_data_freshness_reason_category_check
  check (
    reason_category in (
      'fresh',
      'stale_missing_price',
      'stale_missing_snapshot',
      'provider_no_data',
      'provider_lag',
      'market_not_closed',
      'holiday_or_weekend',
      'symbol_issue'
    )
  );

comment on column public.stock_data_freshness.reason_category is
  'Freshness classification result: fresh, stale_missing_price, stale_missing_snapshot, provider_no_data, provider_lag, market_not_closed, holiday_or_weekend, or symbol_issue.';
