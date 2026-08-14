create table if not exists public.task_updates (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references public.tasks(id) on delete cascade,
  content text not null check (char_length(trim(content)) > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists task_updates_task_id_created_at_idx
  on public.task_updates (task_id, created_at desc);

alter table public.task_updates enable row level security;

comment on table public.task_updates is 'Atualizações textuais das tarefas';

insert into public.task_updates (task_id, content, created_at, updated_at)
select
  tasks.id,
  tasks.content,
  coalesce(tasks.updated_at, tasks.created_at, now()),
  coalesce(tasks.updated_at, tasks.created_at, now())
from public.tasks
where tasks.content is not null
  and char_length(trim(tasks.content)) > 0
  and not exists (
    select 1
    from public.task_updates
    where task_updates.task_id = tasks.id
      and task_updates.content = tasks.content
  );
