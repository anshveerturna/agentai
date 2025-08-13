-- Enable Row Level Security
alter table if exists agents disable row level security;
drop table if exists agents;

create table agents (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null,
  name text not null,
  description text,
  created_at timestamp default now(),
  updated_at timestamp default now()
);

-- Enable RLS (recommended for multi-tenant)
alter table agents enable row level security;
