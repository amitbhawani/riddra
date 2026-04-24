create table if not exists public.index_component_weight_snapshots (
  id uuid primary key default gen_random_uuid(),
  index_slug text not null,
  source_label text not null,
  source_date date not null,
  reference_url text,
  payload_json jsonb not null,
  created_at timestamptz not null default now()
);

create index if not exists index_component_weight_snapshots_index_slug_source_date_idx
on public.index_component_weight_snapshots (index_slug, source_date desc);
