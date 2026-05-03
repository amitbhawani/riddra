create extension if not exists "pgcrypto";

insert into public.data_sources (
  code,
  domain,
  source_name,
  source_type,
  official_status,
  refresh_cadence,
  coverage_scope,
  license_note,
  fallback_behavior,
  notes,
  created_at
)
values (
  'yahoo_finance',
  'finance.yahoo.com',
  'Yahoo Finance',
  'market_data_api',
  'reference',
  'On demand or scheduled sync',
  'Stock profile, price history, quote snapshot, valuation, statements, holders, options, and news',
  'Subject to provider terms and endpoint availability.',
  'Use the shared source registry and durable import pipeline. Do not scrape HTML.',
  'Seeded by the Yahoo Finance schema foundation migration.',
  now()
)
on conflict (code) do update
set
  domain = excluded.domain,
  source_name = excluded.source_name,
  source_type = excluded.source_type,
  official_status = excluded.official_status,
  refresh_cadence = excluded.refresh_cadence,
  coverage_scope = excluded.coverage_scope,
  license_note = excluded.license_note,
  fallback_behavior = excluded.fallback_behavior,
  notes = excluded.notes;

create table if not exists public.stocks_master (
  id uuid primary key default gen_random_uuid(),
  instrument_id uuid unique references public.instruments (id) on delete set null,
  slug text not null unique,
  symbol text,
  company_name text not null,
  yahoo_symbol text,
  exchange text,
  quote_currency text not null default 'INR',
  market text,
  isin text,
  mic_code text,
  status text not null default 'active',
  primary_source_code text references public.data_sources (code),
  source_name text not null default 'catalog_backfill',
  source_url text,
  metadata jsonb not null default '{}'::jsonb,
  imported_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint stocks_master_status_check
    check (status in ('active', 'inactive', 'delisted', 'suspended'))
);

create index if not exists stocks_master_symbol_idx
  on public.stocks_master (symbol);

create unique index if not exists stocks_master_yahoo_symbol_unique_idx
  on public.stocks_master (yahoo_symbol)
  where yahoo_symbol is not null;

create index if not exists stocks_master_imported_at_idx
  on public.stocks_master (imported_at desc);

insert into public.stocks_master (
  instrument_id,
  slug,
  symbol,
  company_name,
  yahoo_symbol,
  exchange,
  quote_currency,
  market,
  status,
  primary_source_code,
  source_name,
  source_url,
  metadata,
  imported_at,
  created_at,
  updated_at
)
select
  i.id,
  i.slug,
  i.symbol,
  coalesce(c.legal_name, i.name),
  case
    when coalesce(i.symbol, '') = '' then null
    when upper(coalesce(i.exchange, '')) like '%BSE%' then upper(i.symbol) || '.BO'
    else upper(i.symbol) || '.NS'
  end,
  i.exchange,
  'INR',
  i.exchange,
  coalesce(i.status, 'active'),
  coalesce(i.primary_source_code, 'yahoo_finance'),
  'catalog_backfill',
  null,
  jsonb_strip_nulls(
    jsonb_build_object(
      'instrument_name', i.name,
      'sector', c.sector,
      'industry', c.industry,
      'description', c.description,
      'headquarters', c.headquarters
    )
  ),
  now(),
  i.created_at,
  i.updated_at
from public.instruments i
left join public.companies c on c.instrument_id = i.id
where lower(coalesce(i.instrument_type, '')) in ('stock', 'equity')
on conflict (slug) do update
set
  instrument_id = excluded.instrument_id,
  symbol = coalesce(excluded.symbol, public.stocks_master.symbol),
  company_name = excluded.company_name,
  yahoo_symbol = coalesce(excluded.yahoo_symbol, public.stocks_master.yahoo_symbol),
  exchange = coalesce(excluded.exchange, public.stocks_master.exchange),
  market = coalesce(excluded.market, public.stocks_master.market),
  status = excluded.status,
  primary_source_code = coalesce(excluded.primary_source_code, public.stocks_master.primary_source_code),
  metadata = public.stocks_master.metadata || excluded.metadata,
  updated_at = now();

