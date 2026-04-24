create table if not exists public.editorial_blocks (
  id uuid primary key default gen_random_uuid(),
  asset_type text not null,
  asset_slug text not null,
  block_key text not null,
  title text,
  content text not null default '',
  content_format text not null default 'markdown',
  workflow_status text not null default 'draft',
  visibility text not null default 'public',
  editor_notes text,
  created_by uuid references public.profiles (id) on delete set null,
  updated_by uuid references public.profiles (id) on delete set null,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (asset_type, asset_slug, block_key)
);

create index if not exists editorial_blocks_asset_lookup_idx
  on public.editorial_blocks (asset_type, asset_slug, workflow_status);

create table if not exists public.asset_announcements (
  id uuid primary key default gen_random_uuid(),
  asset_type text not null,
  asset_slug text not null,
  announcement_type text not null default 'update',
  headline text not null,
  summary text,
  source_label text,
  source_url text,
  importance text not null default 'normal',
  workflow_status text not null default 'draft',
  announced_at timestamptz,
  created_by uuid references public.profiles (id) on delete set null,
  updated_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists asset_announcements_asset_lookup_idx
  on public.asset_announcements (asset_type, asset_slug, announced_at desc);

create table if not exists public.asset_documents (
  id uuid primary key default gen_random_uuid(),
  asset_type text not null,
  asset_slug text not null,
  document_type text not null,
  title text not null,
  file_url text,
  source_label text,
  source_url text,
  workflow_status text not null default 'draft',
  visibility text not null default 'public',
  published_at timestamptz,
  created_by uuid references public.profiles (id) on delete set null,
  updated_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists asset_documents_asset_lookup_idx
  on public.asset_documents (asset_type, asset_slug, document_type);

create table if not exists public.editorial_workflows (
  id uuid primary key default gen_random_uuid(),
  entity_type text not null,
  entity_id uuid not null,
  workflow_state text not null default 'draft',
  assigned_to uuid references public.profiles (id) on delete set null,
  reviewer_id uuid references public.profiles (id) on delete set null,
  due_at timestamptz,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists editorial_workflows_entity_lookup_idx
  on public.editorial_workflows (entity_type, entity_id, workflow_state);
