alter table if exists public.stock_data_freshness
  add column if not exists expected_trading_date date,
  add column if not exists evaluation_date date,
  add column if not exists reason_category text not null default 'fresh',
  add column if not exists market_session_state text;

alter table if exists public.stock_data_freshness
  drop constraint if exists stock_data_freshness_reason_category_check;

alter table if exists public.stock_data_freshness
  add constraint stock_data_freshness_reason_category_check
  check (
    reason_category in (
      'fresh',
      'stale_missing_price',
      'stale_missing_snapshot',
      'provider_lag',
      'market_not_closed',
      'holiday_or_weekend',
      'symbol_issue'
    )
  );

create index if not exists stock_data_freshness_reason_category_idx
  on public.stock_data_freshness (reason_category, checked_at desc);

create index if not exists stock_data_freshness_expected_trading_date_idx
  on public.stock_data_freshness (expected_trading_date desc);

comment on column public.stock_data_freshness.expected_trading_date is
  'The trading date the freshness validator expects for durable Yahoo chart coverage.';

comment on column public.stock_data_freshness.evaluation_date is
  'The calendar date in Asia/Kolkata when freshness validation was evaluated.';

comment on column public.stock_data_freshness.reason_category is
  'Freshness classification result: fresh, stale_missing_price, stale_missing_snapshot, provider_lag, market_not_closed, holiday_or_weekend, or symbol_issue.';

comment on column public.stock_data_freshness.market_session_state is
  'Indian market session state at evaluation time: pre_open, open, closed, or weekend.';
