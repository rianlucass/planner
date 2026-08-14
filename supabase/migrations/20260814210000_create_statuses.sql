create table if not exists public.statuses (
  id uuid primary key default gen_random_uuid(),
  board_id uuid not null references public.boards(id) on delete cascade,
  name text not null check (char_length(trim(name)) > 0),
  color text not null,
  is_completed boolean not null default false,
  position integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists statuses_board_id_position_idx
  on public.statuses (board_id, position);

alter table public.statuses enable row level security;

comment on table public.statuses is 'Status específicos de cada quadro';
