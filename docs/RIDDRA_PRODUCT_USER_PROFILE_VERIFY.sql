-- RIDDRA product_user_profiles verification
-- Returns one final PASS / FAIL row plus the supporting booleans used to compute it.

with required_columns as (
  select unnest(array[
    'id',
    'user_key',
    'auth_user_id',
    'email',
    'name',
    'username',
    'website_url',
    'x_handle',
    'linkedin_url',
    'instagram_handle',
    'youtube_url',
    'profile_visible',
    'membership_tier',
    'role',
    'capabilities',
    'created_at',
    'updated_at',
    'last_active_at'
  ]) as column_name
),
column_check as (
  select
    rc.column_name,
    exists (
      select 1
      from information_schema.columns c
      where c.table_schema = 'public'
        and c.table_name = 'product_user_profiles'
        and c.column_name = rc.column_name
    ) as present
  from required_columns rc
),
amit_row as (
  select *
  from public.product_user_profiles
  where lower(email) = 'amitbhawani@gmail.com'
  limit 1
),
index_check as (
  select
    exists (
      select 1
      from pg_constraint
      where conrelid = 'public.product_user_profiles'::regclass
        and contype = 'u'
        and conname like '%user_key%'
    ) or exists (
      select 1
      from pg_indexes
      where schemaname = 'public'
        and tablename = 'product_user_profiles'
        and indexdef ilike '%(user_key)%'
        and indexdef ilike 'create unique index%'
    ) as user_key_unique_ok,
    exists (
      select 1
      from pg_constraint
      where conrelid = 'public.product_user_profiles'::regclass
        and contype = 'u'
        and conname like '%email%'
    ) or exists (
      select 1
      from pg_indexes
      where schemaname = 'public'
        and tablename = 'product_user_profiles'
        and indexdef ilike '%lower(email)%'
        and indexdef ilike 'create unique index%'
    ) as email_unique_ok,
    exists (
      select 1
      from pg_indexes
      where schemaname = 'public'
        and tablename = 'product_user_profiles'
        and indexdef ilike '%lower(username)%'
        and indexdef ilike 'create unique index%'
    ) as username_unique_ok
),
summary as (
  select
    bool_and(present) as required_columns_present,
    not exists (
      select 1
      from public.product_user_profiles
      where user_key is null or trim(user_key) = ''
    ) as user_key_non_null,
    not exists (
      select 1
      from public.product_user_profiles
      where email is null or trim(email) = ''
    ) as email_non_null,
    exists (select 1 from amit_row) as amit_exists,
    exists (
      select 1
      from amit_row
      where lower(role) = 'admin'
    ) as amit_admin_role_ok,
    exists (
      select 1
      from amit_row
      where lower(replace(replace(coalesce(membership_tier, ''), '_', '-'), ' ', '-')) = 'pro-max'
    ) as amit_pro_max_ok,
    (select user_key_unique_ok from index_check) as user_key_unique_ok,
    (select email_unique_ok from index_check) as email_unique_ok,
    (select username_unique_ok from index_check) as username_unique_ok
  from column_check
)
select
  case
    when required_columns_present
      and user_key_non_null
      and email_non_null
      and amit_exists
      and amit_admin_role_ok
      and amit_pro_max_ok
      and user_key_unique_ok
      and email_unique_ok
      and username_unique_ok
    then 'PASS'
    else 'FAIL'
  end as final_status,
  required_columns_present,
  user_key_non_null,
  email_non_null,
  amit_exists,
  amit_admin_role_ok,
  amit_pro_max_ok,
  user_key_unique_ok,
  email_unique_ok,
  username_unique_ok
from summary;
