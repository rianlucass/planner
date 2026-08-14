alter table public.tasks
  add column if not exists content text null;
