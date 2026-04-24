alter table if exists public.product_system_settings
  add column if not exists public_head_code text not null default '';

update public.product_system_settings
set public_head_code = ''
where public_head_code is null;
