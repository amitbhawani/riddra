create table if not exists public.cms_admin_activity_log (
  id text primary key,
  actor_user_id text,
  actor_email text not null default '',
  action_type text not null,
  target_type text not null,
  target_id text,
  target_family text,
  target_slug text,
  summary text not null default '',
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists cms_admin_activity_log_created_idx
  on public.cms_admin_activity_log (created_at desc);

create index if not exists cms_admin_activity_log_action_idx
  on public.cms_admin_activity_log (action_type, created_at desc);
