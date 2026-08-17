"use server"

import { revalidatePath } from "next/cache"

import { createSupabaseServerClient } from "@/lib/supabase/server"

export type MemberActionState = { error: string | null; success: boolean }

const initialFailure: MemberActionState = { error: "Não foi possível concluir a operação.", success: false }
const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function readText(formData: FormData, field: string) {
  const value = formData.get(field)
  return typeof value === "string" ? value.trim() : ""
}

function optionalText(value: string) {
  return value || null
}

function validateMember(name: string, role: string, email: string) {
  if (!name) return "Informe o nome do membro."
  if (name.length > 120) return "O nome deve ter no máximo 120 caracteres."
  if (role.length > 120) return "A função deve ter no máximo 120 caracteres."
  if (email.length > 254) return "O e-mail deve ter no máximo 254 caracteres."
  if (email && !emailPattern.test(email)) return "Informe um e-mail válido."
  return null
}

function revalidateMemberBoards(boardIds: string[]) {
  for (const boardId of new Set(boardIds)) revalidatePath(`/boards/${boardId}`)
}

export async function createMember(_state: MemberActionState, formData: FormData): Promise<MemberActionState> {
  const name = readText(formData, "name")
  const role = readText(formData, "role")
  const email = readText(formData, "email").toLocaleLowerCase("pt-BR")
  const boardId = readText(formData, "boardId")
  const validationError = validateMember(name, role, email)
  if (validationError) return { error: validationError, success: false }
  if (boardId && !uuidPattern.test(boardId)) return { error: "Quadro inválido.", success: false }

  const supabase = createSupabaseServerClient()
  if (boardId) {
    const { data: board, error: boardError } = await supabase.from("boards").select("id").eq("id", boardId).maybeSingle()
    if (boardError || !board) return { error: "Quadro não encontrado.", success: false }
  }

  const { data: member, error } = await supabase.from("members").insert({ name, role: optionalText(role), email: optionalText(email) }).select("id").single()
  if (error) {
    console.error("Erro ao criar membro:", error.message)
    return initialFailure
  }

  if (boardId) {
    const { error: linkError } = await supabase.from("board_members").insert({ board_id: boardId, member_id: member.id })
    if (linkError) {
      console.error("Erro ao adicionar novo membro ao quadro:", linkError.message)
      await supabase.from("members").delete().eq("id", member.id)
      return { error: "Não foi possível adicionar o membro ao quadro.", success: false }
    }
    revalidatePath(`/boards/${boardId}`)
  }

  revalidatePath("/equipe")
  return { error: null, success: true }
}

export async function updateMember(_state: MemberActionState, formData: FormData): Promise<MemberActionState> {
  const memberId = readText(formData, "memberId")
  const name = readText(formData, "name")
  const role = readText(formData, "role")
  const email = readText(formData, "email").toLocaleLowerCase("pt-BR")
  const validationError = validateMember(name, role, email)
  if (!uuidPattern.test(memberId)) return { error: "Membro inválido.", success: false }
  if (validationError) return { error: validationError, success: false }

  const supabase = createSupabaseServerClient()
  const { data: links, error: linksError } = await supabase.from("board_members").select("board_id").eq("member_id", memberId)
  if (linksError) {
    console.error("Erro ao localizar quadros do membro:", linksError.message)
    return initialFailure
  }

  const { data, error } = await supabase.from("members").update({ name, role: optionalText(role), email: optionalText(email), updated_at: new Date().toISOString() }).eq("id", memberId).select("id").maybeSingle()
  if (error || !data) {
    if (error) console.error("Erro ao atualizar membro:", error.message)
    return { error: "Membro não encontrado.", success: false }
  }

  revalidatePath("/equipe")
  revalidateMemberBoards((links ?? []).map((link) => link.board_id))
  return { error: null, success: true }
}

export async function deleteMember(_state: MemberActionState, formData: FormData): Promise<MemberActionState> {
  const memberId = readText(formData, "memberId")
  if (!uuidPattern.test(memberId)) return { error: "Membro inválido.", success: false }

  const supabase = createSupabaseServerClient()
  const { data: links, error: linksError } = await supabase.from("board_members").select("board_id").eq("member_id", memberId)
  if (linksError) {
    console.error("Erro ao localizar vínculos do membro:", linksError.message)
    return initialFailure
  }

  const { data, error } = await supabase.from("members").delete().eq("id", memberId).select("id").maybeSingle()
  if (error || !data) {
    if (error) console.error("Erro ao excluir membro:", error.message)
    return { error: "Membro não encontrado.", success: false }
  }

  revalidatePath("/equipe")
  revalidateMemberBoards((links ?? []).map((link) => link.board_id))
  return { error: null, success: true }
}
