create table if not exists public.cms_admin_pending_approvals (
  id text primary key,
  family text not null,
  slug text not null,
  title text not null,
  record_id text null,
  submitted_by_user_id text null,
  submitted_by_email text not null,
  submitted_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  decision text not null default 'pending',
  reviewed_at timestamptz null,
  reviewed_by_user_id text null,
  reviewed_by_email text null,
  review_note text null,
  action_type text not null,
  target_status text not null,
  summary text not null,
  changed_fields jsonb not null default '[]'::jsonb,
  snapshot jsonb not null default '{}'::jsonb,
  base_record_updated_at timestamptz null,
  constraint cms_admin_pending_approvals_decision_check
    check (decision in ('pending', 'approved', 'rejected')),
  constraint cms_admin_pending_approvals_target_status_check
    check (target_status in ('draft', 'review', 'ready_for_review', 'needs_fix', 'published', 'archived'))
);

create index if not exists cms_admin_pending_approvals_decision_updated_idx
  on public.cms_admin_pending_approvals (decision, updated_at desc);

create index if not exists cms_admin_pending_approvals_record_lookup_idx
  on public.cms_admin_pending_approvals (family, slug, decision, updated_at desc);

create index if not exists cms_admin_pending_approvals_submitter_idx
  on public.cms_admin_pending_approvals (submitted_by_email, decision, updated_at desc);