create table if not exists public.raw_yahoo_imports (
  id uuid primary key default gen_random_uuid(),
  stock_id uuid references public.stocks_master (id) on delete set null,
  symbol text not null,
  yahoo_symbol text,
  source_type text not null default 'yahoo_finance',
  source_bucket text not null,
  module_name text,
  source_url text not null,
  request_url text,
  request_type text,
  request_method text not null default 'GET',
  request_context text,
  request_payload jsonb not null default '{}'::jsonb,
  response_status integer,
  response_headers jsonb not null default '{}'::jsonb,
  raw_payload jsonb not null default '{}'::jsonb,
  normalized_payload jsonb not null default '{}'::jsonb,
  payload_hash text,
  status text not null default 'completed',
  error_message text,
  trade_date date,
  fiscal_date date,
  source_recorded_at timestamptz,
  imported_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists raw_yahoo_imports_stock_id_idx
  on public.raw_yahoo_imports (stock_id);

create index if not exists raw_yahoo_imports_symbol_idx
  on public.raw_yahoo_imports (symbol);

create index if not exists raw_yahoo_imports_trade_date_idx
  on public.raw_yahoo_imports (trade_date desc);

create index if not exists raw_yahoo_imports_fiscal_date_idx
  on public.raw_yahoo_imports (fiscal_date desc);

create index if not exists raw_yahoo_imports_imported_at_idx
  on public.raw_yahoo_imports (imported_at desc);

create index if not exists raw_yahoo_imports_bucket_imported_at_idx
  on public.raw_yahoo_imports (source_bucket, imported_at desc);

create index if not exists raw_yahoo_imports_module_name_idx
  on public.raw_yahoo_imports (module_name);

create index if not exists raw_yahoo_imports_request_type_idx
  on public.raw_yahoo_imports (request_type);

create index if not exists raw_yahoo_imports_status_idx
  on public.raw_yahoo_imports (status);

create table if not exists public.stock_company_profile (
  id uuid primary key default gen_random_uuid(),
  stock_id uuid not null references public.stocks_master (id) on delete cascade,
  symbol text not null,
  profile_date date not null default current_date,
  company_name text not null,
  short_name text,
  long_name text,
  yahoo_symbol text,
  exchange text,
  quote_type text,
  sector text,
  industry text,
  website_url text,
  long_business_summary text,
  country text,
  state_region text,
  city text,
  address1 text,
  phone text,
  employee_count bigint,
  officers_json jsonb not null default '[]'::jsonb,
  raw_import_id uuid references public.raw_yahoo_imports (id) on delete set null,
  raw_payload jsonb not null default '{}'::jsonb,
  source_name text not null default 'yahoo_finance',
  source_url text,
  source_symbol text,
  source_recorded_at timestamptz,
  imported_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint stock_company_profile_unique
    unique (stock_id, profile_date, source_name)
);

create index if not exists stock_company_profile_stock_id_idx
  on public.stock_company_profile (stock_id);

create index if not exists stock_company_profile_symbol_idx
  on public.stock_company_profile (symbol);

create index if not exists stock_company_profile_imported_at_idx
  on public.stock_company_profile (imported_at desc);

create table if not exists public.stock_price_history (
  id uuid primary key default gen_random_uuid(),
  stock_id uuid not null references public.stocks_master (id) on delete cascade,
  symbol text not null,
  trade_date date not null,
  interval_type text not null default '1d',
  open numeric(20,6) not null,
  high numeric(20,6) not null,
  low numeric(20,6) not null,
  close numeric(20,6) not null,
  adj_close numeric(20,6),
  volume numeric(20,0),
  currency_code text not null default 'INR',
  raw_import_id uuid references public.raw_yahoo_imports (id) on delete set null,
  raw_payload jsonb not null default '{}'::jsonb,
  source_name text not null default 'yahoo_finance',
  source_url text,
  source_symbol text,
  source_recorded_at timestamptz,
  imported_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint stock_price_history_unique
    unique (stock_id, interval_type, trade_date, source_name)
);

create index if not exists stock_price_history_stock_trade_date_idx
  on public.stock_price_history (stock_id, trade_date desc);

create index if not exists stock_price_history_symbol_trade_date_idx
  on public.stock_price_history (symbol, trade_date desc);

create index if not exists stock_price_history_imported_at_idx
  on public.stock_price_history (imported_at desc);

create table if not exists public.stock_market_snapshot (
  id uuid primary key default gen_random_uuid(),
  stock_id uuid not null references public.stocks_master (id) on delete cascade,
  symbol text not null,
  trade_date date not null,
  snapshot_at timestamptz not null,
  currency_code text not null default 'INR',
  market_state text,
  price numeric(20,6) not null,
  previous_close numeric(20,6),
  open numeric(20,6),
  day_high numeric(20,6),
  day_low numeric(20,6),
  change_absolute numeric(20,6),
  change_percent numeric(12,6),
  volume numeric(20,0),
  market_cap numeric(24,2),
  raw_import_id uuid references public.raw_yahoo_imports (id) on delete set null,
  raw_payload jsonb not null default '{}'::jsonb,
  source_name text not null default 'yahoo_finance',
  source_url text,
  source_symbol text,
  source_recorded_at timestamptz,
  imported_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint stock_market_snapshot_unique
    unique (stock_id, snapshot_at, source_name)
);

create index if not exists stock_market_snapshot_stock_trade_date_idx
  on public.stock_market_snapshot (stock_id, trade_date desc);

create index if not exists stock_market_snapshot_symbol_trade_date_idx
  on public.stock_market_snapshot (symbol, trade_date desc);

create index if not exists stock_market_snapshot_imported_at_idx
  on public.stock_market_snapshot (imported_at desc);

create table if not exists public.stock_valuation_metrics (
  id uuid primary key default gen_random_uuid(),
  stock_id uuid not null references public.stocks_master (id) on delete cascade,
  symbol text not null,
  trade_date date not null,
  market_cap numeric(24,2),
  enterprise_value numeric(24,2),
  trailing_pe numeric(20,6),
  forward_pe numeric(20,6),
  peg_ratio numeric(20,6),
  price_to_book numeric(20,6),
  ev_to_revenue numeric(20,6),
  ev_to_ebitda numeric(20,6),
  trailing_eps numeric(20,6),
  forward_eps numeric(20,6),
  dividend_yield numeric(12,6),
  raw_import_id uuid references public.raw_yahoo_imports (id) on delete set null,
  raw_payload jsonb not null default '{}'::jsonb,
  source_name text not null default 'yahoo_finance',
  source_url text,
  source_symbol text,
  source_recorded_at timestamptz,
  imported_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint stock_valuation_metrics_unique
    unique (stock_id, trade_date, source_name)
);

create index if not exists stock_valuation_metrics_stock_trade_date_idx
  on public.stock_valuation_metrics (stock_id, trade_date desc);

create index if not exists stock_valuation_metrics_symbol_trade_date_idx
  on public.stock_valuation_metrics (symbol, trade_date desc);

create index if not exists stock_valuation_metrics_imported_at_idx
  on public.stock_valuation_metrics (imported_at desc);

create table if not exists public.stock_share_statistics (
  id uuid primary key default gen_random_uuid(),
  stock_id uuid not null references public.stocks_master (id) on delete cascade,
  symbol text not null,
  trade_date date not null,
  shares_outstanding numeric(24,2),
  float_shares numeric(24,2),
  implied_shares_outstanding numeric(24,2),
  shares_short numeric(24,2),
  shares_short_prior_month numeric(24,2),
  shares_short_ratio numeric(20,6),
  short_percent_float numeric(12,6),
  short_percent_shares_outstanding numeric(12,6),
  held_percent_insiders numeric(12,6),
  held_percent_institutions numeric(12,6),
  raw_import_id uuid references public.raw_yahoo_imports (id) on delete set null,
  raw_payload jsonb not null default '{}'::jsonb,
  source_name text not null default 'yahoo_finance',
  source_url text,
  source_symbol text,
  source_recorded_at timestamptz,
  imported_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint stock_share_statistics_unique
    unique (stock_id, trade_date, source_name)
);

create index if not exists stock_share_statistics_stock_trade_date_idx
  on public.stock_share_statistics (stock_id, trade_date desc);

create index if not exists stock_share_statistics_symbol_trade_date_idx
  on public.stock_share_statistics (symbol, trade_date desc);

create index if not exists stock_share_statistics_imported_at_idx
  on public.stock_share_statistics (imported_at desc);

create table if not exists public.stock_financial_highlights (
  id uuid primary key default gen_random_uuid(),
  stock_id uuid not null references public.stocks_master (id) on delete cascade,
  symbol text not null,
  fiscal_date date not null,
  period_type text not null default 'ttm',
  total_revenue numeric(24,2),
  gross_profit numeric(24,2),
  ebitda numeric(24,2),
  net_income_to_common numeric(24,2),
  diluted_eps numeric(20,6),
  operating_cash_flow numeric(24,2),
  free_cash_flow numeric(24,2),
  total_cash numeric(24,2),
  total_debt numeric(24,2),
  current_ratio numeric(20,6),
  book_value_per_share numeric(20,6),
  return_on_assets numeric(12,6),
  return_on_equity numeric(12,6),
  raw_import_id uuid references public.raw_yahoo_imports (id) on delete set null,
  raw_payload jsonb not null default '{}'::jsonb,
  source_name text not null default 'yahoo_finance',
  source_url text,
  source_symbol text,
  source_recorded_at timestamptz,
  imported_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint stock_financial_highlights_period_type_check
    check (period_type in ('annual', 'quarterly', 'ttm')),
  constraint stock_financial_highlights_unique
    unique (stock_id, fiscal_date, period_type, source_name)
);

create index if not exists stock_financial_highlights_stock_fiscal_date_idx
  on public.stock_financial_highlights (stock_id, fiscal_date desc);

create index if not exists stock_financial_highlights_symbol_fiscal_date_idx
  on public.stock_financial_highlights (symbol, fiscal_date desc);

create index if not exists stock_financial_highlights_imported_at_idx
  on public.stock_financial_highlights (imported_at desc);

create table if not exists public.stock_income_statement (
  id uuid primary key default gen_random_uuid(),
  stock_id uuid not null references public.stocks_master (id) on delete cascade,
  symbol text not null,
  fiscal_date date not null,
  period_type text not null default 'annual',
  currency_code text not null default 'INR',
  total_revenue numeric(24,2),
  cost_of_revenue numeric(24,2),
  gross_profit numeric(24,2),
  operating_expense numeric(24,2),
  operating_income numeric(24,2),
  interest_expense numeric(24,2),
  pretax_income numeric(24,2),
  income_tax_expense numeric(24,2),
  net_income numeric(24,2),
  net_income_common numeric(24,2),
  basic_eps numeric(20,6),
  diluted_eps numeric(20,6),
  ebitda numeric(24,2),
  raw_import_id uuid references public.raw_yahoo_imports (id) on delete set null,
  raw_payload jsonb not null default '{}'::jsonb,
  source_name text not null default 'yahoo_finance',
  source_url text,
  source_symbol text,
  source_recorded_at timestamptz,
  imported_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint stock_income_statement_period_type_check
    check (period_type in ('annual', 'quarterly', 'ttm')),
  constraint stock_income_statement_unique
    unique (stock_id, fiscal_date, period_type, source_name)
);

create index if not exists stock_income_statement_stock_fiscal_date_idx
  on public.stock_income_statement (stock_id, fiscal_date desc);

create index if not exists stock_income_statement_symbol_fiscal_date_idx
  on public.stock_income_statement (symbol, fiscal_date desc);

create index if not exists stock_income_statement_imported_at_idx
  on public.stock_income_statement (imported_at desc);

create table if not exists public.stock_balance_sheet (
  id uuid primary key default gen_random_uuid(),
  stock_id uuid not null references public.stocks_master (id) on delete cascade,
  symbol text not null,
  fiscal_date date not null,
  period_type text not null default 'annual',
  currency_code text not null default 'INR',
  total_assets numeric(24,2),
  total_liabilities numeric(24,2),
  stockholders_equity numeric(24,2),
  current_assets numeric(24,2),
  current_liabilities numeric(24,2),
  cash_and_equivalents numeric(24,2),
  inventory numeric(24,2),
  receivables numeric(24,2),
  payables numeric(24,2),
  short_term_debt numeric(24,2),
  long_term_debt numeric(24,2),
  net_debt numeric(24,2),
  raw_import_id uuid references public.raw_yahoo_imports (id) on delete set null,
  raw_payload jsonb not null default '{}'::jsonb,
  source_name text not null default 'yahoo_finance',
  source_url text,
  source_symbol text,
  source_recorded_at timestamptz,
  imported_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint stock_balance_sheet_period_type_check
    check (period_type in ('annual', 'quarterly', 'ttm')),
  constraint stock_balance_sheet_unique
    unique (stock_id, fiscal_date, period_type, source_name)
);

create index if not exists stock_balance_sheet_stock_fiscal_date_idx
  on public.stock_balance_sheet (stock_id, fiscal_date desc);

create index if not exists stock_balance_sheet_symbol_fiscal_date_idx
  on public.stock_balance_sheet (symbol, fiscal_date desc);

create index if not exists stock_balance_sheet_imported_at_idx
  on public.stock_balance_sheet (imported_at desc);

create table if not exists public.stock_cash_flow (
  id uuid primary key default gen_random_uuid(),
  stock_id uuid not null references public.stocks_master (id) on delete cascade,
  symbol text not null,
  fiscal_date date not null,
  period_type text not null default 'annual',
  currency_code text not null default 'INR',
  operating_cash_flow numeric(24,2),
  investing_cash_flow numeric(24,2),
  financing_cash_flow numeric(24,2),
  capital_expenditure numeric(24,2),
  free_cash_flow numeric(24,2),
  dividends_paid numeric(24,2),
  stock_based_compensation numeric(24,2),
  depreciation_amortization numeric(24,2),
  beginning_cash_position numeric(24,2),
  end_cash_position numeric(24,2),
  raw_import_id uuid references public.raw_yahoo_imports (id) on delete set null,
  raw_payload jsonb not null default '{}'::jsonb,
  source_name text not null default 'yahoo_finance',
  source_url text,
  source_symbol text,
  source_recorded_at timestamptz,
  imported_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint stock_cash_flow_period_type_check
    check (period_type in ('annual', 'quarterly', 'ttm')),
  constraint stock_cash_flow_unique
    unique (stock_id, fiscal_date, period_type, source_name)
);

create index if not exists stock_cash_flow_stock_fiscal_date_idx
  on public.stock_cash_flow (stock_id, fiscal_date desc);

create index if not exists stock_cash_flow_symbol_fiscal_date_idx
  on public.stock_cash_flow (symbol, fiscal_date desc);

create index if not exists stock_cash_flow_imported_at_idx
  on public.stock_cash_flow (imported_at desc);

create table if not exists public.stock_dividends (
  id uuid primary key default gen_random_uuid(),
  stock_id uuid not null references public.stocks_master (id) on delete cascade,
  symbol text not null,
  ex_dividend_date date not null,
  record_date date,
  payment_date date,
  declaration_date date,
  dividend_amount numeric(20,6) not null,
  currency_code text not null default 'INR',
  dividend_type text,
  frequency text,
  raw_import_id uuid references public.raw_yahoo_imports (id) on delete set null,
  raw_payload jsonb not null default '{}'::jsonb,
  source_name text not null default 'yahoo_finance',
  source_url text,
  source_symbol text,
  source_recorded_at timestamptz,
  imported_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint stock_dividends_unique
    unique (stock_id, ex_dividend_date, source_name, dividend_amount)
);

create index if not exists stock_dividends_stock_ex_date_idx
  on public.stock_dividends (stock_id, ex_dividend_date desc);

create index if not exists stock_dividends_symbol_ex_date_idx
  on public.stock_dividends (symbol, ex_dividend_date desc);

create index if not exists stock_dividends_imported_at_idx
  on public.stock_dividends (imported_at desc);

create table if not exists public.stock_splits (
  id uuid primary key default gen_random_uuid(),
  stock_id uuid not null references public.stocks_master (id) on delete cascade,
  symbol text not null,
  split_date date not null,
  numerator numeric(20,6),
  denominator numeric(20,6),
  split_ratio_text text,
  raw_import_id uuid references public.raw_yahoo_imports (id) on delete set null,
  raw_payload jsonb not null default '{}'::jsonb,
  source_name text not null default 'yahoo_finance',
  source_url text,
  source_symbol text,
  source_recorded_at timestamptz,
  imported_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint stock_splits_unique
    unique (stock_id, split_date, source_name)
);

create index if not exists stock_splits_stock_split_date_idx
  on public.stock_splits (stock_id, split_date desc);

create index if not exists stock_splits_symbol_split_date_idx
  on public.stock_splits (symbol, split_date desc);

create index if not exists stock_splits_imported_at_idx
  on public.stock_splits (imported_at desc);

create table if not exists public.stock_corporate_actions (
  id uuid primary key default gen_random_uuid(),
  stock_id uuid not null references public.stocks_master (id) on delete cascade,
  symbol text not null,
  action_date date not null,
  action_type text not null,
  title text not null,
  description text,
  reference_url text,
  event_payload jsonb not null default '{}'::jsonb,
  raw_import_id uuid references public.raw_yahoo_imports (id) on delete set null,
  raw_payload jsonb not null default '{}'::jsonb,
  source_name text not null default 'yahoo_finance',
  source_url text,
  source_symbol text,
  source_recorded_at timestamptz,
  imported_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint stock_corporate_actions_unique
    unique (stock_id, action_date, action_type, source_name)
);

create index if not exists stock_corporate_actions_stock_action_date_idx
  on public.stock_corporate_actions (stock_id, action_date desc);

create index if not exists stock_corporate_actions_symbol_action_date_idx
  on public.stock_corporate_actions (symbol, action_date desc);

create index if not exists stock_corporate_actions_imported_at_idx
  on public.stock_corporate_actions (imported_at desc);

create table if not exists public.stock_earnings_events (
  id uuid primary key default gen_random_uuid(),
  stock_id uuid not null references public.stocks_master (id) on delete cascade,
  symbol text not null,
  earnings_date date not null,
  earnings_timestamp timestamptz,
  fiscal_date date,
  period_type text not null default 'quarterly',
  period_label text not null default '',
  eps_estimate numeric(20,6),
  eps_actual numeric(20,6),
  eps_surprise numeric(20,6),
  eps_surprise_percent numeric(12,6),
  revenue_estimate numeric(24,2),
  revenue_actual numeric(24,2),
  call_time text,
  raw_import_id uuid references public.raw_yahoo_imports (id) on delete set null,
  raw_payload jsonb not null default '{}'::jsonb,
  source_name text not null default 'yahoo_finance',
  source_url text,
  source_symbol text,
  source_recorded_at timestamptz,
  imported_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint stock_earnings_events_period_type_check
    check (period_type in ('annual', 'quarterly', 'ttm')),
  constraint stock_earnings_events_unique
    unique (stock_id, earnings_date, period_type, period_label, source_name)
);

create index if not exists stock_earnings_events_stock_earnings_date_idx
  on public.stock_earnings_events (stock_id, earnings_date desc);

create index if not exists stock_earnings_events_symbol_earnings_date_idx
  on public.stock_earnings_events (symbol, earnings_date desc);

create index if not exists stock_earnings_events_fiscal_date_idx
  on public.stock_earnings_events (fiscal_date desc);

create index if not exists stock_earnings_events_imported_at_idx
  on public.stock_earnings_events (imported_at desc);

create table if not exists public.stock_earnings_trend (
  id uuid primary key default gen_random_uuid(),
  stock_id uuid not null references public.stocks_master (id) on delete cascade,
  symbol text not null,
  fiscal_date date not null,
  trend_horizon text not null,
  period_type text not null default 'quarterly',
  end_date date,
  avg_estimate numeric(20,6),
  low_estimate numeric(20,6),
  high_estimate numeric(20,6),
  year_ago_eps numeric(20,6),
  growth_estimate numeric(12,6),
  analyst_count integer,
  raw_import_id uuid references public.raw_yahoo_imports (id) on delete set null,
  raw_payload jsonb not null default '{}'::jsonb,
  source_name text not null default 'yahoo_finance',
  source_url text,
  source_symbol text,
  source_recorded_at timestamptz,
  imported_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint stock_earnings_trend_period_type_check
    check (period_type in ('annual', 'quarterly', 'ttm')),
  constraint stock_earnings_trend_unique
    unique (stock_id, fiscal_date, trend_horizon, source_name)
);

create index if not exists stock_earnings_trend_stock_fiscal_date_idx
  on public.stock_earnings_trend (stock_id, fiscal_date desc);

create index if not exists stock_earnings_trend_symbol_fiscal_date_idx
  on public.stock_earnings_trend (symbol, fiscal_date desc);

create index if not exists stock_earnings_trend_imported_at_idx
  on public.stock_earnings_trend (imported_at desc);

create table if not exists public.stock_analyst_ratings (
  id uuid primary key default gen_random_uuid(),
  stock_id uuid not null references public.stocks_master (id) on delete cascade,
  symbol text not null,
  rating_date date not null,
  recommendation_key text,
  recommendation_mean numeric(12,6),
  number_of_analysts integer,
  strong_buy_count integer,
  buy_count integer,
  hold_count integer,
  sell_count integer,
  strong_sell_count integer,
  target_mean_price numeric(20,6),
  target_high_price numeric(20,6),
  target_low_price numeric(20,6),
  target_median_price numeric(20,6),
  raw_import_id uuid references public.raw_yahoo_imports (id) on delete set null,
  raw_payload jsonb not null default '{}'::jsonb,
  source_name text not null default 'yahoo_finance',
  source_url text,
  source_symbol text,
  source_recorded_at timestamptz,
  imported_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint stock_analyst_ratings_unique
    unique (stock_id, rating_date, source_name)
);

create index if not exists stock_analyst_ratings_stock_rating_date_idx
  on public.stock_analyst_ratings (stock_id, rating_date desc);

create index if not exists stock_analyst_ratings_symbol_rating_date_idx
  on public.stock_analyst_ratings (symbol, rating_date desc);

create index if not exists stock_analyst_ratings_imported_at_idx
  on public.stock_analyst_ratings (imported_at desc);

create table if not exists public.stock_holders_summary (
  id uuid primary key default gen_random_uuid(),
  stock_id uuid not null references public.stocks_master (id) on delete cascade,
  symbol text not null,
  as_of_date date not null,
  insider_percent_held numeric(12,6),
  institution_percent_held numeric(12,6),
  mutual_fund_percent_held numeric(12,6),
  float_percent numeric(12,6),
  top_institutional_percent numeric(12,6),
  top_insider_percent numeric(12,6),
  raw_import_id uuid references public.raw_yahoo_imports (id) on delete set null,
  raw_payload jsonb not null default '{}'::jsonb,
  source_name text not null default 'yahoo_finance',
  source_url text,
  source_symbol text,
  source_recorded_at timestamptz,
  imported_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint stock_holders_summary_unique
    unique (stock_id, as_of_date, source_name)
);

create index if not exists stock_holders_summary_stock_as_of_date_idx
  on public.stock_holders_summary (stock_id, as_of_date desc);

create index if not exists stock_holders_summary_symbol_as_of_date_idx
  on public.stock_holders_summary (symbol, as_of_date desc);

create index if not exists stock_holders_summary_imported_at_idx
  on public.stock_holders_summary (imported_at desc);

create table if not exists public.stock_holders_detail (
  id uuid primary key default gen_random_uuid(),
  stock_id uuid not null references public.stocks_master (id) on delete cascade,
  symbol text not null,
  as_of_date date not null,
  holder_type text not null,
  holder_name text not null,
  holder_slug text,
  shares_held numeric(24,2),
  percent_out numeric(12,6),
  value_held numeric(24,2),
  report_date date,
  rank integer,
  change_percent numeric(12,6),
  change_absolute numeric(24,2),
  raw_import_id uuid references public.raw_yahoo_imports (id) on delete set null,
  raw_payload jsonb not null default '{}'::jsonb,
  source_name text not null default 'yahoo_finance',
  source_url text,
  source_symbol text,
  source_recorded_at timestamptz,
  imported_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint stock_holders_detail_type_check
    check (holder_type in ('major', 'institutional', 'insider', 'mutual_fund', 'other')),
  constraint stock_holders_detail_unique
    unique (stock_id, as_of_date, holder_type, holder_name, source_name)
);

create index if not exists stock_holders_detail_stock_as_of_date_idx
  on public.stock_holders_detail (stock_id, as_of_date desc);

create index if not exists stock_holders_detail_symbol_as_of_date_idx
  on public.stock_holders_detail (symbol, as_of_date desc);

create index if not exists stock_holders_detail_imported_at_idx
  on public.stock_holders_detail (imported_at desc);

create table if not exists public.stock_options_contracts (
  id uuid primary key default gen_random_uuid(),
  stock_id uuid not null references public.stocks_master (id) on delete cascade,
  symbol text not null,
  trade_date date not null,
  contract_symbol text not null,
  expiration_date date not null,
  option_type text not null,
  strike_price numeric(20,6) not null,
  last_trade_at timestamptz,
  bid numeric(20,6),
  ask numeric(20,6),
  last_price numeric(20,6),
  change_absolute numeric(20,6),
  change_percent numeric(12,6),
  volume numeric(20,0),
  open_interest numeric(20,0),
  implied_volatility numeric(12,6),
  in_the_money boolean,
  contract_size text,
  currency_code text not null default 'INR',
  raw_import_id uuid references public.raw_yahoo_imports (id) on delete set null,
  raw_payload jsonb not null default '{}'::jsonb,
  source_name text not null default 'yahoo_finance',
  source_url text,
  source_symbol text,
  source_recorded_at timestamptz,
  imported_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint stock_options_contracts_option_type_check
    check (option_type in ('call', 'put')),
  constraint stock_options_contracts_unique
    unique (contract_symbol, trade_date, source_name)
);

create index if not exists stock_options_contracts_stock_trade_date_idx
  on public.stock_options_contracts (stock_id, trade_date desc);

create index if not exists stock_options_contracts_symbol_trade_date_idx
  on public.stock_options_contracts (symbol, trade_date desc);

create index if not exists stock_options_contracts_imported_at_idx
  on public.stock_options_contracts (imported_at desc);

create table if not exists public.stock_news (
  id uuid primary key default gen_random_uuid(),
  stock_id uuid not null references public.stocks_master (id) on delete cascade,
  symbol text not null,
  external_news_id text,
  published_at timestamptz not null,
  title text not null,
  publisher text,
  provider_name text,
  link_url text,
  thumbnail_url text,
  summary text,
  sentiment_label text,
  related_symbols jsonb not null default '[]'::jsonb,
  raw_import_id uuid references public.raw_yahoo_imports (id) on delete set null,
  raw_payload jsonb not null default '{}'::jsonb,
  source_name text not null default 'yahoo_finance',
  source_url text,
  source_symbol text,
  source_recorded_at timestamptz,
  imported_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists stock_news_external_news_id_unique_idx
  on public.stock_news (stock_id, external_news_id)
  where external_news_id is not null;

create index if not exists stock_news_stock_published_at_idx
  on public.stock_news (stock_id, published_at desc);

create index if not exists stock_news_symbol_published_at_idx
  on public.stock_news (symbol, published_at desc);

create index if not exists stock_news_imported_at_idx
  on public.stock_news (imported_at desc);

create table if not exists public.stock_technical_indicators (
  id uuid primary key default gen_random_uuid(),
  stock_id uuid not null references public.stocks_master (id) on delete cascade,
  symbol text not null,
  trade_date date not null,
  timeframe text not null default '1D',
  sma_20 numeric(20,6),
  sma_50 numeric(20,6),
  sma_200 numeric(20,6),
  ema_20 numeric(20,6),
  ema_50 numeric(20,6),
  ema_200 numeric(20,6),
  rsi_14 numeric(12,6),
  macd_line numeric(20,6),
  macd_signal numeric(20,6),
  macd_histogram numeric(20,6),
  atr_14 numeric(20,6),
  volume_sma_20 numeric(20,6),
  bollinger_upper numeric(20,6),
  bollinger_middle numeric(20,6),
  bollinger_lower numeric(20,6),
  raw_payload jsonb not null default '{}'::jsonb,
  source_name text not null default 'riddra_calculated',
  source_url text,
  source_symbol text,
  source_recorded_at timestamptz,
  imported_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint stock_technical_indicators_unique
    unique (stock_id, timeframe, trade_date)
);

create index if not exists stock_technical_indicators_stock_trade_date_idx
  on public.stock_technical_indicators (stock_id, trade_date desc);

create index if not exists stock_technical_indicators_symbol_trade_date_idx
  on public.stock_technical_indicators (symbol, trade_date desc);

create index if not exists stock_technical_indicators_imported_at_idx
  on public.stock_technical_indicators (imported_at desc);

create table if not exists public.stock_performance_metrics (
  id uuid primary key default gen_random_uuid(),
  stock_id uuid not null references public.stocks_master (id) on delete cascade,
  symbol text not null,
  trade_date date not null,
  benchmark_symbol text,
  return_1d numeric(12,6),
  return_1w numeric(12,6),
  return_1m numeric(12,6),
  return_3m numeric(12,6),
  return_6m numeric(12,6),
  return_1y numeric(12,6),
  return_3y numeric(12,6),
  return_5y numeric(12,6),
  alpha_1y numeric(12,6),
  beta_1y numeric(12,6),
  volatility_1y numeric(12,6),
  drawdown_52w numeric(12,6),
  raw_payload jsonb not null default '{}'::jsonb,
  source_name text not null default 'riddra_calculated',
  source_url text,
  source_symbol text,
  source_recorded_at timestamptz,
  imported_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint stock_performance_metrics_unique
    unique (stock_id, trade_date)
);

create index if not exists stock_performance_metrics_stock_trade_date_idx
  on public.stock_performance_metrics (stock_id, trade_date desc);

create index if not exists stock_performance_metrics_symbol_trade_date_idx
  on public.stock_performance_metrics (symbol, trade_date desc);

create index if not exists stock_performance_metrics_imported_at_idx
  on public.stock_performance_metrics (imported_at desc);

create table if not exists public.stock_growth_metrics (
  id uuid primary key default gen_random_uuid(),
  stock_id uuid not null references public.stocks_master (id) on delete cascade,
  symbol text not null,
  fiscal_date date not null,
  revenue_growth_yoy numeric(12,6),
  revenue_cagr_3y numeric(12,6),
  net_income_growth_yoy numeric(12,6),
  eps_growth_yoy numeric(12,6),
  eps_cagr_3y numeric(12,6),
  ebitda_growth_yoy numeric(12,6),
  free_cash_flow_growth_yoy numeric(12,6),
  raw_payload jsonb not null default '{}'::jsonb,
  source_name text not null default 'riddra_calculated',
  source_url text,
  source_symbol text,
  source_recorded_at timestamptz,
  imported_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint stock_growth_metrics_unique
    unique (stock_id, fiscal_date)
);

create index if not exists stock_growth_metrics_stock_fiscal_date_idx
  on public.stock_growth_metrics (stock_id, fiscal_date desc);

create index if not exists stock_growth_metrics_symbol_fiscal_date_idx
  on public.stock_growth_metrics (symbol, fiscal_date desc);

create index if not exists stock_growth_metrics_imported_at_idx
  on public.stock_growth_metrics (imported_at desc);

create table if not exists public.stock_health_ratios (
  id uuid primary key default gen_random_uuid(),
  stock_id uuid not null references public.stocks_master (id) on delete cascade,
  symbol text not null,
  fiscal_date date not null,
  gross_margin numeric(12,6),
  operating_margin numeric(12,6),
  net_margin numeric(12,6),
  roe numeric(12,6),
  roa numeric(12,6),
  roce numeric(12,6),
  debt_to_equity numeric(12,6),
  current_ratio numeric(12,6),
  quick_ratio numeric(12,6),
  interest_coverage numeric(12,6),
  asset_turnover numeric(12,6),
  cash_conversion numeric(12,6),
  raw_payload jsonb not null default '{}'::jsonb,
  source_name text not null default 'riddra_calculated',
  source_url text,
  source_symbol text,
  source_recorded_at timestamptz,
  imported_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint stock_health_ratios_unique
    unique (stock_id, fiscal_date)
);

create index if not exists stock_health_ratios_stock_fiscal_date_idx
  on public.stock_health_ratios (stock_id, fiscal_date desc);

create index if not exists stock_health_ratios_symbol_fiscal_date_idx
  on public.stock_health_ratios (symbol, fiscal_date desc);

create index if not exists stock_health_ratios_imported_at_idx
  on public.stock_health_ratios (imported_at desc);

create table if not exists public.stock_riddra_scores (
  id uuid primary key default gen_random_uuid(),
  stock_id uuid not null references public.stocks_master (id) on delete cascade,
  symbol text not null,
  trade_date date not null,
  timeframe text not null default '1D',
  r_score numeric(12,6),
  quality_score numeric(12,6),
  valuation_score numeric(12,6),
  growth_score numeric(12,6),
  momentum_score numeric(12,6),
  ownership_score numeric(12,6),
  coverage_score numeric(12,6),
  confidence_score numeric(12,6),
  score_label text,
  rationale jsonb not null default '{}'::jsonb,
  raw_payload jsonb not null default '{}'::jsonb,
  source_name text not null default 'riddra_calculated',
  source_url text,
  source_symbol text,
  source_recorded_at timestamptz,
  imported_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint stock_riddra_scores_unique
    unique (stock_id, timeframe, trade_date)
);

create index if not exists stock_riddra_scores_stock_trade_date_idx
  on public.stock_riddra_scores (stock_id, trade_date desc);

create index if not exists stock_riddra_scores_symbol_trade_date_idx
  on public.stock_riddra_scores (symbol, trade_date desc);

create index if not exists stock_riddra_scores_imported_at_idx
  on public.stock_riddra_scores (imported_at desc);

create table if not exists public.stock_import_jobs (
  id uuid primary key default gen_random_uuid(),
  stock_id uuid references public.stocks_master (id) on delete set null,
  symbol text,
  source_type text not null default 'yahoo_finance',
  source_name text not null default 'yahoo_finance',
  source_url text,
  source_symbol text,
  job_kind text not null default 'incremental_sync',
  import_scope text,
  requested_by text,
  status text not null default 'queued',
  started_at timestamptz,
  completed_at timestamptz,
  total_items integer not null default 0,
  imported_items integer not null default 0,
  updated_items integer not null default 0,
  skipped_items integer not null default 0,
  failed_items integer not null default 0,
  warning_items integer not null default 0,
  metadata jsonb not null default '{}'::jsonb,
  raw_payload jsonb not null default '{}'::jsonb,
  imported_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint stock_import_jobs_status_check
    check (status in ('queued', 'running', 'completed', 'completed_with_errors', 'failed', 'cancelled'))
);

create index if not exists stock_import_jobs_symbol_idx
  on public.stock_import_jobs (symbol);

create index if not exists stock_import_jobs_stock_id_idx
  on public.stock_import_jobs (stock_id);

create index if not exists stock_import_jobs_source_symbol_idx
  on public.stock_import_jobs (source_symbol);

create index if not exists stock_import_jobs_imported_at_idx
  on public.stock_import_jobs (imported_at desc);

create index if not exists stock_import_jobs_status_started_idx
  on public.stock_import_jobs (status, started_at desc);

create table if not exists public.stock_import_job_items (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references public.stock_import_jobs (id) on delete cascade,
  stock_id uuid references public.stocks_master (id) on delete set null,
  symbol text,
  bucket_key text not null,
  item_key text not null,
  trade_date date,
  fiscal_date date,
  row_status text not null default 'pending',
  source_key text,
  target_key text,
  action_taken text,
  raw_row jsonb not null default '{}'::jsonb,
  normalized_row jsonb not null default '{}'::jsonb,
  raw_payload jsonb not null default '{}'::jsonb,
  imported_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint stock_import_job_items_status_check
    check (row_status in ('pending', 'validated', 'imported', 'updated', 'skipped', 'warning', 'failed')),
  constraint stock_import_job_items_unique
    unique (job_id, bucket_key, item_key)
);

create index if not exists stock_import_job_items_stock_id_idx
  on public.stock_import_job_items (stock_id);

create index if not exists stock_import_job_items_symbol_idx
  on public.stock_import_job_items (symbol);

create index if not exists stock_import_job_items_trade_date_idx
  on public.stock_import_job_items (trade_date desc);

create index if not exists stock_import_job_items_fiscal_date_idx
  on public.stock_import_job_items (fiscal_date desc);

create index if not exists stock_import_job_items_imported_at_idx
  on public.stock_import_job_items (imported_at desc);

create table if not exists public.stock_import_errors (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references public.stock_import_jobs (id) on delete cascade,
  job_item_id uuid references public.stock_import_job_items (id) on delete set null,
  stock_id uuid references public.stocks_master (id) on delete set null,
  symbol text,
  bucket_key text,
  error_stage text not null,
  error_code text,
  error_message text not null,
  trade_date date,
  fiscal_date date,
  raw_payload jsonb not null default '{}'::jsonb,
  context_json jsonb not null default '{}'::jsonb,
  imported_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists stock_import_errors_stock_id_idx
  on public.stock_import_errors (stock_id);

create index if not exists stock_import_errors_symbol_idx
  on public.stock_import_errors (symbol);

create index if not exists stock_import_errors_trade_date_idx
  on public.stock_import_errors (trade_date desc);

create index if not exists stock_import_errors_fiscal_date_idx
  on public.stock_import_errors (fiscal_date desc);

create index if not exists stock_import_errors_imported_at_idx
  on public.stock_import_errors (imported_at desc);

create table if not exists public.stock_import_coverage (
  id uuid primary key default gen_random_uuid(),
  stock_id uuid not null references public.stocks_master (id) on delete cascade,
  symbol text not null,
  bucket_key text not null,
  coverage_status text not null default 'missing',
  latest_trade_date date,
  latest_fiscal_date date,
  latest_imported_at timestamptz,
  rows_available integer,
  rows_imported integer,
  row_count integer not null default 0,
  warning_count integer not null default 0,
  error_count integer not null default 0,
  coverage_notes text,
  metadata jsonb not null default '{}'::jsonb,
  imported_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint stock_import_coverage_status_check
    check (coverage_status in ('missing', 'partial', 'current', 'stale', 'error')),
  constraint stock_import_coverage_unique
    unique (stock_id, bucket_key)
);

create index if not exists stock_import_coverage_stock_id_idx
  on public.stock_import_coverage (stock_id);

create index if not exists stock_import_coverage_symbol_idx
  on public.stock_import_coverage (symbol);

create index if not exists stock_import_coverage_trade_date_idx
  on public.stock_import_coverage (latest_trade_date desc);

create index if not exists stock_import_coverage_fiscal_date_idx
  on public.stock_import_coverage (latest_fiscal_date desc);

create index if not exists stock_import_coverage_imported_at_idx
  on public.stock_import_coverage (imported_at desc);
