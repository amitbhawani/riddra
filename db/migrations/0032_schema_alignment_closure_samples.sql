alter table public.instruments
add column if not exists sector_index_slug text;

create index if not exists instruments_sector_index_slug_idx
on public.instruments (sector_index_slug);

update public.instruments
set sector_index_slug = 'nifty_auto'
where slug = 'tata-motors'
  and (sector_index_slug is null or sector_index_slug = '');

update public.instruments
set sector_index_slug = 'nifty_it'
where slug = 'infosys'
  and (sector_index_slug is null or sector_index_slug = '');

update public.instruments
set sector_index_slug = 'nifty_bank'
where slug = 'hdfc-bank'
  and (sector_index_slug is null or sector_index_slug = '');

alter table public.mutual_funds
add column if not exists benchmark_index_slug text;

create index if not exists mutual_funds_benchmark_index_slug_idx
on public.mutual_funds (benchmark_index_slug);

update public.mutual_funds
set benchmark_index_slug = 'niftymidcap150'
where slug = 'hdfc-mid-cap-opportunities'
  and (benchmark_index_slug is null or benchmark_index_slug = '');

update public.mutual_funds
set benchmark_index_slug = 'nifty100'
where slug = 'sbi-bluechip-fund'
  and (benchmark_index_slug is null or benchmark_index_slug = '');
