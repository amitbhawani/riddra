alter table if exists public.product_user_profiles
add column if not exists capabilities jsonb not null default '[]'::jsonb;
