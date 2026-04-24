insert into public.content_sections (asset_type, asset_slug, section_key, title, body, display_order)
values
  (
    'stock',
    'tata-motors',
    'overview',
    'Why this page matters',
    'Tata Motors is a strong template candidate because it combines retail search demand, cyclical sector context, and recurring interest in results, EV strategy, and peer comparison.',
    1
  ),
  (
    'stock',
    'tata-motors',
    'seo_angle',
    'SEO opportunity',
    'This route can support share price intent, comparison intent, result-day traffic, and event-led updates with one reusable page system.',
    2
  ),
  (
    'ipo',
    'hero-fincorp',
    'overview',
    'IPO lifecycle value',
    'This IPO page should evolve into a full lifecycle route with offer details, GMP, subscription, allotment, listing, FAQs, and archive continuity.',
    1
  ),
  (
    'ipo',
    'hero-fincorp',
    'source_confidence',
    'Source discipline',
    'Hero Fincorp IPO content should remain tied to official issue documents, exchange updates, and regulator-linked records before any higher-frequency overlays are added.',
    2
  ),
  (
    'mutual_fund',
    'hdfc-mid-cap-opportunities',
    'overview',
    'Why this page matters',
    'This fund route is designed for evergreen search demand and should become a stable compare surface for category, benchmark, risk, and manager context.',
    1
  ),
  (
    'mutual_fund',
    'hdfc-mid-cap-opportunities',
    'data_strategy',
    'Data strategy',
    'Mutual fund pages should anchor on AMFI and AMC data while using one consistent layout for NAV, holdings, sector split, risk, and compare flows.',
    2
  )
on conflict (asset_type, asset_slug, section_key) do update
set
  title = excluded.title,
  body = excluded.body,
  display_order = excluded.display_order,
  updated_at = now();
