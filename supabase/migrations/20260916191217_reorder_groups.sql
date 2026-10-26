-- Reuse groups.position; no task or group metadata is modified.
create or replace function public.reorder_groups(p_board_id uuid, p_group_ids uuid[])
returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare
  actual_ids uuid[];
  affected integer;
begin
  if p_board_id is null or p_group_ids is null
    or cardinality(p_group_ids) = 0
    or array_ndims(p_group_ids) <> 1
    or exists (select 1 from unnest(p_group_ids) id where id is null)
    or (select count(distinct id) from unnest(p_group_ids) id) <> cardinality(p_group_ids) then
    raise exception 'Invalid group order' using errcode = '22023';
  end if;

  -- Serialize reorder requests for this board; also block concurrent FK inserts.
  perform id from public.boards where id = p_board_id for update;
  if not found then
    raise exception 'Board not found' using errcode = '22023';
  end if;

  -- Lock current membership before checking the complete permutation.
  perform id from public.groups where board_id = p_board_id order by id for update;
  select array_agg(id order by id) into actual_ids
    from public.groups where board_id = p_board_id;
  if actual_ids is distinct from (select array_agg(id order by id) from unnest(p_group_ids) id) then
    raise exception 'Group list does not match board membership' using errcode = '22023';
  end if;

  update public.groups as g
    set position = (ordered.ordinality - 1)::integer
    from unnest(p_group_ids) with ordinality as ordered(id, ordinality)
    where g.id = ordered.id and g.board_id = p_board_id;
  get diagnostics affected = row_count;
  if affected <> cardinality(p_group_ids) then
    raise exception 'Could not update every group' using errcode = '22023';
  end if;
end;
$$;

-- Matches the existing server-only Supabase client. Never expose this RPC to browsers.
revoke all on function public.reorder_groups(uuid, uuid[]) from public, anon, authenticated;
grant execute on function public.reorder_groups(uuid, uuid[]) to service_role;
