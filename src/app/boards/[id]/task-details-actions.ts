"use server"

import { randomUUID } from "node:crypto"
import { revalidatePath } from "next/cache"

import { createSupabaseServerClient } from "@/lib/supabase/server"

const attachmentBucket = "task-attachments"
const maxFileSize = 5 * 1024 * 1024
const allowedMimeTypes = new Set(["image/jpeg", "image/png", "image/webp"])
const extensionByMimeType: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" }
const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

export type TaskAttachment = { id: string; originalName: string | null; mimeType: string; sizeBytes: number | null; createdAt: string; signedUrl: string }
export type TaskUpdate = { id: string; content: string; createdAt: string; updatedAt: string }
export type TaskDetails = { id: string; title: string; updates: TaskUpdate[]; attachments: TaskAttachment[] }
export type TaskDetailsResult = { data: TaskDetails | null; error: string | null }
export type TaskDetailMutationResult = { success: boolean; error: string | null }
export type UploadAuthorizationResult = { success: boolean; error: string | null; signedUrl?: string; storagePath?: string }
export type AttachmentMutationResult = { success: boolean; error: string | null; attachment?: TaskAttachment }
export type TaskUpdateMutationResult = { success: boolean; error: string | null; update?: TaskUpdate }

type TaskRecord = { id: string; title: string; content: string | null; group_id: string }

function isUuid(value: string) {
  return uuidPattern.test(value)
}

async function getTaskForBoard(taskId: string, boardId: string): Promise<TaskRecord | null> {
  if (!isUuid(taskId) || !isUuid(boardId)) return null
  const supabase = createSupabaseServerClient()
  const { data: task, error: taskError } = await supabase.from("tasks").select("id, title, content, group_id").eq("id", taskId).maybeSingle()
  if (taskError || !task) return null
  const { data: group, error: groupError } = await supabase.from("groups").select("id").eq("id", task.group_id).eq("board_id", boardId).maybeSingle()
  return groupError || !group ? null : task
}

function validateFile(mimeType: string, sizeBytes: number) {
  if (!allowedMimeTypes.has(mimeType)) return "Envie somente imagens JPEG, PNG ou WebP."
  if (!Number.isInteger(sizeBytes) || sizeBytes <= 0 || sizeBytes > maxFileSize) return "A imagem deve ter no máximo 5 MB."
  return null
}

