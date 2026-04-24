create table if not exists public.billing_customers (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references public.profiles (id) on delete cascade,
  provider text not null default 'razorpay',
  external_customer_id text unique,
  email text,
  phone text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.billing_plans (
  id uuid primary key default gen_random_uuid(),
  provider text not null default 'razorpay',
  code text not null unique,
  name text not null,
  billing_interval text not null default 'monthly',
  amount_inr integer not null,
  currency text not null default 'INR',
  status text not null default 'active',
  external_plan_id text unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.subscription_events (
  id uuid primary key default gen_random_uuid(),
  subscription_id uuid references public.subscriptions (id) on delete cascade,
  provider text not null default 'razorpay',
  provider_event_id text,
  event_name text not null,
  event_status text not null default 'received',
  event_payload jsonb not null default '{}'::jsonb,
  occurred_at timestamptz not null default now(),
  processed_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists subscription_events_subscription_lookup_idx
  on public.subscription_events (subscription_id, occurred_at desc);

create index if not exists subscription_events_name_lookup_idx
  on public.subscription_events (event_name, occurred_at desc);

create table if not exists public.billing_invoices (
  id uuid primary key default gen_random_uuid(),
  subscription_id uuid references public.subscriptions (id) on delete cascade,
  provider text not null default 'razorpay',
  external_invoice_id text unique,
  amount_inr integer not null default 0,
  amount_paid_inr integer not null default 0,
  currency text not null default 'INR',
  invoice_status text not null default 'issued',
  invoice_url text,
  billed_at timestamptz,
  due_at timestamptz,
  paid_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists billing_invoices_subscription_lookup_idx
  on public.billing_invoices (subscription_id, created_at desc);

create table if not exists public.entitlement_audit_log (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  feature_code text not null,
  previous_access_level text,
  next_access_level text not null,
  reason text not null,
  actor_type text not null default 'system',
  actor_ref text,
  created_at timestamptz not null default now()
);

create index if not exists entitlement_audit_log_user_lookup_idx
  on public.entitlement_audit_log (user_id, created_at desc);

alter table public.billing_customers enable row level security;
alter table public.billing_invoices enable row level security;
alter table public.subscription_events enable row level security;
alter table public.entitlement_audit_log enable row level security;

create policy "billing_customers_select_own"
on public.billing_customers
for select
using (auth.uid() = user_id);

create policy "billing_invoices_select_own"
on public.billing_invoices
for select
using (
  exists (
    select 1
    from public.subscriptions
    where public.subscriptions.id = billing_invoices.subscription_id
      and public.subscriptions.user_id = auth.uid()
  )
);

create policy "subscription_events_select_own"
on public.subscription_events
for select
using (
  exists (
    select 1
    from public.subscriptions
    where public.subscriptions.id = subscription_events.subscription_id
      and public.subscriptions.user_id = auth.uid()
  )
);

create policy "entitlement_audit_log_select_own"
on public.entitlement_audit_log
for select
using (auth.uid() = user_id);
