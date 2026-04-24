create table if not exists public.sector_performance_snapshots (
  id uuid primary key default gen_random_uuid(),
  sector_slug text not null,
  sector_name text not null,
  return_1d numeric not null,
  source_label text not null,
  source_date date not null,
  reference_url text,
  created_at timestamptz not null default now()
);

create index if not exists sector_performance_snapshots_sector_slug_source_date_idx
on public.sector_performance_snapshots (sector_slug, source_date desc);
