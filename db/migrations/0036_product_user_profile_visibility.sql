alter table if exists public.product_user_profiles
add column if not exists profile_visible boolean not null default true;
