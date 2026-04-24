alter table public.instruments
add column if not exists sector_index_slug text;

create index if not exists instruments_sector_index_slug_idx
on public.instruments (sector_index_slug);
