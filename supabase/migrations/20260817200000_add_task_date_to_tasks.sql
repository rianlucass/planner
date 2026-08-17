alter table public.tasks
  add column if not exists task_date date;

comment on column public.tasks.task_date is
  'Dia planejado ou publicado da tarefa, sem horário ou fuso';
