create table if not exists public.groups (
  id uuid primary key default gen_random_uuid(),
  board_id uuid not null references public.boards(id) on delete cascade,
  name text not null check (char_length(trim(name)) > 0),
  color text,
  position integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists groups_board_id_position_idx
  on public.groups (board_id, position);

alter table public.groups enable row level security;

comment on table public.groups is 'Grupos pertencentes aos quadros do planner';
