create table if not exists public.cms_admin_import_batches (
  id text primary key,
  family text not null,
  actor_user_id text null,
  actor_email text not null,
  file_name text not null,
  import_mode text not null,
  status text not null,
  source_kind text not null default 'csv',
  storage_mode text not null default 'fallback',
  total_rows integer not null default 0,
  valid_rows integer not null default 0,
  warning_rows integer not null default 0,
  failed_rows integer not null default 0,
  created_count integer not null default 0,
  updated_count integer not null default 0,
  queued_count integer not null default 0,
  skipped_count integer not null default 0,
  failed_count integer not null default 0,
  summary text not null default '',
  field_mapping jsonb not null default '{}'::jsonb,
  uploaded_at timestamptz not null default timezone('utc', now()),
  completed_at timestamptz null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint cms_admin_import_batches_mode_check
    check (import_mode in ('create_new_only', 'update_existing_only', 'create_or_update')),
  constraint cms_admin_import_batches_status_check
    check (status in ('preview_ready', 'completed', 'completed_with_errors', 'queued_for_approval', 'failed'))
);

create index if not exists cms_admin_import_batches_family_updated_idx
  on public.cms_admin_import_batches (family, updated_at desc);

create index if not exists cms_admin_import_batches_actor_updated_idx
  on public.cms_admin_import_batches (actor_email, updated_at desc);

create table if not exists public.cms_admin_import_rows (
  id text primary key,
  batch_id text not null references public.cms_admin_import_batches(id) on delete cascade,
  row_number integer not null,
  identifier text null,
  title text null,
  slug text null,
  matched_record_id text null,
  matched_slug text null,
  operation text not null,
  status text not null,
  warnings jsonb not null default '[]'::jsonb,
  errors jsonb not null default '[]'::jsonb,
  payload jsonb not null default '{}'::jsonb,
  result_note text not null default '',
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint cms_admin_import_rows_operation_check
    check (operation in ('create', 'update', 'skip', 'queue_for_approval')),
  constraint cms_admin_import_rows_status_check
    check (status in ('valid', 'warning', 'failed', 'created', 'updated', 'skipped', 'queued_for_approval'))
);

create index if not exists cms_admin_import_rows_batch_status_idx
  on public.cms_admin_import_rows (batch_id, status, row_number asc);
