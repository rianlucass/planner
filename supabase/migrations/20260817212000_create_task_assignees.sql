create table if not exists public.task_assignees (
  task_id uuid not null references public.tasks(id) on delete cascade,
  member_id uuid not null references public.members(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (task_id, member_id)
);

create index if not exists task_assignees_member_id_idx
  on public.task_assignees (member_id);

alter table public.task_assignees enable row level security;

comment on table public.task_assignees is
  'Responsáveis atribuídos às tarefas';

create or replace function public.ensure_task_assignee_board_membership()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if not exists (
    select 1
    from public.tasks
    join public.groups on public.groups.id = public.tasks.group_id
    join public.board_members
      on public.board_members.board_id = public.groups.board_id
     and public.board_members.member_id = new.member_id
    where public.tasks.id = new.task_id
  ) then
    raise exception 'O responsável precisa pertencer ao quadro da tarefa.';
  end if;

  return new;
end;
$$;

drop trigger if exists ensure_task_assignee_board_membership_trigger
  on public.task_assignees;

create trigger ensure_task_assignee_board_membership_trigger
before insert or update on public.task_assignees
for each row execute function public.ensure_task_assignee_board_membership();

create or replace function public.remove_board_member_task_assignments()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  delete from public.task_assignees
  using public.tasks, public.groups
  where public.task_assignees.task_id = public.tasks.id
    and public.tasks.group_id = public.groups.id
    and public.groups.board_id = old.board_id
    and public.task_assignees.member_id = old.member_id;

  return old;
end;
$$;

drop trigger if exists remove_board_member_task_assignments_trigger
  on public.board_members;

create trigger remove_board_member_task_assignments_trigger
after delete on public.board_members
for each row execute function public.remove_board_member_task_assignments();
