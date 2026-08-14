"use server"

import { revalidatePath } from "next/cache"
import { createSupabaseServerClient } from "@/lib/supabase/server"

export type TaskActionState = { error: string | null; success: boolean }
export type MoveTaskInput = { boardId: string; taskId: string; sourceGroupId: string; destinationGroupId: string; destinationPosition: number }
export type MoveTaskResult = { error: string | null; success: boolean }

const failure: TaskActionState = { error: "Não foi possível concluir a operação.", success: false }
const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

function readText(formData: FormData, field: string) {
  const value = formData.get(field)
  return typeof value === "string" ? value.trim() : ""
}

function isUuid(value: string) {
  return uuidPattern.test(value)
}

function validateTitle(title: string): string | null {
  if (!title) return "Informe o título da tarefa."
  if (title.length > 200) return "O título deve ter no máximo 200 caracteres."
  return null
}

async function getGroupBoardId(groupId: string): Promise<string | null> {
  const { data, error } = await createSupabaseServerClient().from("groups").select("board_id").eq("id", groupId).maybeSingle()
  if (error) {
    console.error("Erro ao validar grupo da tarefa:", error.message)
    return null
  }
  return data?.board_id ?? null
}

export async function createTask(_state: TaskActionState, formData: FormData): Promise<TaskActionState> {
  const groupId = readText(formData, "groupId")
  const title = readText(formData, "title")
  const titleError = validateTitle(title)
  if (!isUuid(groupId) || titleError) return { error: titleError ?? "Grupo inválido.", success: false }

  const boardId = await getGroupBoardId(groupId)
  if (!boardId) return failure

  const supabase = createSupabaseServerClient()
  const { data: lastTask, error: positionError } = await supabase.from("tasks").select("position").eq("group_id", groupId).order("position", { ascending: false }).limit(1).maybeSingle()
  if (positionError) {
    console.error("Erro ao calcular posição da tarefa:", positionError.message)
    return failure
  }

  const position = (lastTask?.position ?? -1) + 1
  const { error } = await supabase.from("tasks").insert({ group_id: groupId, title, position })
  if (error) {
    console.error("Erro ao criar tarefa:", error.message)
    return failure
  }

  revalidatePath(`/boards/${boardId}`)
  return { error: null, success: true }
}

export async function updateTask(_state: TaskActionState, formData: FormData): Promise<TaskActionState> {
  const groupId = readText(formData, "groupId")
  const taskId = readText(formData, "taskId")
  const title = readText(formData, "title")
  const titleError = validateTitle(title)
  if (!isUuid(groupId) || !isUuid(taskId) || titleError) return { error: titleError ?? "Tarefa inválida.", success: false }

  const boardId = await getGroupBoardId(groupId)
  if (!boardId) return failure

  const { data, error } = await createSupabaseServerClient().from("tasks").update({ title, updated_at: new Date().toISOString() }).eq("id", taskId).eq("group_id", groupId).select("id").maybeSingle()
  if (error || !data) {
    if (error) console.error("Erro ao renomear tarefa:", error.message)
    return failure
  }

  revalidatePath(`/boards/${boardId}`)
  return { error: null, success: true }
}

export async function deleteTask(_state: TaskActionState, formData: FormData): Promise<TaskActionState> {
  const groupId = readText(formData, "groupId")
  const taskId = readText(formData, "taskId")
  if (!isUuid(groupId) || !isUuid(taskId)) return failure

  const boardId = await getGroupBoardId(groupId)
  if (!boardId) return failure

  const { data, error } = await createSupabaseServerClient().from("tasks").delete().eq("id", taskId).eq("group_id", groupId).select("id").maybeSingle()
  if (error || !data) {
    if (error) console.error("Erro ao excluir tarefa:", error.message)
    return failure
  }

  revalidatePath(`/boards/${boardId}`)
  return { error: null, success: true }
}

export async function moveTask(input: MoveTaskInput): Promise<MoveTaskResult> {
  const { boardId, taskId, sourceGroupId, destinationGroupId, destinationPosition } = input
  if (![boardId, taskId, sourceGroupId, destinationGroupId].every(isUuid)) return { error: "Dados de movimentação inválidos.", success: false }
  if (!Number.isInteger(destinationPosition) || destinationPosition < 0) return { error: "Posição de destino inválida.", success: false }

  const supabase = createSupabaseServerClient()
  const groupIds = sourceGroupId === destinationGroupId ? [sourceGroupId] : [sourceGroupId, destinationGroupId]
  const { data: groups, error: groupsError } = await supabase.from("groups").select("id, board_id").in("id", groupIds)
  if (groupsError || groups?.length !== groupIds.length || groups.some((group) => group.board_id !== boardId)) {
    return { error: "Os grupos não pertencem ao quadro informado.", success: false }
  }

  const { data: task, error: taskError } = await supabase.from("tasks").select("id, group_id").eq("id", taskId).maybeSingle()
  if (taskError || !task || task.group_id !== sourceGroupId) return { error: "A tarefa não pertence ao grupo de origem.", success: false }

  const { data: affectedTasks, error: tasksError } = await supabase.from("tasks").select("id, group_id, position").in("group_id", groupIds).order("position", { ascending: true }).order("created_at", { ascending: true })
  if (tasksError || !affectedTasks) return failure

  const sourceTasks = affectedTasks.filter((item) => item.group_id === sourceGroupId)
  const sourceIndex = sourceTasks.findIndex((item) => item.id === taskId)
  if (sourceIndex < 0) return failure

  const originalLayout = affectedTasks.map((item) => ({ id: item.id, group_id: item.group_id, position: item.position }))
  const now = new Date().toISOString()
  let nextLayout: { id: string; group_id: string; position: number }[]

  if (sourceGroupId === destinationGroupId) {
    if (destinationPosition >= sourceTasks.length) return { error: "Posição de destino inválida.", success: false }
    const reordered = [...sourceTasks]
    const [moved] = reordered.splice(sourceIndex, 1)
    reordered.splice(destinationPosition, 0, moved)
    nextLayout = reordered.map((item, position) => ({ id: item.id, group_id: sourceGroupId, position }))
  } else {
    const destinationTasks = affectedTasks.filter((item) => item.group_id === destinationGroupId)
    if (destinationPosition > destinationTasks.length) return { error: "Posição de destino inválida.", success: false }
    const nextSource = sourceTasks.filter((item) => item.id !== taskId)
    const nextDestination = [...destinationTasks]
    nextDestination.splice(destinationPosition, 0, { id: taskId, group_id: destinationGroupId, position: destinationPosition })
    nextLayout = [
      ...nextSource.map((item, position) => ({ id: item.id, group_id: sourceGroupId, position })),
      ...nextDestination.map((item, position) => ({ id: item.id, group_id: destinationGroupId, position })),
    ]
  }

  const results = await Promise.all(nextLayout.map((item) => supabase.from("tasks").update({ group_id: item.group_id, position: item.position, updated_at: now }).eq("id", item.id)))
  const updateError = results.find((result) => result.error)?.error
  if (updateError) {
    console.error("Erro ao mover tarefa:", updateError.message)
    await Promise.all(originalLayout.map((item) => supabase.from("tasks").update({ group_id: item.group_id, position: item.position }).eq("id", item.id)))
    return { error: "Não foi possível salvar a nova posição.", success: false }
  }

  revalidatePath(`/boards/${boardId}`)
  return { error: null, success: true }
}
