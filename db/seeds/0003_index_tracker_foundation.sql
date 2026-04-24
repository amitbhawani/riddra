with upserted_indexes as (
  insert into public.tracked_indexes (
    slug,
    title,
    market_scope,
    benchmark_type,
    primary_source_code,
    update_mode,
    refresh_target_seconds,
    public_access_level,
    premium_access_level,
    status
  )
  values
    ('nifty50', 'Nifty 50', 'india', 'equity_index', 'nse_index', 'snapshot', 15, 'delayed', 'intraday', 'planned'),
    ('banknifty', 'Bank Nifty', 'india', 'banking_index', 'nse_bank_index', 'snapshot', 15, 'delayed', 'intraday', 'planned'),
    ('finnifty', 'Fin Nifty', 'india', 'financial_services_index', 'nse_financial_services_index', 'snapshot', 15, 'delayed', 'intraday', 'planned'),
    ('sensex', 'Sensex', 'india', 'equity_index', 'bse_sensex', 'snapshot', 15, 'delayed', 'intraday', 'planned')
  on conflict (slug) do update
  set
    title = excluded.title,
    market_scope = excluded.market_scope,
    benchmark_type = excluded.benchmark_type,
    primary_source_code = excluded.primary_source_code,
    update_mode = excluded.update_mode,
    refresh_target_seconds = excluded.refresh_target_seconds,
    public_access_level = excluded.public_access_level,
    premium_access_level = excluded.premium_access_level,
    status = excluded.status,
    updated_at = now()
  returning id, slug
)
insert into public.index_component_weights (
  tracked_index_id,
  component_symbol,
  component_name,
  weight,
  effective_from,
  source_code
)
select
  upserted_indexes.id,
  seeded.component_symbol,
  seeded.component_name,
  seeded.weight,
  current_date,
  seeded.source_code
from upserted_indexes
join (
  values
    ('nifty50', 'RELIANCE', 'Reliance Industries', 9.8000, 'nse_index'),
    ('nifty50', 'HDFCBANK', 'HDFC Bank', 8.4000, 'nse_index'),
    ('nifty50', 'ICICIBANK', 'ICICI Bank', 7.6000, 'nse_index'),
    ('banknifty', 'HDFCBANK', 'HDFC Bank', 28.4000, 'nse_bank_index'),
    ('banknifty', 'ICICIBANK', 'ICICI Bank', 23.9000, 'nse_bank_index'),
    ('banknifty', 'SBIN', 'State Bank of India', 11.7000, 'nse_bank_index'),
    ('finnifty', 'HDFCBANK', 'HDFC Bank', 17.9000, 'nse_financial_services_index'),
    ('finnifty', 'ICICIBANK', 'ICICI Bank', 14.6000, 'nse_financial_services_index'),
    ('finnifty', 'SBILIFE', 'SBI Life Insurance', 6.4000, 'nse_financial_services_index'),
    ('sensex', 'RELIANCE', 'Reliance Industries', 11.2000, 'bse_sensex'),
    ('sensex', 'HDFCBANK', 'HDFC Bank', 10.5000, 'bse_sensex'),
    ('sensex', 'ICICIBANK', 'ICICI Bank', 8.2000, 'bse_sensex')
) as seeded(index_slug, component_symbol, component_name, weight, source_code)
  on seeded.index_slug = upserted_indexes.slug
on conflict (tracked_index_id, component_symbol, effective_from) do update
set
  component_name = excluded.component_name,
  weight = excluded.weight,
  source_code = excluded.source_code;

