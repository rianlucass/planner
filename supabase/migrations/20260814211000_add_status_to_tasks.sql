alter table public.tasks
  add column if not exists status_id uuid null;

alter table public.tasks
  drop constraint if exists tasks_status_id_fkey;

alter table public.tasks
  add constraint tasks_status_id_fkey
  foreign key (status_id)
  references public.statuses(id)
  on delete set null;

create index if not exists tasks_status_id_idx
  on public.tasks (status_id);
