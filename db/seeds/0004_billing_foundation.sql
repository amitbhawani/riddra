insert into public.billing_plans (code, name, billing_interval, amount_inr, status)
values
  ('starter_monthly', 'Starter', 'monthly', 19900, 'draft'),
  ('pro_monthly', 'Pro', 'monthly', 49900, 'draft'),
  ('elite_monthly', 'Elite', 'monthly', 99900, 'active')
on conflict (code) do update
set
  name = excluded.name,
  billing_interval = excluded.billing_interval,
  amount_inr = excluded.amount_inr,
  status = excluded.status,
  updated_at = now();