function safeFileStem(originalName: string) {
  const withoutExtension = originalName.replace(/\.[^.]+$/, "")
  const normalized = withoutExtension.normalize("NFKD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-zA-Z0-9_-]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 60)
  return normalized || "imagem"
}

export async function getTaskDetails(boardId: string, taskId: string): Promise<TaskDetailsResult> {
  const task = await getTaskForBoard(taskId, boardId)
  if (!task) return { data: null, error: "Tarefa não encontrada neste quadro." }

  const supabase = createSupabaseServerClient()
  const [{ data: updates, error: updatesError }, { data: attachments, error: attachmentsError }] = await Promise.all([
    supabase.from("task_updates").select("id, content, created_at, updated_at").eq("task_id", taskId).order("created_at", { ascending: false }),
    supabase.from("task_attachments").select("id, storage_path, original_name, mime_type, size_bytes, created_at").eq("task_id", taskId).order("created_at", { ascending: false }),
  ])
  if (updatesError || attachmentsError) {
    if (updatesError) console.error("Erro ao carregar atualizações:", updatesError.message)
    if (attachmentsError) console.error("Erro ao carregar anexos:", attachmentsError.message)
    return { data: null, error: "Não foi possível carregar os detalhes da tarefa." }
  }

  const paths = (attachments ?? []).map((attachment) => attachment.storage_path)
  const signedUrlByPath = new Map<string, string>()
  if (paths.length > 0) {
    const { data: signedUrls, error: signedError } = await supabase.storage.from(attachmentBucket).createSignedUrls(paths, 3600)
    if (signedError) {
      console.error("Erro ao assinar anexos:", signedError.message)
      return { data: null, error: "Não foi possível carregar as imagens anexadas." }
    }
    for (const item of signedUrls ?? []) if (item.path && item.signedUrl) signedUrlByPath.set(item.path, item.signedUrl)
  }

  return {
    data: {
      id: task.id,
      title: task.title,
      updates: (updates ?? []).map((update) => ({ id: update.id, content: update.content, createdAt: update.created_at, updatedAt: update.updated_at })),
      attachments: (attachments ?? []).flatMap((attachment) => {
        const signedUrl = signedUrlByPath.get(attachment.storage_path)
        return signedUrl ? [{ id: attachment.id, originalName: attachment.original_name, mimeType: attachment.mime_type, sizeBytes: attachment.size_bytes, createdAt: attachment.created_at, signedUrl }] : []
      }),
    },
    error: null,
  }
}

export async function createTaskUpdate(boardId: string, taskId: string, content: string): Promise<TaskUpdateMutationResult> {
  const task = await getTaskForBoard(taskId, boardId)
  if (!task) return { success: false, error: "Tarefa não encontrada neste quadro." }
  if (typeof content !== "string") return { success: false, error: "Conteúdo inválido." }
  const normalizedContent = content.trim()
  if (!normalizedContent) return { success: false, error: "Escreva o conteúdo da atualização." }
  if (normalizedContent.length > 500_000) return { success: false, error: "A atualização deve ter no máximo 500 mil caracteres." }

  const { data, error } = await createSupabaseServerClient().from("task_updates").insert({ task_id: taskId, content: normalizedContent }).select("id, content, created_at, updated_at").single()
  if (error) {
    console.error("Erro ao criar atualização:", error.message)
    return { success: false, error: "Não foi possível adicionar a atualização." }
  }
  revalidatePath(`/boards/${boardId}`)
  return { success: true, error: null, update: { id: data.id, content: data.content, createdAt: data.created_at, updatedAt: data.updated_at } }
}

export async function deleteTaskUpdate(boardId: string, taskId: string, updateId: string): Promise<TaskDetailMutationResult> {
  const task = await getTaskForBoard(taskId, boardId)
  if (!task || !isUuid(updateId)) return { success: false, error: "Atualização inválida." }

  const { data, error } = await createSupabaseServerClient().from("task_updates").delete().eq("id", updateId).eq("task_id", taskId).select("id").maybeSingle()
  if (error || !data) {
    if (error) console.error("Erro ao excluir atualização:", error.message)
    return { success: false, error: "Não foi possível excluir a atualização." }
  }
  return { success: true, error: null }
}

export async function authorizeTaskAttachmentUpload(boardId: string, taskId: string, originalName: string, mimeType: string, sizeBytes: number): Promise<UploadAuthorizationResult> {
  const task = await getTaskForBoard(taskId, boardId)
  if (!task) return { success: false, error: "Tarefa não encontrada neste quadro." }
  const fileError = validateFile(mimeType, sizeBytes)
  if (fileError) return { success: false, error: fileError }
  if (!originalName || originalName.length > 255) return { success: false, error: "Nome de arquivo inválido." }

  const extension = extensionByMimeType[mimeType]
  const storagePath = `${boardId}/${taskId}/${randomUUID()}-${safeFileStem(originalName)}.${extension}`
  const { data, error } = await createSupabaseServerClient().storage.from(attachmentBucket).createSignedUploadUrl(storagePath, { upsert: false })
  if (error) {
    console.error("Erro ao autorizar upload:", error.message)
    return { success: false, error: "Não foi possível autorizar o upload." }
  }
  return { success: true, error: null, signedUrl: data.signedUrl, storagePath }
}

export async function confirmTaskAttachmentUpload(boardId: string, taskId: string, storagePath: string, originalName: string): Promise<AttachmentMutationResult> {
  const task = await getTaskForBoard(taskId, boardId)
  if (!task) return { success: false, error: "Tarefa não encontrada neste quadro." }
  const expectedPrefix = `${boardId}/${taskId}/`
  if (!storagePath.startsWith(expectedPrefix) || !originalName || originalName.length > 255) return { success: false, error: "Dados do anexo inválidos." }

  const supabase = createSupabaseServerClient()
  const { data: fileInfo, error: infoError } = await supabase.storage.from(attachmentBucket).info(storagePath)
  if (infoError || !fileInfo) return { success: false, error: "O arquivo enviado não foi encontrado." }
  const mimeType = fileInfo.contentType ?? ""
  const sizeBytes = fileInfo.size ?? 0
  const fileError = validateFile(mimeType, sizeBytes)
  if (fileError) {
    await supabase.storage.from(attachmentBucket).remove([storagePath])
    return { success: false, error: fileError }
  }

  const { data: attachment, error } = await supabase.from("task_attachments").insert({ task_id: taskId, storage_path: storagePath, original_name: originalName, mime_type: mimeType, size_bytes: sizeBytes }).select("id, original_name, mime_type, size_bytes, created_at").single()
  if (error) {
    console.error("Erro ao registrar anexo:", error.message)
    await supabase.storage.from(attachmentBucket).remove([storagePath])
    return { success: false, error: "Não foi possível registrar o anexo." }
  }

  const { data: signed, error: signedError } = await supabase.storage.from(attachmentBucket).createSignedUrl(storagePath, 3600)
  if (signedError) return { success: false, error: "Anexo salvo, mas não foi possível gerar a visualização." }
  return { success: true, error: null, attachment: { id: attachment.id, originalName: attachment.original_name, mimeType: attachment.mime_type, sizeBytes: attachment.size_bytes, createdAt: attachment.created_at, signedUrl: signed.signedUrl } }
}

export async function deleteTaskAttachment(boardId: string, taskId: string, attachmentId: string): Promise<TaskDetailMutationResult> {
  const task = await getTaskForBoard(taskId, boardId)
  if (!task || !isUuid(attachmentId)) return { success: false, error: "Anexo inválido." }

  const supabase = createSupabaseServerClient()
  const { data: attachment, error: findError } = await supabase.from("task_attachments").select("id, storage_path").eq("id", attachmentId).eq("task_id", taskId).maybeSingle()
  if (findError || !attachment) return { success: false, error: "Anexo não encontrado." }

  const { error: storageError } = await supabase.storage.from(attachmentBucket).remove([attachment.storage_path])
  if (storageError) {
    console.error("Erro ao excluir arquivo:", storageError.message)
    return { success: false, error: "Não foi possível excluir o arquivo." }
  }
  const { error } = await supabase.from("task_attachments").delete().eq("id", attachmentId).eq("task_id", taskId)
  if (error) {
    console.error("Erro ao excluir registro do anexo:", error.message)
    return { success: false, error: "O arquivo foi removido, mas o registro não pôde ser excluído." }
  }
  return { success: true, error: null }
}
