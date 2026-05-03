-- Riddra durable admin activity log bootstrap
-- Safe to run multiple times.
-- Keeps existing data intact and only adds missing structure.

create extension if not exists pgcrypto;

create table if not exists public.cms_admin_activity_log (
  id uuid primary key default gen_random_uuid(),
  actor_email text not null,
  actor_user_id text null,
  action_type text not null,
  target_type text not null,
  target_id text null,
  target_family text null,
  target_slug text null,
  summary text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now())
);

alter table public.cms_admin_activity_log
  add column if not exists actor_email text,
  add column if not exists actor_user_id text,
  add column if not exists action_type text,
  add column if not exists target_type text,
  add column if not exists target_id text,
  add column if not exists target_family text,
  add column if not exists target_slug text,
  add column if not exists summary text,
  add column if not exists metadata jsonb,
  add column if not exists created_at timestamptz;

update public.cms_admin_activity_log
set metadata = '{}'::jsonb
where metadata is null;

update public.cms_admin_activity_log
set created_at = timezone('utc', now())
where created_at is null;

create index if not exists cms_admin_activity_log_created_at_idx
  on public.cms_admin_activity_log (created_at desc);

create index if not exists cms_admin_activity_log_actor_email_idx
  on public.cms_admin_activity_log (actor_email);

create index if not exists cms_admin_activity_log_action_type_idx
  on public.cms_admin_activity_log (action_type);

create index if not exists cms_admin_activity_log_target_type_idx
  on public.cms_admin_activity_log (target_type);

create index if not exists cms_admin_activity_log_target_id_idx
  on public.cms_admin_activity_log (target_id);