with tracked as (
  select id, slug, primary_source_code
  from public.tracked_indexes
  where slug in ('nifty50', 'banknifty', 'finnifty', 'sensex')
),
snapshots as (
  insert into public.index_tracker_snapshots (
    tracked_index_id,
    snapshot_at,
    session_phase,
    move_percent,
    weighted_breadth_score,
    advancing_count,
    declining_count,
    positive_weight_share,
    negative_weight_share,
    market_mood,
    dominance_label,
    trend_label,
    source_code
  )
  select
    tracked.id,
    seeded.snapshot_at,
    seeded.session_phase,
    seeded.move_percent,
    seeded.weighted_breadth_score,
    seeded.advancing_count,
    seeded.declining_count,
    seeded.positive_weight_share,
    seeded.negative_weight_share,
    seeded.market_mood,
    seeded.dominance_label,
    seeded.trend_label,
    tracked.primary_source_code
  from tracked
  join (
    values
      ('nifty50', '2026-04-12T09:20:00+05:30'::timestamptz, 'Opening drive', 0.12, 0.18, 3, 2, 30.10, 10.50, 'Mixed', 'Market tug-of-war', 'Improving through the session'),
      ('nifty50', '2026-04-12T10:10:00+05:30'::timestamptz, 'Opening drive', 0.18, 0.26, 3, 2, 30.10, 10.50, 'Mixed', 'Market tug-of-war', 'Improving through the session'),
      ('nifty50', '2026-04-12T11:00:00+05:30'::timestamptz, 'Mid-session balance', 0.24, 0.39, 4, 2, 30.10, 10.50, 'Mixed', 'Market tug-of-war', 'Improving through the session'),
      ('nifty50', '2026-04-12T12:15:00+05:30'::timestamptz, 'Mid-session balance', 0.19, 0.29, 4, 2, 30.10, 10.50, 'Mixed', 'Market tug-of-war', 'Improving through the session'),
      ('nifty50', '2026-04-12T13:05:00+05:30'::timestamptz, 'Mid-session balance', 0.22, 0.35, 4, 2, 30.10, 10.50, 'Mixed', 'Market tug-of-war', 'Improving through the session'),
      ('banknifty', '2026-04-12T09:20:00+05:30'::timestamptz, 'Opening drive', 0.17, 0.22, 3, 3, 62.40, 24.40, 'Mixed', 'Leaders are in control', 'Balanced intraday tone'),
      ('banknifty', '2026-04-12T10:10:00+05:30'::timestamptz, 'Opening drive', 0.31, 0.41, 3, 3, 62.40, 24.40, 'Mixed', 'Leaders are in control', 'Balanced intraday tone'),
      ('banknifty', '2026-04-12T11:00:00+05:30'::timestamptz, 'Mid-session balance', 0.27, 0.34, 3, 3, 62.40, 24.40, 'Mixed', 'Leaders are in control', 'Balanced intraday tone'),
      ('banknifty', '2026-04-12T12:15:00+05:30'::timestamptz, 'Mid-session balance', 0.12, 0.18, 3, 3, 62.40, 24.40, 'Mixed', 'Leaders are in control', 'Balanced intraday tone'),
      ('banknifty', '2026-04-12T13:05:00+05:30'::timestamptz, 'Mid-session balance', 0.15, 0.23, 3, 3, 62.40, 24.40, 'Mixed', 'Leaders are in control', 'Balanced intraday tone'),
      ('finnifty', '2026-04-12T09:20:00+05:30'::timestamptz, 'Opening drive', 0.08, 0.11, 3, 3, 37.10, 12.10, 'Mixed', 'Market tug-of-war', 'Balanced intraday tone'),
      ('finnifty', '2026-04-12T10:10:00+05:30'::timestamptz, 'Opening drive', 0.06, 0.09, 3, 3, 37.10, 12.10, 'Mixed', 'Market tug-of-war', 'Balanced intraday tone'),
      ('finnifty', '2026-04-12T11:00:00+05:30'::timestamptz, 'Mid-session balance', 0.09, 0.14, 3, 3, 37.10, 12.10, 'Mixed', 'Market tug-of-war', 'Balanced intraday tone'),
      ('finnifty', '2026-04-12T12:15:00+05:30'::timestamptz, 'Mid-session balance', 0.14, 0.21, 3, 3, 37.10, 12.10, 'Mixed', 'Market tug-of-war', 'Balanced intraday tone'),
      ('finnifty', '2026-04-12T13:05:00+05:30'::timestamptz, 'Closing push', 0.16, 0.25, 3, 3, 37.10, 12.10, 'Mixed', 'Market tug-of-war', 'Balanced intraday tone'),
      ('sensex', '2026-04-12T09:20:00+05:30'::timestamptz, 'Opening drive', 0.05, 0.08, 4, 2, 34.00, 13.00, 'Mixed', 'Market tug-of-war', 'Improving through the session'),
      ('sensex', '2026-04-12T10:10:00+05:30'::timestamptz, 'Opening drive', 0.12, 0.19, 4, 2, 34.00, 13.00, 'Mixed', 'Market tug-of-war', 'Improving through the session'),
      ('sensex', '2026-04-12T11:00:00+05:30'::timestamptz, 'Mid-session balance', 0.11, 0.16, 4, 2, 34.00, 13.00, 'Mixed', 'Market tug-of-war', 'Improving through the session'),
      ('sensex', '2026-04-12T12:15:00+05:30'::timestamptz, 'Closing push', 0.18, 0.27, 4, 2, 34.00, 13.00, 'Mixed', 'Market tug-of-war', 'Improving through the session'),
      ('sensex', '2026-04-12T13:05:00+05:30'::timestamptz, 'Closing push', 0.22, 0.33, 4, 2, 34.00, 13.00, 'Mixed', 'Market tug-of-war', 'Improving through the session')
  ) as seeded(index_slug, snapshot_at, session_phase, move_percent, weighted_breadth_score, advancing_count, declining_count, positive_weight_share, negative_weight_share, market_mood, dominance_label, trend_label)
    on seeded.index_slug = tracked.slug
  on conflict (tracked_index_id, snapshot_at) do update
  set
    session_phase = excluded.session_phase,
    move_percent = excluded.move_percent,
    weighted_breadth_score = excluded.weighted_breadth_score,
    advancing_count = excluded.advancing_count,
    declining_count = excluded.declining_count,
    positive_weight_share = excluded.positive_weight_share,
    negative_weight_share = excluded.negative_weight_share,
    market_mood = excluded.market_mood,
    dominance_label = excluded.dominance_label,
    trend_label = excluded.trend_label,
    source_code = excluded.source_code
  returning id, tracked_index_id
)
insert into public.index_component_snapshots (
  index_snapshot_id,
  component_symbol,
  component_name,
  weight,
  change_percent,
  contribution,
  signal
)
select
  latest_snapshot.id,
  component_symbol,
  component_name,
  weight,
  change_percent,
  contribution,
  signal
