create table if not exists public.cms_admin_editor_locks (
  id text primary key,
  family text not null,
  slug text not null,
  editor_user_id text null,
  editor_email text not null,
  started_at timestamptz not null default now(),
  last_heartbeat_at timestamptz not null default now(),
  expires_at timestamptz not null
);

create unique index if not exists cms_admin_editor_locks_family_slug_email_idx
  on public.cms_admin_editor_locks (family, slug, editor_email);

create index if not exists cms_admin_editor_locks_family_slug_idx
  on public.cms_admin_editor_locks (family, slug);

create index if not exists cms_admin_editor_locks_expires_idx
  on public.cms_admin_editor_locks (expires_at);
