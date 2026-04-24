create extension if not exists "pgcrypto";

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text,
  avatar_url text,
  role text not null default 'member',
  onboarding_track text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  provider text not null default 'razorpay',
  external_customer_id text,
  external_subscription_id text,
  plan_code text not null,
  status text not null default 'inactive',
  current_period_start timestamptz,
  current_period_end timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.entitlements (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  feature_code text not null,
  access_level text not null default 'none',
  source text not null default 'plan',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, feature_code)
);

create table if not exists public.data_sources (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  domain text not null,
  source_name text not null,
  source_type text not null,
  official_status text not null,
  refresh_cadence text,
  coverage_scope text,
  license_note text,
  fallback_behavior text,
  notes text,
  created_at timestamptz not null default now()
);

create table if not exists public.instruments (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  symbol text,
  name text not null,
  instrument_type text not null,
  exchange text,
  status text not null default 'active',
  primary_source_code text references public.data_sources (code),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.companies (
  id uuid primary key default gen_random_uuid(),
  instrument_id uuid not null unique references public.instruments (id) on delete cascade,
  legal_name text not null,
  sector text,
  industry text,
  description text,
  headquarters text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.stock_pages (
  instrument_id uuid primary key references public.instruments (id) on delete cascade,
  hero_summary text,
  seo_title text,
  seo_description text,
  content_status text not null default 'draft',
  updated_at timestamptz not null default now()
);

create table if not exists public.ipos (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  company_name text not null,
  ipo_type text not null,
  status text not null,
  open_date date,
  close_date date,
  listing_date date,
  price_band text,
  primary_source_code text references public.data_sources (code),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.ipo_pages (
  ipo_id uuid primary key references public.ipos (id) on delete cascade,
  hero_summary text,
  seo_title text,
  seo_description text,
  content_status text not null default 'draft',
  updated_at timestamptz not null default now()
);

create table if not exists public.mutual_funds (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  fund_name text not null,
  category text not null,
  amc_name text,
  plan_type text,
  option_type text,
  benchmark text,
  primary_source_code text references public.data_sources (code),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.mutual_fund_pages (
  fund_id uuid primary key references public.mutual_funds (id) on delete cascade,
  hero_summary text,
  seo_title text,
  seo_description text,
  content_status text not null default 'draft',
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;
alter table public.subscriptions enable row level security;
alter table public.entitlements enable row level security;

create policy "profiles_select_own"
on public.profiles
for select
using (auth.uid() = id);

create policy "profiles_update_own"
on public.profiles
for update
using (auth.uid() = id);

create policy "subscriptions_select_own"
on public.subscriptions
for select
using (auth.uid() = user_id);

create policy "entitlements_select_own"
on public.entitlements
for select
using (auth.uid() = user_id);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, new.raw_user_meta_data ->> 'full_name')
  on conflict (id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
