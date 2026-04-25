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