from (
  select snapshots.*
  from snapshots
  join (
    select tracked_index_id, max(id) as latest_id
    from snapshots
    group by tracked_index_id
  ) latest
    on latest.latest_id = snapshots.id
) latest_snapshot
join (
  values
    ('nifty50', 'RELIANCE', 'Reliance Industries', 9.8000, 0.45, 0.04, 'bullish'),
    ('nifty50', 'HDFCBANK', 'HDFC Bank', 8.4000, 0.62, 0.05, 'bullish'),
    ('nifty50', 'ICICIBANK', 'ICICI Bank', 7.6000, 0.41, 0.03, 'bullish'),
    ('nifty50', 'INFY', 'Infosys', 5.7000, -0.28, -0.02, 'neutral'),
    ('nifty50', 'TCS', 'TCS', 4.8000, -0.11, -0.01, 'neutral'),
    ('nifty50', 'BHARTIARTL', 'Bharti Airtel', 4.3000, 0.81, 0.03, 'bullish'),
    ('banknifty', 'HDFCBANK', 'HDFC Bank', 28.4000, 0.64, 0.18, 'bullish'),
    ('banknifty', 'ICICIBANK', 'ICICI Bank', 23.9000, 0.58, 0.14, 'bullish'),
    ('banknifty', 'SBIN', 'State Bank of India', 11.7000, -0.31, -0.04, 'bearish'),
    ('banknifty', 'AXISBANK', 'Axis Bank', 10.1000, 0.44, 0.04, 'bullish'),
    ('banknifty', 'KOTAKBANK', 'Kotak Mahindra Bank', 8.3000, -0.52, -0.04, 'bearish'),
    ('banknifty', 'INDUSINDBK', 'IndusInd Bank', 4.4000, -0.74, -0.03, 'bearish'),
    ('finnifty', 'HDFCBANK', 'HDFC Bank', 17.9000, 0.61, 0.11, 'bullish'),
    ('finnifty', 'ICICIBANK', 'ICICI Bank', 14.6000, 0.47, 0.07, 'bullish'),
    ('finnifty', 'SBILIFE', 'SBI Life Insurance', 6.4000, -0.18, -0.01, 'neutral'),
    ('finnifty', 'BAJFINANCE', 'Bajaj Finance', 5.9000, -0.42, -0.02, 'bearish'),
    ('finnifty', 'KOTAKBANK', 'Kotak Mahindra Bank', 5.8000, -0.36, -0.02, 'bearish'),
    ('finnifty', 'HDFCLIFE', 'HDFC Life', 4.6000, 0.55, 0.03, 'bullish'),
    ('sensex', 'RELIANCE', 'Reliance Industries', 11.2000, 0.53, 0.06, 'bullish'),
    ('sensex', 'HDFCBANK', 'HDFC Bank', 10.5000, 0.66, 0.07, 'bullish'),
    ('sensex', 'ICICIBANK', 'ICICI Bank', 8.2000, 0.38, 0.03, 'bullish'),
    ('sensex', 'INFY', 'Infosys', 7.4000, -0.35, -0.03, 'bearish'),
    ('sensex', 'TCS', 'TCS', 5.6000, -0.18, -0.01, 'neutral'),
    ('sensex', 'LT', 'Larsen & Toubro', 4.1000, 0.72, 0.03, 'bullish')
) as seeded(index_slug, component_symbol, component_name, weight, change_percent, contribution, signal)
  on seeded.index_slug = (
    select slug from public.tracked_indexes where id = latest_snapshot.tracked_index_id
  )
on conflict (index_snapshot_id, component_symbol) do update
set
  component_name = excluded.component_name,
  weight = excluded.weight,
  change_percent = excluded.change_percent,
  contribution = excluded.contribution,
  signal = excluded.signal;
