create table if not exists global_state_snapshots (
  id uuid primary key default gen_random_uuid(),
  lane text not null unique,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists global_state_snapshots_lane_idx
  on global_state_snapshots (lane);
