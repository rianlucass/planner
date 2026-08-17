import Link from "next/link"
import { notFound } from "next/navigation"
import { ArrowLeft, Layers3 } from "lucide-react"

import { NewGroupDialog } from "@/components/groups/group-controls"
import { ManageBoardMembersDialog } from "@/components/members/board-members-dialog"
import { TaskDndBoard } from "@/components/tasks/task-dnd-board"
import { ManageStatusesDialog, type BoardStatus } from "@/components/statuses/status-controls"
import { Button } from "@/components/ui/button"
import { createSupabaseServerClient } from "@/lib/supabase/server"
import type { Member } from "@/lib/members"

export const dynamic = "force-dynamic"

type Board = { id: string; name: string }
type Task = { id: string; title: string; position: number; status_id: string | null; task_date: string | null; assignee_ids: string[] }
type Group = { id: string; name: string; color: string | null; position: number; tasks: Task[] }
type TaskRow = Omit<Task, "assignee_ids"> & { task_assignees: { member_id: string }[] | null }
type GroupRow = Omit<Group, "tasks"> & { tasks: TaskRow[] | null }

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

async function getBoard(id: string): Promise<Board | null> {
  const { data, error } = await createSupabaseServerClient().from("boards").select("id, name").eq("id", id).maybeSingle()
  if (error) throw new Error("Não foi possível carregar o quadro.")
  return data
}

async function getGroups(boardId: string): Promise<{ groups: Group[]; error: boolean }> {
  const { data, error } = await createSupabaseServerClient().from("groups").select("id, name, color, position, tasks(id, title, position, status_id, task_date, task_assignees(member_id))").eq("board_id", boardId).order("position", { ascending: true }).order("created_at", { ascending: true }).order("position", { referencedTable: "tasks", ascending: true })
  if (error) {
    console.error("Erro ao carregar grupos:", error.message)
    return { groups: [], error: true }
  }
  const rows = (data ?? []) as GroupRow[]
  return { groups: rows.map((group) => ({ ...group, tasks: (group.tasks ?? []).map((task) => ({ id: task.id, title: task.title, position: task.position, status_id: task.status_id, task_date: task.task_date, assignee_ids: (task.task_assignees ?? []).map((assignee) => assignee.member_id) })) })), error: false }
}

async function getStatuses(boardId: string): Promise<{ statuses: BoardStatus[]; error: boolean }> {
  const { data, error } = await createSupabaseServerClient().from("statuses").select("id, name, color, is_completed, position").eq("board_id", boardId).order("position", { ascending: true }).order("created_at", { ascending: true })
  if (error) {
    console.error("Erro ao carregar status:", error.message)
    return { statuses: [], error: true }
  }
  return { statuses: data ?? [], error: false }
}

async function getBoardTeam(boardId: string): Promise<{ members: Member[]; memberIds: string[]; error: boolean }> {
  const supabase = createSupabaseServerClient()
  const [{ data: members, error: membersError }, { data: links, error: linksError }] = await Promise.all([
    supabase.from("members").select("id, name, role, email, avatar_url").order("name", { ascending: true }).order("created_at", { ascending: true }),
    supabase.from("board_members").select("member_id").eq("board_id", boardId),
  ])
  if (membersError || linksError) {
    if (membersError) console.error("Erro ao carregar membros:", membersError.message)
    if (linksError) console.error("Erro ao carregar equipe do quadro:", linksError.message)
    return { members: [], memberIds: [], error: true }
  }
  return { members: members ?? [], memberIds: (links ?? []).map((link) => link.member_id), error: false }
}

export default async function BoardPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  if (!uuidPattern.test(id)) notFound()
  const board = await getBoard(id)
  if (!board) notFound()
  const [{ groups, error: groupsError }, { statuses, error: statusesError }, { members, memberIds, error: membersError }] = await Promise.all([getGroups(board.id), getStatuses(board.id), getBoardTeam(board.id)])
  const error = groupsError || statusesError || membersError

  return (
    <>
      <header className="flex min-w-0 max-w-full flex-col gap-5">
        <Button variant="ghost" size="sm" render={<Link href="/boards" className="w-fit" />}><ArrowLeft />Voltar para Quadros</Button>
        <div className="flex min-w-0 max-w-full flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div className="min-w-0 max-w-full sm:flex-1"><p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-primary">Quadro</p><h1 className="mt-1 max-w-full break-words text-2xl font-semibold tracking-tight sm:text-3xl">{board.name}</h1><p className="mt-1.5 max-w-full break-words text-sm text-muted-foreground">Organize o trabalho em grupos dentro deste quadro.</p></div>
          <div className="grid w-full min-w-0 grid-cols-1 gap-2 min-[400px]:grid-cols-2 sm:flex sm:w-auto sm:shrink-0 sm:flex-nowrap"><ManageBoardMembersDialog boardId={board.id} members={members} memberIds={memberIds} /><ManageStatusesDialog boardId={board.id} statuses={statuses} /><NewGroupDialog boardId={board.id} /></div>
        </div>
      </header>

      {error ? (
        <section className="rounded-xl border border-destructive/30 bg-destructive/5 p-5"><h2 className="text-sm font-semibold">Não foi possível carregar o quadro completo</h2><p className="mt-1 text-sm text-muted-foreground">Confirme se as migrations de Status, Data, Equipe e Responsáveis foram executadas no Supabase.</p></section>
      ) : groups.length === 0 ? (
        <section className="flex min-h-52 flex-col items-center justify-center rounded-xl border border-dashed bg-card/50 p-6 text-center"><div className="grid size-10 place-items-center rounded-xl border bg-background"><Layers3 className="size-5 text-primary" /></div><h2 className="mt-4 text-sm font-semibold">Nenhum grupo criado</h2><p className="mt-1 max-w-sm text-xs leading-5 text-muted-foreground">Crie o primeiro grupo para preparar a estrutura deste quadro.</p><div className="mt-4"><NewGroupDialog boardId={board.id} /></div></section>
      ) : (
        <TaskDndBoard key={JSON.stringify(groups)} boardId={board.id} groups={groups} statuses={statuses} members={members} boardMemberIds={memberIds} />
      )}
    </>
  )
}
