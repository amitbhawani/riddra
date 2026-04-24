create table if not exists public.content_entity_types (
  code text primary key,
  label text not null,
  family text not null,
  description text,
  public_route_base text,
  source_table text,
  supports_import boolean not null default true,
  supports_manual_create boolean not null default true,
  supports_editorial_blocks boolean not null default true,
  sort_order integer not null default 100,
  field_schema jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.content_records (
  id uuid primary key default gen_random_uuid(),
  entity_type text not null references public.content_entity_types (code) on delete restrict,
  canonical_slug text not null,
  canonical_symbol text,
  title text not null,
  source_table text,
  source_row_id uuid,
  workflow_state text not null default 'draft',
  verification_state text not null default 'unverified',
  publication_visibility text not null default 'private',
  review_queue_reason text,
  source_payload jsonb not null default '{}'::jsonb,
  editorial_payload jsonb not null default '{}'::jsonb,
  metadata jsonb not null default '{}'::jsonb,
  duplicate_of_id uuid references public.content_records (id) on delete set null,
  created_by uuid references public.profiles (id) on delete set null,
  updated_by uuid references public.profiles (id) on delete set null,
  reviewer_id uuid references public.profiles (id) on delete set null,
  approver_id uuid references public.profiles (id) on delete set null,
  published_by uuid references public.profiles (id) on delete set null,
  verified_at timestamptz,
  reviewed_at timestamptz,
  approved_at timestamptz,
  published_at timestamptz,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (entity_type, canonical_slug),
  constraint content_records_workflow_state_check check (
    workflow_state in ('draft', 'pending_review', 'approved', 'published', 'archived', 'rejected')
  ),
  constraint content_records_verification_state_check check (
    verification_state in ('unverified', 'trusted_match', 'verified', 'needs_review', 'rejected')
  ),
  constraint content_records_publication_visibility_check check (
    publication_visibility in ('private', 'public')
  )
);

create unique index if not exists content_records_entity_symbol_unique_idx
  on public.content_records (entity_type, canonical_symbol)
  where canonical_symbol is not null;

create index if not exists content_records_entity_workflow_idx
  on public.content_records (entity_type, workflow_state, verification_state, publication_visibility);

create index if not exists content_records_entity_updated_idx
  on public.content_records (entity_type, updated_at desc);

create table if not exists public.content_record_revisions (
  id uuid primary key default gen_random_uuid(),
  content_record_id uuid not null references public.content_records (id) on delete cascade,
  revision_number integer not null,
  snapshot jsonb not null default '{}'::jsonb,
  change_summary text,
  changed_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  unique (content_record_id, revision_number)
);

create index if not exists content_record_revisions_lookup_idx
  on public.content_record_revisions (content_record_id, revision_number desc);

create table if not exists public.content_workflow_events (
  id uuid primary key default gen_random_uuid(),
  content_record_id uuid not null references public.content_records (id) on delete cascade,
  event_type text not null,
  from_state text,
  to_state text,
  actor_id uuid references public.profiles (id) on delete set null,
  notes text,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists content_workflow_events_lookup_idx
  on public.content_workflow_events (content_record_id, created_at desc);

create table if not exists public.content_import_batches (
  id uuid primary key default gen_random_uuid(),
  entity_type text not null references public.content_entity_types (code) on delete restrict,
  source_label text not null,
  source_reference text,
  uploaded_filename text,
  batch_status text not null default 'draft',
  row_count integer not null default 0,
  review_summary jsonb not null default '{}'::jsonb,
  validation_schema jsonb not null default '{}'::jsonb,
  created_by uuid references public.profiles (id) on delete set null,
  updated_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint content_import_batches_status_check check (
    batch_status in ('draft', 'validating', 'review', 'approved', 'applied', 'rejected', 'failed')
  )
);

create index if not exists content_import_batches_entity_status_idx
  on public.content_import_batches (entity_type, batch_status, created_at desc);

create table if not exists public.content_import_rows (
  id uuid primary key default gen_random_uuid(),
  batch_id uuid not null references public.content_import_batches (id) on delete cascade,
  entity_type text not null references public.content_entity_types (code) on delete restrict,
  row_number integer not null,
  proposed_slug text,
  proposed_symbol text,
  proposed_title text,
  normalized_payload jsonb not null default '{}'::jsonb,
  trusted_match jsonb not null default '{}'::jsonb,
  validation_state text not null default 'pending_validation',
  validation_errors jsonb not null default '[]'::jsonb,
  duplicate_of_id uuid references public.content_records (id) on delete set null,
  target_record_id uuid references public.content_records (id) on delete set null,
  review_notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (batch_id, row_number),
  constraint content_import_rows_validation_state_check check (
    validation_state in ('pending_validation', 'valid', 'duplicate', 'unmatched', 'invalid', 'approved_for_import', 'rejected')
  )
);

create index if not exists content_import_rows_batch_state_idx
  on public.content_import_rows (batch_id, validation_state, row_number);

create index if not exists content_import_rows_entity_state_idx
  on public.content_import_rows (entity_type, validation_state, updated_at desc);

create or replace view public.publishable_content_records as
select *
from public.content_records
where workflow_state = 'published'
  and verification_state = 'verified'
  and publication_visibility = 'public';
