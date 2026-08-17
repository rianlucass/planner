create table if not exists public.board_members (
  board_id uuid not null references public.boards(id) on delete cascade,
  member_id uuid not null references public.members(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (board_id, member_id)
);

create index if not exists board_members_member_id_idx
  on public.board_members (member_id);

alter table public.board_members enable row level security;

comment on table public.board_members is
  'Membros globais que participam de cada quadro';
