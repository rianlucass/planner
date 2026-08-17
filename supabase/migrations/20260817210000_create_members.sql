create table if not exists public.members (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(trim(name)) between 1 and 120),
  role text check (role is null or char_length(role) <= 120),
  email text check (email is null or char_length(email) <= 254),
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.members enable row level security;

comment on table public.members is
  'Pessoas cadastradas globalmente para organização e atribuição de tarefas';

comment on column public.members.role is
  'Função informativa em texto livre, sem relação com permissões';
