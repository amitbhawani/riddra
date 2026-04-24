insert into public.taxonomies (taxonomy_type, slug, label, description)
values
  ('sector', 'auto', 'Auto', 'Sector taxonomy for automobile and mobility businesses.'),
  ('fund_category', 'mid-cap-fund', 'Mid Cap Fund', 'Mutual fund category for mid cap focused schemes.'),
  ('market_cluster', 'nifty-50', 'Nifty 50', 'Index cluster taxonomy for flagship Indian large-cap tracking.')
on conflict (taxonomy_type, slug) do update
set
  label = excluded.label,
  description = excluded.description,
  updated_at = now();

insert into public.asset_taxonomies (asset_type, asset_slug, taxonomy_id, sort_order)
select 'stock', 'tata-motors', id, 1
from public.taxonomies
where taxonomy_type = 'sector' and slug = 'auto'
on conflict (asset_type, asset_slug, taxonomy_id) do update
set sort_order = excluded.sort_order;

insert into public.asset_taxonomies (asset_type, asset_slug, taxonomy_id, sort_order)
select 'mutual_fund', 'hdfc-mid-cap-opportunities', id, 1
from public.taxonomies
where taxonomy_type = 'fund_category' and slug = 'mid-cap-fund'
on conflict (asset_type, asset_slug, taxonomy_id) do update
set sort_order = excluded.sort_order;

insert into public.asset_relationships (
  source_asset_type,
  source_asset_slug,
  target_asset_type,
  target_asset_slug,
  relationship_type,
  strength,
  notes
)
values
  (
    'stock',
    'tata-motors',
    'stock',
    'reliance-industries',
    'compare_candidate',
    72,
    'Large-cap compare route placeholder for related market leaders.'
  ),
  (
    'ipo',
    'hero-fincorp',
    'stock',
    'tata-motors',
    'sector_reference',
    48,
    'Placeholder cross-link showing how IPO pages may relate to existing listed-sector context.'
  ),
  (
    'stock',
    'tata-motors',
    'learn',
    'what-is-open-interest',
    'learning_reference',
    35,
    'Example of asset-to-learning relationship for future smart-search and internal linking.'
  )
on conflict (source_asset_type, source_asset_slug, target_asset_type, target_asset_slug, relationship_type) do update
set
  strength = excluded.strength,
  notes = excluded.notes,
  updated_at = now();
