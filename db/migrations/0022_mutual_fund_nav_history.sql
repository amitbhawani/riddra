create table if not exists public.mutual_fund_nav_history (
  id uuid primary key default gen_random_uuid(),
  fund_slug text not null,
  date date not null,
  nav numeric not null,
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists mutual_fund_nav_history_fund_slug_date_idx
  on public.mutual_fund_nav_history (fund_slug, date desc);
