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
  notes
)
values
  (
    'nse_equities',
    'stocks',
    'National Stock Exchange of India',
    'exchange',
    'official',
    'near realtime subject to approved access',
    'NSE listed equities, indices, derivatives references',
    'Use only compliant and commercially permitted access patterns.',
    'Fallback to delayed pages and cached snapshots.',
    'Preferred primary source for Indian market pages where permitted.'
  ),
  (
    'bse_equities',
    'stocks',
    'BSE India',
    'exchange',
    'official',
    'near realtime subject to approved access',
    'BSE listed securities and disclosures',
    'Confirm licensing before commercial realtime usage.',
    'Fallback to delayed data or official filings.',
    'Useful for alternate exchange coverage and cross-verification.'
  ),
  (
    'sebi_filings',
    'ipo',
    'SEBI',
    'regulator',
    'official',
    'event driven',
    'DRHP, RHP, issue documents and regulatory updates',
    'Use official issue documents as source-of-truth references.',
    'Fallback to issuer prospectus page.',
    'Primary source for IPO document authenticity.'
  ),
  (
    'amfi_nav',
    'mutual_funds',
    'Association of Mutual Funds in India',
    'industry body',
    'official',
    'daily',
    'NAV and mutual fund reference data',
    'Use AMFI distributed data within its permitted usage terms.',
    'Fallback to AMC official pages.',
    'Preferred base source for mutual fund daily NAV data.'
  ),
  (
    'issuer_ir',
    'filings',
    'Company Investor Relations',
    'issuer',
    'official',
    'event driven',
    'Company presentations, annual reports and announcements',
    'Use company-published documents as primary filing references.',
    'Fallback to exchange disclosure pages.',
    'Supports detailed company profile and filing sections.'
  ),
  (
    'nse_index',
    'indexes',
    'NSE Index Data',
    'exchange',
    'official',
    'near realtime subject to approved access',
    'Nifty 50 and related official index datasets',
    'Confirm commercial rights and refresh permissions before production realtime rollout.',
    'Fallback to delayed snapshot and previous session data.',
    'Preferred source for Nifty 50 index intelligence.'
  ),
  (
    'nse_bank_index',
    'indexes',
    'NSE Bank Index Data',
    'exchange',
    'official',
    'near realtime subject to approved access',
    'Bank Nifty and related official index datasets',
    'Confirm commercial rights and refresh permissions before production realtime rollout.',
    'Fallback to delayed snapshot and previous session data.',
    'Preferred source for Bank Nifty intelligence.'
  ),
  (
    'bse_sensex',
    'indexes',
    'BSE Sensex Data',
    'exchange',
    'official',
    'near realtime subject to approved access',
    'Sensex and related official BSE index datasets',
    'Confirm commercial rights and refresh permissions before production realtime rollout.',
    'Fallback to delayed snapshot and previous session data.',
    'Preferred source for Sensex intelligence.'
  ),
  (
    'nse_financial_services_index',
    'indexes',
    'NSE Financial Services Index Data',
    'exchange',
    'official',
    'near realtime subject to approved access',
    'Fin Nifty and related financial services index datasets',
    'Confirm commercial rights and refresh permissions before production realtime rollout.',
    'Fallback to delayed snapshot and previous session data.',
    'Preferred source for Fin Nifty intelligence.'
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

with inserted_instruments as (
  insert into public.instruments (slug, symbol, name, instrument_type, exchange, primary_source_code)
  values
    ('tata-motors', 'TMCV', 'Tata Motors', 'stock', 'NSE', 'nse_equities'),
    ('reliance-industries', 'RELIANCE', 'Reliance Industries', 'stock', 'NSE', 'nse_equities')
  on conflict (slug) do update
  set
    symbol = excluded.symbol,
    name = excluded.name,
    instrument_type = excluded.instrument_type,
    exchange = excluded.exchange,
    primary_source_code = excluded.primary_source_code
  returning id, slug, name
)
insert into public.companies (instrument_id, legal_name, sector, industry, description, headquarters)
select
  inserted_instruments.id,
  inserted_instruments.name,
  case when inserted_instruments.slug = 'tata-motors' then 'Auto' else 'Conglomerate' end,
  case when inserted_instruments.slug = 'tata-motors' then 'Automobiles' else 'Energy and Diversified' end,
  case when inserted_instruments.slug = 'tata-motors' then 'Starter stock profile record for Riddra.' else 'Starter conglomerate profile record for Riddra.' end,
  case when inserted_instruments.slug = 'tata-motors' then 'Mumbai' else 'Mumbai' end
from inserted_instruments
on conflict (instrument_id) do nothing;

insert into public.ipos (slug, company_name, ipo_type, status, primary_source_code, price_band)
values
  ('hero-fincorp', 'Hero Fincorp', 'mainboard', 'upcoming', 'sebi_filings', 'Pending'),
  ('nse', 'NSE', 'mainboard', 'upcoming', 'sebi_filings', 'Pending')
on conflict (slug) do update
set
  company_name = excluded.company_name,
  ipo_type = excluded.ipo_type,
  status = excluded.status,
  primary_source_code = excluded.primary_source_code,
  price_band = excluded.price_band;

insert into public.mutual_funds (slug, fund_name, category, amc_name, plan_type, option_type, benchmark, primary_source_code)
values
  ('hdfc-mid-cap-opportunities', 'HDFC Mid-Cap Opportunities Fund', 'Mid Cap Fund', 'HDFC Mutual Fund', 'Direct', 'Growth', 'NIFTY Midcap 150 TRI', 'amfi_nav'),
  ('sbi-bluechip-fund', 'SBI Bluechip Fund', 'Large Cap Fund', 'SBI Mutual Fund', 'Direct', 'Growth', 'NIFTY 100 TRI', 'amfi_nav')
on conflict (slug) do update
set
  fund_name = excluded.fund_name,
  category = excluded.category,
  amc_name = excluded.amc_name,
  plan_type = excluded.plan_type,
  option_type = excluded.option_type,
  benchmark = excluded.benchmark,
  primary_source_code = excluded.primary_source_code;
