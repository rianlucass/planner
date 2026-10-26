"use server"

import { revalidatePath } from "next/cache"
import { createSupabaseServerClient } from "@/lib/supabase/server"

export type GroupActionState = { error: string | null; success: boolean }

const failure: GroupActionState = { error: "Não foi possível concluir a operação.", success: false }
const allowedColors = new Set(["#6366f1", "#8b5cf6", "#ec4899", "#f59e0b", "#10b981", "#06b6d4"])

function readText(formData: FormData, field: string) {
  const value = formData.get(field)
  return typeof value === "string" ? value.trim() : ""
}

function validateName(name: string): string | null {
  if (!name) return "Informe o nome do grupo."
  if (name.length > 120) return "O nome deve ter no máximo 120 caracteres."
  return null
}

export async function createGroup(_state: GroupActionState, formData: FormData): Promise<GroupActionState> {
  const boardId = readText(formData, "boardId")
  const name = readText(formData, "name")
  const requestedColor = readText(formData, "color")
  const nameError = validateName(name)
  if (!boardId || nameError) return { error: nameError ?? "Quadro inválido.", success: false }
  const color = allowedColors.has(requestedColor) ? requestedColor : "#6366f1"

  const supabase = createSupabaseServerClient()
  const { data: lastGroup, error: positionError } = await supabase.from("groups").select("position").eq("board_id", boardId).order("position", { ascending: false }).limit(1).maybeSingle()
  if (positionError) {
    console.error("Erro ao calcular posição do grupo:", positionError.message)
    return failure
  }

  const position = (lastGroup?.position ?? -1) + 1
  const { error } = await supabase.from("groups").insert({ board_id: boardId, name, color, position })
  if (error) {
    console.error("Erro ao criar grupo:", error.message)
    return failure
  }

  revalidatePath(`/boards/${boardId}`)
  return { error: null, success: true }
}

export async function updateGroup(_state: GroupActionState, formData: FormData): Promise<GroupActionState> {
  const boardId = readText(formData, "boardId")
  const id = readText(formData, "id")
  const name = readText(formData, "name")
  const nameError = validateName(name)
  if (!boardId || !id || nameError) return { error: nameError ?? "Grupo inválido.", success: false }

  const { error } = await createSupabaseServerClient().from("groups").update({ name, updated_at: new Date().toISOString() }).eq("id", id).eq("board_id", boardId)
  if (error) {
    console.error("Erro ao renomear grupo:", error.message)
    return failure
  }

  revalidatePath(`/boards/${boardId}`)
  return { error: null, success: true }
}

export async function deleteGroup(_state: GroupActionState, formData: FormData): Promise<GroupActionState> {
  const boardId = readText(formData, "boardId")
  const id = readText(formData, "id")
  if (!boardId || !id) return failure

  const { error } = await createSupabaseServerClient().from("groups").delete().eq("id", id).eq("board_id", boardId)
  if (error) {
    console.error("Erro ao excluir grupo:", error.message)
    return failure
  }

  revalidatePath(`/boards/${boardId}`)
  return { error: null, success: true }
}

export async function reorderGroups(input: { boardId: string; groupIds: string[] }): Promise<GroupActionState> {
  const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
  if (!input || typeof input !== "object" || typeof input.boardId !== "string" || !uuid.test(input.boardId) ||
    !Array.isArray(input.groupIds) || input.groupIds.length === 0 ||
    !input.groupIds.every((id) => typeof id === "string" && uuid.test(id)) ||
    new Set(input.groupIds.map((id) => id.toLowerCase())).size !== input.groupIds.length) {
    return { success: false, error: "Ordem dos grupos inválida." }
  }
  try {
    // Validate the board and exact membership under a lock, updating only position.
    const { error } = await createSupabaseServerClient().rpc("reorder_groups", {
      p_board_id: input.boardId,
      p_group_ids: input.groupIds,
    })
    if (error) return { success: false, error: "Não foi possível salvar a ordem. O quadro pode ter sido alterado; tente novamente." }
    // This route is force-dynamic. Revalidation would remount its groups-based key
    // and reset expansion and panels; the next page load already reads fresh data.
    return { success: true, error: null }
  } catch {
    return { success: false, error: "Não foi possível salvar a ordem dos grupos. Tente novamente." }
  }
}
