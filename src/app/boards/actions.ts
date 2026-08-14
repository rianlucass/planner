"use server"

import { revalidatePath } from "next/cache"
import { createSupabaseServerClient } from "@/lib/supabase/server"

export type BoardActionState = { error: string | null; success: boolean }

const initialFailure: BoardActionState = { error: "Não foi possível concluir a operação.", success: false }

function readRequiredText(formData: FormData, field: string) {
  const value = formData.get(field)
  return typeof value === "string" ? value.trim() : ""
}

export async function createBoard(_state: BoardActionState, formData: FormData): Promise<BoardActionState> {
  const name = readRequiredText(formData, "name")
  if (!name) return { error: "Informe o nome do quadro.", success: false }
  if (name.length > 120) return { error: "O nome deve ter no máximo 120 caracteres.", success: false }

  const { error } = await createSupabaseServerClient().from("boards").insert({ name })
  if (error) {
    console.error("Erro ao criar quadro:", error.message)
    return initialFailure
  }

  revalidatePath("/boards")
  return { error: null, success: true }
}

export async function updateBoard(_state: BoardActionState, formData: FormData): Promise<BoardActionState> {
  const id = readRequiredText(formData, "id")
  const name = readRequiredText(formData, "name")
  if (!id || !name) return { error: "Informe um nome válido.", success: false }
  if (name.length > 120) return { error: "O nome deve ter no máximo 120 caracteres.", success: false }

  const { error } = await createSupabaseServerClient().from("boards").update({ name, updated_at: new Date().toISOString() }).eq("id", id)
  if (error) {
    console.error("Erro ao renomear quadro:", error.message)
    return initialFailure
  }

  revalidatePath("/boards")
  return { error: null, success: true }
}

export async function deleteBoard(_state: BoardActionState, formData: FormData): Promise<BoardActionState> {
  const id = readRequiredText(formData, "id")
  if (!id) return initialFailure

  const { error } = await createSupabaseServerClient().from("boards").delete().eq("id", id)
  if (error) {
    console.error("Erro ao excluir quadro:", error.message)
    return initialFailure
  }

  revalidatePath("/boards")
  return { error: null, success: true }
}
