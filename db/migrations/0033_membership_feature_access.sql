alter table public.cms_membership_tiers
  add column if not exists feature_access jsonb not null default '{}'::jsonb;
