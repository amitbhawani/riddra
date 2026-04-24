insert into asset_registry (id, asset_kind, canonical_slug, canonical_name, exchange_code, lifecycle_state, metadata)
values
  (
    '70000000-0000-0000-0000-000000000001',
    'stock',
    'tata-motors',
    'Tata Motors',
    'NSE',
    'active',
    '{"symbol":"TMCV","legacy_symbol":"TATAMOTORS","source_family":"listed_equity"}'::jsonb
  ),
  (
    '70000000-0000-0000-0000-000000000002',
    'ipo',
    'hero-fincorp',
    'Hero FinCorp',
    'NSE',
    'ipo_open',
    '{"ipo_type":"mainboard","source_family":"ipo"}'::jsonb
  ),
  (
    '70000000-0000-0000-0000-000000000003',
    'ipo',
    'shree-ram-twistex',
    'Shree Ram Twistex',
    'NSE SME',
    'ipo_open',
    '{"ipo_type":"sme","source_family":"ipo"}'::jsonb
  ),
  (
    '70000000-0000-0000-0000-000000000004',
    'mutual_fund',
    'hdfc-mid-cap-opportunities',
    'HDFC Mid-Cap Opportunities Fund',
    null,
    'active',
    '{"amc":"HDFC Mutual Fund","source_family":"mutual_fund"}'::jsonb
  )
on conflict (canonical_slug) do nothing;

insert into asset_aliases (asset_id, alias_value, alias_kind, is_primary)
values
  ('70000000-0000-0000-0000-000000000001', 'TMCV', 'symbol', true),
  ('70000000-0000-0000-0000-000000000001', 'TATAMOTORS', 'symbol', false),
  ('70000000-0000-0000-0000-000000000001', 'Tata Motors Ltd', 'display_name', false),
  ('70000000-0000-0000-0000-000000000002', 'Hero Fincorp IPO', 'display_name', true),
  ('70000000-0000-0000-0000-000000000003', 'Shree Ram Twistex IPO', 'display_name', true),
  ('70000000-0000-0000-0000-000000000004', 'HDFC Mid Cap Opportunities', 'display_name', true)
on conflict (asset_id, alias_value, alias_kind) do nothing;
