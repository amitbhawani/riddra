alter table public.cms_admin_records
  add column if not exists assigned_to text,
  add column if not exists assigned_by text,
  add column if not exists due_date timestamptz;

update public.cms_admin_records
set status = 'ready_for_review'
where status = 'review';

alter table public.cms_admin_records
  drop constraint if exists cms_admin_records_status_check;

alter table public.cms_admin_records
  add constraint cms_admin_records_status_check
  check (status in ('draft', 'ready_for_review', 'needs_fix', 'published', 'archived'));

create index if not exists cms_admin_records_assigned_to_idx
  on public.cms_admin_records (assigned_to, updated_at desc);

create index if not exists cms_admin_records_due_date_idx
  on public.cms_admin_records (due_date asc nulls last);

update public.cms_record_versions
set status = 'ready_for_review'
where status = 'review';

alter table public.cms_record_versions
  drop constraint if exists cms_record_versions_status_check;

alter table public.cms_record_versions
  add constraint cms_record_versions_status_check
  check (status in ('draft', 'ready_for_review', 'needs_fix', 'published', 'archived'));

alter table public.cms_admin_record_revisions
  drop constraint if exists cms_admin_record_revisions_state_check;

alter table public.cms_admin_record_revisions
  add constraint cms_admin_record_revisions_state_check
  check (revision_state in ('Published', 'Review ready', 'Needs fix', 'Rollback staged'));
