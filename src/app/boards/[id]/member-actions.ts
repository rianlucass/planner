"use server"

import { revalidatePath } from "next/cache"

import { createSupabaseServerClient } from "@/lib/supabase/server"

export type MemberMutationResult = { error: string | null; success: boolean }

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

function validIds(...ids: string[]) {
  return ids.every((id) => uuidPattern.test(id))
}

async function validateBoardAndMember(boardId: string, memberId: string) {
  if (!validIds(boardId, memberId)) return false
  const supabase = createSupabaseServerClient()
  const [{ data: board, error: boardError }, { data: member, error: memberError }] = await Promise.all([
    supabase.from("boards").select("id").eq("id", boardId).maybeSingle(),
    supabase.from("members").select("id").eq("id", memberId).maybeSingle(),
  ])
  return !boardError && !memberError && Boolean(board && member)
}

async function getTaskBoard(taskId: string) {
  if (!uuidPattern.test(taskId)) return null
  const supabase = createSupabaseServerClient()
  const { data: task, error: taskError } = await supabase.from("tasks").select("id, group_id").eq("id", taskId).maybeSingle()
  if (taskError || !task) return null
  const { data: group, error: groupError } = await supabase.from("groups").select("board_id").eq("id", task.group_id).maybeSingle()
  return groupError || !group ? null : { taskId: task.id, boardId: group.board_id }
}

export async function addBoardMember(boardId: string, memberId: string): Promise<MemberMutationResult> {
  if (!await validateBoardAndMember(boardId, memberId)) return { error: "Quadro ou membro inválido.", success: false }
  const { error } = await createSupabaseServerClient().from("board_members").upsert({ board_id: boardId, member_id: memberId }, { onConflict: "board_id,member_id", ignoreDuplicates: true })
  if (error) {
    console.error("Erro ao adicionar membro ao quadro:", error.message)
    return { error: "Não foi possível adicionar o membro.", success: false }
  }
  revalidatePath(`/boards/${boardId}`)
  return { error: null, success: true }
}

export async function removeBoardMember(boardId: string, memberId: string): Promise<MemberMutationResult> {
  if (!validIds(boardId, memberId)) return { error: "Quadro ou membro inválido.", success: false }
  const { error } = await createSupabaseServerClient().from("board_members").delete().eq("board_id", boardId).eq("member_id", memberId)
  if (error) {
    console.error("Erro ao remover membro do quadro:", error.message)
    return { error: "Não foi possível remover o membro.", success: false }
  }
  revalidatePath(`/boards/${boardId}`)
  return { error: null, success: true }
}

export async function updateTaskAssignee(boardId: string, taskId: string, memberId: string, selected: boolean): Promise<MemberMutationResult> {
  if (!validIds(boardId, taskId, memberId) || typeof selected !== "boolean") return { error: "Dados de atribuição inválidos.", success: false }
  const task = await getTaskBoard(taskId)
  if (!task || task.boardId !== boardId) return { error: "A tarefa não pertence ao quadro informado.", success: false }

  const supabase = createSupabaseServerClient()
  if (selected) {
    const { data: membership, error: membershipError } = await supabase.from("board_members").select("member_id").eq("board_id", boardId).eq("member_id", memberId).maybeSingle()
    if (membershipError || !membership) return { error: "O responsável precisa pertencer à equipe do quadro.", success: false }
    const { error } = await supabase.from("task_assignees").upsert({ task_id: taskId, member_id: memberId }, { onConflict: "task_id,member_id", ignoreDuplicates: true })
    if (error) {
      console.error("Erro ao atribuir responsável:", error.message)
      return { error: "Não foi possível atribuir o responsável.", success: false }
    }
  } else {
    const { error } = await supabase.from("task_assignees").delete().eq("task_id", taskId).eq("member_id", memberId)
    if (error) {
      console.error("Erro ao remover responsável:", error.message)
      return { error: "Não foi possível remover o responsável.", success: false }
    }
  }

  revalidatePath(`/boards/${boardId}`)
  return { error: null, success: true }
}
