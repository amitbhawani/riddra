-- RIDDRA product_user_profiles schema alignment fix
-- Purpose:
-- 1. Align the durable profile table with the current hosted code expectations.
-- 2. Add only missing columns.
-- 3. Backfill identity fields safely without dropping or truncating data.
-- 4. Ensure the Amit admin row exists and is normalized for hosted account bootstrap.

begin;

alter table if exists public.product_user_profiles
  add column if not exists auth_user_id uuid;

alter table if exists public.product_user_profiles
  add column if not exists user_key text;

alter table if exists public.product_user_profiles
  add column if not exists username text;

alter table if exists public.product_user_profiles
  add column if not exists website_url text;

alter table if exists public.product_user_profiles
  add column if not exists x_handle text;

alter table if exists public.product_user_profiles
  add column if not exists linkedin_url text;

alter table if exists public.product_user_profiles
  add column if not exists instagram_handle text;

alter table if exists public.product_user_profiles
  add column if not exists youtube_url text;

alter table if exists public.product_user_profiles
  add column if not exists profile_visible boolean not null default true;

alter table if exists public.product_user_profiles
  add column if not exists capabilities jsonb not null default '[]'::jsonb;

alter table if exists public.product_user_profiles
  add column if not exists membership_tier text;

alter table if exists public.product_user_profiles
  add column if not exists role text not null default 'user';

alter table if exists public.product_user_profiles
  add column if not exists created_at timestamptz not null default now();

alter table if exists public.product_user_profiles
  add column if not exists updated_at timestamptz not null default now();

alter table if exists public.product_user_profiles
  add column if not exists last_active_at timestamptz not null default now();

-- Backfill auth_user_id from Supabase Auth users by email.
update public.product_user_profiles profile
set auth_user_id = auth_user.id
from auth.users auth_user
where lower(auth_user.email) = lower(profile.email)
  and (
    profile.auth_user_id is null
    or profile.auth_user_id <> auth_user.id
  );

-- Backfill user_key if it is missing.
update public.product_user_profiles
set user_key = coalesce(
  nullif(lower(trim(email)), ''),
  nullif(auth_user_id::text, '')
)
where user_key is null
   or trim(user_key) = '';

-- Backfill name if it is missing.
update public.product_user_profiles
set name = coalesce(
  nullif(trim(name), ''),
  nullif(split_part(lower(email), '@', 1), ''),
  'Riddra user'
)
where name is null
   or trim(name) = '';

-- Backfill username if it is missing.
update public.product_user_profiles
set username = left(
  regexp_replace(
    coalesce(
      nullif(lower(split_part(email, '@', 1)), ''),
      nullif(lower(user_key), '')
    ),
    '[^a-z0-9_]+',
    '_',
    'g'
  ),
  24
)
where username is null
   or trim(username) = '';

-- Normalize empty profile flags and capabilities.
update public.product_user_profiles
set profile_visible = true
where profile_visible is null;

update public.product_user_profiles
set capabilities = '[]'::jsonb
where capabilities is null;

-- Normalize membership tier into the stored slug used by the app.
update public.product_user_profiles
set membership_tier = case
  when membership_tier is null or trim(membership_tier) = '' then membership_tier
  when lower(trim(membership_tier)) = 'free' then 'free'
  when lower(trim(membership_tier)) = 'pro' then 'pro'
  when lower(trim(membership_tier)) in ('pro max', 'pro-max', 'pro_max', 'promax') then 'pro-max'
  else membership_tier
end
where membership_tier is not null;

-- Normalize role values conservatively.
update public.product_user_profiles
set role = case
  when lower(trim(role)) in ('admin', 'editor', 'user') then lower(trim(role))
  else 'user'
end
where role is not null;

-- Ensure the Amit auth row exists in product_user_profiles.
with amit_auth as (
  select id, email
  from auth.users
  where lower(email) = 'amitbhawani@gmail.com'
  limit 1
)
insert into public.product_user_profiles (
  user_key,
  auth_user_id,
  email,
  name,
  username,
  profile_visible,
  membership_tier,
  role,
  capabilities,
  created_at,
  updated_at,
  last_active_at
)
select
  coalesce((select lower(email) from amit_auth), 'amitbhawani@gmail.com'),
  (select id from amit_auth),
  'amitbhawani@gmail.com',
  'Amit Bhawani',
  'amitbhawani',
  true,
  'pro-max',
  'admin',
  '[]'::jsonb,
  now(),
  now(),
  now()
where not exists (
  select 1
  from public.product_user_profiles
  where lower(email) = 'amitbhawani@gmail.com'
);

-- Force the Amit row onto the expected admin + Pro Max path.
with amit_auth as (
  select id, email
  from auth.users
  where lower(email) = 'amitbhawani@gmail.com'
  limit 1
)
update public.product_user_profiles profile
set
  user_key = coalesce(nullif(profile.user_key, ''), lower(profile.email)),
  auth_user_id = coalesce((select id from amit_auth), profile.auth_user_id),
  email = 'amitbhawani@gmail.com',
  name = 'Amit Bhawani',
  username = 'amitbhawani',
  profile_visible = true,
  membership_tier = 'pro-max',
  role = 'admin',
  capabilities = '[]'::jsonb,
  updated_at = now(),
  last_active_at = coalesce(profile.last_active_at, now())
where lower(profile.email) = 'amitbhawani@gmail.com';

-- Unique indexes expected by code paths.
create unique index if not exists product_user_profiles_user_key_unique_idx
  on public.product_user_profiles (user_key);

do $$
begin
  if not exists (
    select 1
    from public.product_user_profiles
    group by lower(email)
    having count(*) > 1
  ) then
    create unique index if not exists product_user_profiles_email_lower_unique_idx
      on public.product_user_profiles (lower(email));
  end if;
end $$;

do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'product_user_profiles'
      and column_name = 'username'
  ) and not exists (
    select 1
    from public.product_user_profiles
    where username is null or trim(username) = ''
  ) and not exists (
    select 1
    from public.product_user_profiles
    group by lower(username)
    having count(*) > 1
  ) then
    create unique index if not exists product_user_profiles_username_lower_unique_idx
      on public.product_user_profiles (lower(username));
  end if;
end $$;

-- Safe not-null tightening after backfill.
do $$
begin
  if not exists (
    select 1
    from public.product_user_profiles
    where user_key is null or trim(user_key) = ''
  ) then
    alter table public.product_user_profiles
      alter column user_key set not null;
  end if;
end $$;

do $$
begin
  if not exists (
    select 1
    from public.product_user_profiles
    where email is null or trim(email) = ''
  ) then
    alter table public.product_user_profiles
      alter column email set not null;
  end if;
end $$;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'product_user_profiles_role_check'
      and conrelid = 'public.product_user_profiles'::regclass
  ) then
    alter table public.product_user_profiles
      add constraint product_user_profiles_role_check
      check (role in ('admin', 'editor', 'user'));
  end if;
end $$;

commit;
