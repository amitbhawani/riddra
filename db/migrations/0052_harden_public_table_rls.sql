begin;

-- Riddra public-table RLS hardening
-- ------------------------------------------------------------
-- Why 0052?
-- A 0051 migration already exists in this repo, so the next safe
-- additive migration number for this hardening pass is 0052.
--
-- Design:
-- - Internal / operational tables become RLS-protected with no
--   anon/authenticated policies.
-- - Public content tables become RLS-protected with explicit
--   read-only SELECT policies only where public routes need them.
-- - No anon/authenticated INSERT/UPDATE/DELETE access is granted.
-- - Service-role / trusted server-side writes continue to work.

-- ============================================================
-- Internal / operational tables
-- ============================================================

-- index_refresh_runs:
-- Internal refresh-run telemetry for index ingestion / refresh
-- operations. Public pages do not need direct browser/anon read.
alter table if exists public.index_refresh_runs enable row level security;
revoke all on table public.index_refresh_runs from anon, authenticated;

drop policy if exists index_refresh_runs_no_public_access on public.index_refresh_runs;
create policy index_refresh_runs_no_public_access
  on public.index_refresh_runs
  for all
  to anon, authenticated
  using (false)
  with check (false);

-- index_tracker_snapshots:
-- Durable index snapshot storage. Public index pages in this app
-- can read via trusted server-side/admin paths; do not expose
-- direct anon/authenticated table access.
alter table if exists public.index_tracker_snapshots enable row level security;
revoke all on table public.index_tracker_snapshots from anon, authenticated;

drop policy if exists index_tracker_snapshots_no_public_access on public.index_tracker_snapshots;
create policy index_tracker_snapshots_no_public_access
  on public.index_tracker_snapshots
  for all
  to anon, authenticated
  using (false)
  with check (false);

-- data_sources:
-- Source registry + operational source metadata. Public pages have
-- fallback CSV/content paths, so direct anon/authenticated table
-- access is not required.
alter table if exists public.data_sources enable row level security;
revoke all on table public.data_sources from anon, authenticated;

drop policy if exists data_sources_no_public_access on public.data_sources;
create policy data_sources_no_public_access
  on public.data_sources
  for all
  to anon, authenticated
  using (false)
  with check (false);

-- account_state_snapshots:
-- Per-user durable account/workspace/billing/support state. This is
-- internal application state and must not be directly exposed.
alter table if exists public.account_state_snapshots enable row level security;
revoke all on table public.account_state_snapshots from anon, authenticated;

drop policy if exists account_state_snapshots_no_public_access on public.account_state_snapshots;
create policy account_state_snapshots_no_public_access
  on public.account_state_snapshots
  for all
  to anon, authenticated
  using (false)
  with check (false);

-- ============================================================
-- Public content / public read-only tables
-- ============================================================

-- Reset grants first so public access is explicit and narrow.
revoke all on table public.instruments from anon, authenticated;
revoke all on table public.companies from anon, authenticated;
revoke all on table public.stock_pages from anon, authenticated;
revoke all on table public.mutual_funds from anon, authenticated;
revoke all on table public.ipos from anon, authenticated;
revoke all on table public.ipo_pages from anon, authenticated;
revoke all on table public.mutual_fund_pages from anon, authenticated;
revoke all on table public.tracked_indexes from anon, authenticated;

grant select on table public.instruments to anon, authenticated;
grant select on table public.companies to anon, authenticated;
grant select on table public.stock_pages to anon, authenticated;
grant select on table public.mutual_funds to anon, authenticated;
grant select on table public.ipos to anon, authenticated;
grant select on table public.ipo_pages to anon, authenticated;
grant select on table public.mutual_fund_pages to anon, authenticated;
grant select on table public.tracked_indexes to anon, authenticated;

-- instruments:
-- Public stock pages / resolver logic need read-only access, but only
-- for stock/equity/share rows that back public stock routes.
alter table if exists public.instruments enable row level security;

drop policy if exists instruments_public_read on public.instruments;
create policy instruments_public_read
  on public.instruments
  for select
  to anon, authenticated
  using (
    lower(coalesce(instrument_type, '')) in ('stock', 'equity', 'share')
  );

-- companies:
-- Public stock pages join companies for sector/legal profile context.
-- Only expose company rows attached to public-readable stock
-- instruments.
alter table if exists public.companies enable row level security;

drop policy if exists companies_public_read on public.companies;
create policy companies_public_read
  on public.companies
  for select
  to anon, authenticated
  using (
    exists (
      select 1
      from public.instruments
      where instruments.id = companies.instrument_id
        and lower(coalesce(instruments.instrument_type, '')) in ('stock', 'equity', 'share')
    )
  );

-- stock_pages:
-- Public stock route summaries/SEO live here. Only expose rows
-- attached to public-readable stock instruments.
alter table if exists public.stock_pages enable row level security;

drop policy if exists stock_pages_public_read on public.stock_pages;
create policy stock_pages_public_read
  on public.stock_pages
  for select
  to anon, authenticated
  using (
    exists (
      select 1
      from public.instruments
      where instruments.id = stock_pages.instrument_id
        and lower(coalesce(instruments.instrument_type, '')) in ('stock', 'equity', 'share')
    )
  );

-- mutual_funds:
-- Public mutual-fund hub/detail routes and CMS preview fallbacks need
-- read-only access.
alter table if exists public.mutual_funds enable row level security;

drop policy if exists mutual_funds_public_read on public.mutual_funds;
create policy mutual_funds_public_read
  on public.mutual_funds
  for select
  to anon, authenticated
  using (true);

-- mutual_fund_pages:
-- Public mutual-fund page summaries/SEO are read-only content.
alter table if exists public.mutual_fund_pages enable row level security;

drop policy if exists mutual_fund_pages_public_read on public.mutual_fund_pages;
create policy mutual_fund_pages_public_read
  on public.mutual_fund_pages
  for select
  to anon, authenticated
  using (true);

-- ipos:
-- Public IPO routes and CMS preview fallbacks need read-only access.
alter table if exists public.ipos enable row level security;

drop policy if exists ipos_public_read on public.ipos;
create policy ipos_public_read
  on public.ipos
  for select
  to anon, authenticated
  using (true);

-- ipo_pages:
-- Public IPO page summaries/SEO are read-only content.
alter table if exists public.ipo_pages enable row level security;

drop policy if exists ipo_pages_public_read on public.ipo_pages;
create policy ipo_pages_public_read
  on public.ipo_pages
  for select
  to anon, authenticated
  using (true);

-- tracked_indexes:
-- Public index pages currently only need the canonical tracked index
-- rows for Nifty 50, Sensex, Bank Nifty, and Fin Nifty.
alter table if exists public.tracked_indexes enable row level security;

drop policy if exists tracked_indexes_public_read on public.tracked_indexes;
create policy tracked_indexes_public_read
  on public.tracked_indexes
  for select
  to anon, authenticated
  using (
    slug in ('nifty50', 'sensex', 'banknifty', 'finnifty')
  );

commit;
