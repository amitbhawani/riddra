alter table if exists public.mutual_funds
  add column if not exists benchmark_index_slug text;

update public.mutual_funds
set benchmark_index_slug = 'niftymidcap150'
where slug = 'hdfc-mid-cap-opportunities'
  and (benchmark_index_slug is null or benchmark_index_slug = '');

update public.mutual_funds
set benchmark_index_slug = 'nifty100'
where slug = 'sbi-bluechip-fund'
  and (benchmark_index_slug is null or benchmark_index_slug = '');
