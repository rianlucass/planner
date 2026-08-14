"use server"

import { revalidatePath } from "next/cache"
import { createSupabaseServerClient } from "@/lib/supabase/server"
import { statusColors } from "@/lib/status-colors"

export type StatusActionState = { error: string | null; success: boolean }

const failure: StatusActionState = { error: "Não foi possível concluir a operação.", success: false }
const allowedColors = new Set<string>(statusColors)
const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

function readText(formData: FormData, field: string) {
  const value = formData.get(field)
  return typeof value === "string" ? value.trim() : ""
}

function isUuid(value: string) {
  return uuidPattern.test(value)
}

function validateName(name: string): string | null {
  if (!name) return "Informe o nome do status."
  if (name.length > 80) return "O nome deve ter no máximo 80 caracteres."
  return null
}

export async function createStatus(_state: StatusActionState, formData: FormData): Promise<StatusActionState> {
  const boardId = readText(formData, "boardId")
  const name = readText(formData, "name")
  const color = readText(formData, "color")
  const isCompleted = formData.get("isCompleted") === "on"
  const nameError = validateName(name)
  if (!isUuid(boardId) || nameError) return { error: nameError ?? "Quadro inválido.", success: false }
  if (!allowedColors.has(color)) return { error: "Selecione uma cor válida.", success: false }

  const supabase = createSupabaseServerClient()
  const { data: board, error: boardError } = await supabase.from("boards").select("id").eq("id", boardId).maybeSingle()
  if (boardError || !board) return failure

  const { data: lastStatus, error: positionError } = await supabase.from("statuses").select("position").eq("board_id", boardId).order("position", { ascending: false }).limit(1).maybeSingle()
  if (positionError) {
    console.error("Erro ao calcular posição do status:", positionError.message)
    return failure
  }

  const position = (lastStatus?.position ?? -1) + 1
  const { error } = await supabase.from("statuses").insert({ board_id: boardId, name, color, is_completed: isCompleted, position })
  if (error) {
    console.error("Erro ao criar status:", error.message)
    return failure
  }

  revalidatePath(`/boards/${boardId}`)
  return { error: null, success: true }
}

export async function updateStatus(_state: StatusActionState, formData: FormData): Promise<StatusActionState> {
  const boardId = readText(formData, "boardId")
  const statusId = readText(formData, "statusId")
  const name = readText(formData, "name")
  const color = readText(formData, "color")
  const isCompleted = formData.get("isCompleted") === "on"
  const nameError = validateName(name)
  if (!isUuid(boardId) || !isUuid(statusId) || nameError) return { error: nameError ?? "Status inválido.", success: false }
  if (!allowedColors.has(color)) return { error: "Selecione uma cor válida.", success: false }

  const { data, error } = await createSupabaseServerClient().from("statuses").update({ name, color, is_completed: isCompleted, updated_at: new Date().toISOString() }).eq("id", statusId).eq("board_id", boardId).select("id").maybeSingle()
  if (error || !data) {
    if (error) console.error("Erro ao atualizar status:", error.message)
    return failure
  }

  revalidatePath(`/boards/${boardId}`)
  return { error: null, success: true }
}

export async function deleteStatus(_state: StatusActionState, formData: FormData): Promise<StatusActionState> {
  const boardId = readText(formData, "boardId")
  const statusId = readText(formData, "statusId")
  if (!isUuid(boardId) || !isUuid(statusId)) return failure

  const { data, error } = await createSupabaseServerClient().from("statuses").delete().eq("id", statusId).eq("board_id", boardId).select("id").maybeSingle()
  if (error || !data) {
    if (error) console.error("Erro ao excluir status:", error.message)
    return failure
  }

  revalidatePath(`/boards/${boardId}`)
  return { error: null, success: true }
}

export async function updateTaskStatus(_state: StatusActionState, formData: FormData): Promise<StatusActionState> {
  const groupId = readText(formData, "groupId")
  const taskId = readText(formData, "taskId")
  const statusId = readText(formData, "statusId")
  if (!isUuid(groupId) || !isUuid(taskId) || (statusId && !isUuid(statusId))) return failure

  const supabase = createSupabaseServerClient()
  const { data: group, error: groupError } = await supabase.from("groups").select("board_id").eq("id", groupId).maybeSingle()
  if (groupError || !group) return failure

  const { data: task, error: taskError } = await supabase.from("tasks").select("id").eq("id", taskId).eq("group_id", groupId).maybeSingle()
  if (taskError || !task) return failure

  if (statusId) {
    const { data: status, error: statusError } = await supabase.from("statuses").select("id").eq("id", statusId).eq("board_id", group.board_id).maybeSingle()
    if (statusError || !status) return { error: "Este status não pertence ao quadro da tarefa.", success: false }
  }

  const { error } = await supabase.from("tasks").update({ status_id: statusId || null, updated_at: new Date().toISOString() }).eq("id", taskId).eq("group_id", groupId)
  if (error) {
    console.error("Erro ao alterar status da tarefa:", error.message)
    return failure
  }

  revalidatePath(`/boards/${group.board_id}`)
  return { error: null, success: true }
}
