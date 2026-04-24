create table if not exists account_state_snapshots (
  id uuid primary key default gen_random_uuid(),
  user_key text not null,
  user_email text not null,
  lane text not null,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_key, lane)
);

create index if not exists account_state_snapshots_user_key_idx
  on account_state_snapshots (user_key);

create index if not exists account_state_snapshots_lane_idx
  on account_state_snapshots (lane);
