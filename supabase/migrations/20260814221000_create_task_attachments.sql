create table if not exists public.task_attachments (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references public.tasks(id) on delete cascade,
  storage_path text not null unique,
  original_name text,
  mime_type text not null,
  size_bytes bigint,
  created_at timestamptz not null default now()
);

create index if not exists task_attachments_task_id_created_at_idx
  on public.task_attachments (task_id, created_at);

alter table public.task_attachments enable row level security;

comment on table public.task_attachments is 'Imagens anexadas às tarefas';
