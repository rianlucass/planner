create table if not exists public.boards (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(trim(name)) > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.boards enable row level security;

comment on table public.boards is 'Quadros do planner';
