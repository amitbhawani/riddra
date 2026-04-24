alter table public.cms_media_assets
  drop constraint if exists cms_media_assets_asset_type_check;

alter table public.cms_media_assets
  add column if not exists category text,
  add column if not exists updated_at timestamptz not null default now();

update public.cms_media_assets
set
  category = coalesce(category, case when asset_type = 'document' then 'document' else 'content' end),
  updated_at = coalesce(updated_at, uploaded_at, now());

alter table public.cms_media_assets
  alter column category set default 'content',
  alter column category set not null;

alter table public.cms_media_assets
  add constraint cms_media_assets_asset_type_check check (asset_type in ('image', 'document'));

create index if not exists cms_media_assets_type_updated_idx
  on public.cms_media_assets (asset_type, updated_at desc);
