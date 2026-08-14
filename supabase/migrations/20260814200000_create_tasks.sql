create table if not exists public.tasks (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.groups(id) on delete cascade,
  title text not null check (char_length(trim(title)) > 0),
  position integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists tasks_group_id_position_idx
  on public.tasks (group_id, position);

alter table public.tasks enable row level security;

comment on table public.tasks is 'Tarefas pertencentes aos grupos do planner';
