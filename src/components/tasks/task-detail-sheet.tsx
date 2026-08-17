"use client"

import Image from "next/image"
import { useRef, useState } from "react"
import { ImageIcon, Loader2, MoreHorizontal, Paperclip, Plus, Trash2, Upload } from "lucide-react"

import { authorizeTaskAttachmentUpload, confirmTaskAttachmentUpload, createTaskUpdate, deleteTaskAttachment, deleteTaskUpdate, getTaskDetails, type TaskAttachment, type TaskDetails, type TaskUpdate } from "@/app/boards/[id]/task-details-actions"
import { Button } from "@/components/ui/button"
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { TaskAssigneePicker } from "@/components/tasks/task-assignee-picker"
import { TaskDatePicker } from "@/components/tasks/task-date-picker"
import { TaskUpdateEditor, TaskUpdateRichContent } from "@/components/tasks/task-update-editor"
import type { Member } from "@/lib/members"
import { emptyTaskUpdateDocument, type TaskUpdateComposerValue } from "@/lib/task-update-content"

const allowedMimeTypes = new Set(["image/jpeg", "image/png", "image/webp"])
const maxFileSize = 5 * 1024 * 1024
const panelWidthKey = "planner-task-panel-width"
const signedImageLoader = ({ src }: { src: string }) => src

function formatSize(size: number | null) {
  if (!size) return ""
  return size < 1024 * 1024 ? `${Math.round(size / 1024)} KB` : `${(size / 1024 / 1024).toFixed(1)} MB`
}

function formatUpdateDate(value: string) {
  return new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }).format(new Date(value)).replace(",", " •")
}

function LegacyUpdateContent({ content }: { content: string }) {
  const parts = content.split(/(https?:\/\/[^\s]+)/g)
  return <p className="max-w-full whitespace-pre-wrap break-words text-sm leading-6">{parts.map((part, index) => /^https?:\/\//.test(part) ? <a key={`${part}-${index}`} href={part} target="_blank" rel="noopener noreferrer" className="break-all text-primary underline underline-offset-2 hover:opacity-80">{part}</a> : part)}</p>
}

const emptyComposer: TaskUpdateComposerValue = { document: emptyTaskUpdateDocument, text: "", isEmpty: true }

export function TaskDetailSheet({ boardId, taskId, title, taskDate, onTaskDateChange, members, allMembers, boardMemberIds, assigneeIds, onAssigneeIdsChange }: { boardId: string; taskId: string; title: string; taskDate: string | null; onTaskDateChange: (value: string | null) => void; members: Member[]; allMembers: Member[]; boardMemberIds: string[]; assigneeIds: string[]; onAssigneeIdsChange: (value: string[]) => void }) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [details, setDetails] = useState<TaskDetails | null>(null)
  const [composer, setComposer] = useState<TaskUpdateComposerValue>(emptyComposer)
  const [editorVersion, setEditorVersion] = useState(0)
  const [addingUpdate, setAddingUpdate] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [preview, setPreview] = useState<TaskAttachment | null>(null)
  const [deleteAttachmentTarget, setDeleteAttachmentTarget] = useState<TaskAttachment | null>(null)
  const [deleteUpdateTarget, setDeleteUpdateTarget] = useState<TaskUpdate | null>(null)
  const [panelWidth, setPanelWidth] = useState(0)
  const [mobile, setMobile] = useState(false)
  const [resizing, setResizing] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const resizeStartRef = useRef({ x: 0, width: 0 })
  const panelWidthRef = useRef(0)
  const dirty = !composer.isEmpty

  function preparePanelWidth() {
    const viewportWidth = window.innerWidth
    const isMobile = viewportWidth < 640
    setMobile(isMobile)
    if (isMobile) return
    const storedWidth = Number(window.localStorage.getItem(panelWidthKey))
    const initialWidth = Number.isFinite(storedWidth) && storedWidth > 0 ? storedWidth : viewportWidth * 0.55
    const width = Math.round(Math.min(Math.max(initialWidth, 420), viewportWidth * 0.8))
    panelWidthRef.current = width
    setPanelWidth(width)
  }

  async function openSheet() {
    preparePanelWidth()
    setOpen(true)
    setLoading(true)
    setError(null)
    setComposer(emptyComposer)
    setEditorVersion((current) => current + 1)
    const result = await getTaskDetails(boardId, taskId)
    setLoading(false)
    if (!result.data) {
      setError(result.error ?? "Não foi possível carregar a tarefa.")
      return
    }
    setDetails(result.data)
  }

  function changeOpen(nextOpen: boolean) {
    if (!nextOpen && dirty && !window.confirm("Existe uma atualização ainda não publicada. Deseja fechar mesmo assim?")) return
    setOpen(nextOpen)
  }

  async function addUpdate() {
    if (composer.isEmpty) return
    setAddingUpdate(true)
    setError(null)
    const result = await createTaskUpdate(boardId, taskId, composer.document)
    setAddingUpdate(false)
    if (!result.success || !result.update) {
      setError(result.error ?? "Não foi possível adicionar a atualização.")
      return
    }
    setDetails((current) => current ? { ...current, updates: [result.update as TaskUpdate, ...current.updates] } : current)
    setComposer(emptyComposer)
    setEditorVersion((current) => current + 1)
  }

  function validateFile(file: File) {
    if (!allowedMimeTypes.has(file.type)) return "Envie somente imagens JPEG, PNG ou WebP."
    if (file.size <= 0 || file.size > maxFileSize) return "Cada imagem deve ter no máximo 5 MB."
    return null
  }

  async function uploadFiles(files: File[]) {
    if (files.length === 0) return
    setUploading(true)
    setError(null)
    for (const file of files) {
      const validationError = validateFile(file)
      if (validationError) {
        setError(validationError)
        continue
      }
      const authorization = await authorizeTaskAttachmentUpload(boardId, taskId, file.name || "imagem", file.type, file.size)
      if (!authorization.success || !authorization.signedUrl || !authorization.storagePath) {
        setError(authorization.error ?? "Não foi possível autorizar o upload.")
        continue
      }
      const body = new FormData()
      body.append("cacheControl", "3600")
      body.append("", file)
      const response = await fetch(authorization.signedUrl, { method: "PUT", headers: { "x-upsert": "false" }, body })
      if (!response.ok) {
        setError("Não foi possível enviar a imagem ao Storage.")
        continue
      }
      const confirmation = await confirmTaskAttachmentUpload(boardId, taskId, authorization.storagePath, file.name || "imagem")
      if (!confirmation.success || !confirmation.attachment) {
        setError(confirmation.error ?? "Não foi possível registrar a imagem.")
        continue
      }
      setDetails((current) => current ? { ...current, attachments: [confirmation.attachment as TaskAttachment, ...current.attachments] } : current)
    }
    setUploading(false)
    if (fileInputRef.current) fileInputRef.current.value = ""
  }

  async function removeAttachment() {
    if (!deleteAttachmentTarget) return
    const result = await deleteTaskAttachment(boardId, taskId, deleteAttachmentTarget.id)
    if (!result.success) {
      setError(result.error)
      return
    }
    setDetails((current) => current ? { ...current, attachments: current.attachments.filter((attachment) => attachment.id !== deleteAttachmentTarget.id) } : current)
    setDeleteAttachmentTarget(null)
  }

  async function removeUpdate() {
    if (!deleteUpdateTarget) return
    const result = await deleteTaskUpdate(boardId, taskId, deleteUpdateTarget.id)
    if (!result.success) {
      setError(result.error)
      return
    }
    setDetails((current) => current ? { ...current, updates: current.updates.filter((update) => update.id !== deleteUpdateTarget.id) } : current)
    setDeleteUpdateTarget(null)
  }

  function changeTaskDate(value: string | null) {
    onTaskDateChange(value)
    setDetails((current) => current ? { ...current, taskDate: value } : current)
  }

  function changeAssignees(value: string[]) {
    onAssigneeIdsChange(value)
    setDetails((current) => current ? { ...current, assigneeIds: value } : current)
  }

  function startResize(event: React.PointerEvent<HTMLDivElement>) {
    if (mobile) return
    event.currentTarget.setPointerCapture(event.pointerId)
    resizeStartRef.current = { x: event.clientX, width: panelWidthRef.current }
    setResizing(true)
  }

  function resizePanel(event: React.PointerEvent<HTMLDivElement>) {
    if (!resizing) return
    const nextWidth = resizeStartRef.current.width + (resizeStartRef.current.x - event.clientX)
    const width = Math.round(Math.min(Math.max(nextWidth, 420), window.innerWidth * 0.8))
    panelWidthRef.current = width
    setPanelWidth(width)
  }

  function finishResize(event: React.PointerEvent<HTMLDivElement>) {
    if (!resizing) return
    setResizing(false)
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId)
    window.localStorage.setItem(panelWidthKey, String(panelWidthRef.current))
  }

  return (
    <>
      <button type="button" onClick={() => void openSheet()} className="min-w-0 truncate px-1 text-left font-medium underline-offset-2 hover:text-primary hover:underline" title={title}>{title}</button>
      <Sheet open={open} onOpenChange={changeOpen}>
        <SheetContent side="right" className="w-full min-w-0 max-w-[100dvw] gap-0 overflow-x-hidden p-0 transition-[transform,opacity] sm:max-w-none" style={{ width: mobile ? "100dvw" : panelWidth || "55vw", minWidth: mobile ? 0 : 420, maxWidth: mobile ? "100dvw" : "80vw" }}>
          <div role="separator" aria-label="Redimensionar painel" aria-orientation="vertical" onPointerDown={startResize} onPointerMove={resizePanel} onPointerUp={finishResize} onPointerCancel={finishResize} className="absolute inset-y-0 left-0 z-20 hidden w-2 -translate-x-1/2 touch-none cursor-ew-resize items-center justify-center sm:flex"><span className="h-12 w-0.5 rounded-full bg-border transition-colors hover:bg-primary" /></div>
          <SheetHeader className="min-w-0 max-w-full border-b px-4 py-4 pr-14 sm:px-5">
            <SheetTitle className="max-w-full break-words text-base leading-snug font-semibold">{details?.title ?? title}</SheetTitle>
            <SheetDescription className="max-w-full break-words">Atualizações e imagens relacionadas a esta tarefa.</SheetDescription>
            <div className="mt-1 flex min-w-0 max-w-full flex-wrap gap-2"><TaskDatePicker boardId={boardId} taskId={taskId} value={details ? details.taskDate : taskDate} onChange={changeTaskDate} variant="property" /><TaskAssigneePicker boardId={boardId} taskId={taskId} members={members} allMembers={allMembers} boardMemberIds={boardMemberIds} value={details ? details.assigneeIds : assigneeIds} onChange={changeAssignees} variant="property" /></div>
          </SheetHeader>

          <div className="min-w-0 max-w-full flex-1 overflow-y-auto p-4 sm:p-5">
            {loading ? (
              <div className="flex min-h-52 items-center justify-center text-muted-foreground"><Loader2 className="mr-2 size-4 animate-spin" />Carregando detalhes...</div>
            ) : details ? (
              <div className="grid min-w-0 max-w-full gap-8">
                <section className="grid min-w-0 max-w-full gap-3">
                  <div><h3 className="text-sm font-semibold">Nova atualização</h3><p className="mt-0.5 text-xs text-muted-foreground">Adicione um roteiro, observação, link ou referência.</p></div>
                  <TaskUpdateEditor key={editorVersion} onChange={setComposer} onPasteImages={(files) => void uploadFiles(files)} disabled={addingUpdate} />
                  <div className="flex min-w-0 max-w-full flex-col gap-3 min-[420px]:flex-row min-[420px]:items-center min-[420px]:justify-between"><p className="min-w-0 break-words text-[11px] text-muted-foreground">Cole uma imagem com Ctrl+V para enviá-la aos Anexos.</p><Button className="w-full min-[420px]:w-auto" size="sm" onClick={() => void addUpdate()} disabled={composer.isEmpty || addingUpdate}>{addingUpdate ? <Loader2 className="animate-spin" /> : <Plus />}Adicionar atualização</Button></div>
                </section>

                <section className="grid min-w-0 max-w-full gap-3">
                  <div><h3 className="text-sm font-semibold">Atualizações</h3><p className="mt-0.5 text-xs text-muted-foreground">Mais recentes primeiro.</p></div>
                  {details.updates.length === 0 ? <div className="rounded-lg border border-dashed px-4 py-8 text-center text-xs text-muted-foreground">Nenhuma atualização publicada.</div> : <div className="grid min-w-0 max-w-full gap-3">{details.updates.map((update) => <article key={update.id} className="min-w-0 max-w-full rounded-lg border bg-card/60 p-4">{update.contentJson ? <TaskUpdateRichContent content={update.contentJson} /> : <LegacyUpdateContent content={update.content} />}<footer className="mt-4 flex min-w-0 items-center justify-between gap-3 border-t pt-3 text-[11px] text-muted-foreground"><span className="min-w-0 break-words">{formatUpdateDate(update.createdAt)}{new Date(update.updatedAt).getTime() - new Date(update.createdAt).getTime() > 1000 && " • Editado"}</span><DropdownMenu><DropdownMenuTrigger render={<Button variant="ghost" size="icon-xs" aria-label="Ações da atualização" />}><MoreHorizontal /></DropdownMenuTrigger><DropdownMenuContent align="end"><DropdownMenuItem variant="destructive" onClick={() => setDeleteUpdateTarget(update)}><Trash2 />Excluir</DropdownMenuItem></DropdownMenuContent></DropdownMenu></footer></article>)}</div>}
                </section>

                <section className="grid min-w-0 max-w-full gap-3">
                  <div className="flex min-w-0 max-w-full flex-col gap-3 min-[420px]:flex-row min-[420px]:items-center min-[420px]:justify-between"><div className="min-w-0"><h3 className="text-sm font-semibold">Anexos</h3><p className="mt-0.5 break-words text-xs text-muted-foreground">JPEG, PNG ou WebP, até 5 MB.</p></div><input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp" multiple className="hidden" onChange={(event) => void uploadFiles(Array.from(event.target.files ?? []))} /><Button className="w-full min-[420px]:w-auto" variant="outline" size="sm" onClick={() => fileInputRef.current?.click()} disabled={uploading}>{uploading ? <Loader2 className="animate-spin" /> : <Upload />}Anexar imagens</Button></div>
                  {details.attachments.length === 0 ? <div className="flex min-h-28 flex-col items-center justify-center rounded-lg border border-dashed text-center text-muted-foreground"><Paperclip className="mb-2 size-5" /><p className="text-xs">Nenhuma imagem anexada.</p></div> : <div className="grid min-w-0 max-w-full grid-cols-1 gap-3 min-[400px]:grid-cols-2 xl:grid-cols-3">{details.attachments.map((attachment) => <div key={attachment.id} className="group relative min-w-0 max-w-full overflow-hidden rounded-lg border bg-muted/20"><button type="button" onClick={() => setPreview(attachment)} className="relative block aspect-video w-full overflow-hidden bg-black/20" aria-label={`Visualizar ${attachment.originalName ?? "imagem"}`}><Image src={attachment.signedUrl} alt={attachment.originalName ?? "Imagem anexada"} fill sizes="(min-width: 1280px) 18vw, 28vw" unoptimized loader={signedImageLoader} className="object-cover transition-transform group-hover:scale-105" /></button><div className="flex min-w-0 max-w-full items-center gap-2 px-2 py-1.5"><ImageIcon className="size-3 shrink-0 text-muted-foreground" /><span className="min-w-0 flex-1 truncate text-[11px]" title={attachment.originalName ?? undefined}>{attachment.originalName ?? "Imagem"}</span><span className="shrink-0 text-[10px] text-muted-foreground">{formatSize(attachment.sizeBytes)}</span><Button variant="ghost" size="icon-xs" aria-label="Excluir anexo" onClick={() => setDeleteAttachmentTarget(attachment)}><Trash2 /></Button></div></div>)}</div>}
                </section>
              </div>
            ) : null}
            {error && <p role="alert" className="mt-4 rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-xs text-destructive">{error}</p>}
          </div>
        </SheetContent>
      </Sheet>

      <Dialog open={Boolean(preview)} onOpenChange={(value) => { if (!value) setPreview(null) }}>{preview && <DialogContent className="sm:max-w-4xl"><DialogHeader><DialogTitle>{preview.originalName ?? "Imagem anexada"}</DialogTitle><DialogDescription>{formatSize(preview.sizeBytes)}</DialogDescription></DialogHeader><div className="flex max-h-[75vh] items-center justify-center overflow-hidden rounded-lg bg-black/40"><Image src={preview.signedUrl} alt={preview.originalName ?? "Imagem anexada"} width={1600} height={1200} unoptimized loader={signedImageLoader} className="max-h-[75vh] w-auto max-w-full object-contain" /></div></DialogContent>}</Dialog>

      <Dialog open={Boolean(deleteAttachmentTarget)} onOpenChange={(value) => { if (!value) setDeleteAttachmentTarget(null) }}>{deleteAttachmentTarget && <DialogContent className="sm:max-w-sm"><DialogHeader><DialogTitle>Excluir imagem?</DialogTitle><DialogDescription>O anexo “{deleteAttachmentTarget.originalName ?? "Imagem"}” será removido permanentemente.</DialogDescription></DialogHeader><DialogFooter><DialogClose render={<Button variant="outline" />}>Cancelar</DialogClose><Button variant="destructive" onClick={() => void removeAttachment()}>Excluir imagem</Button></DialogFooter></DialogContent>}</Dialog>

      <Dialog open={Boolean(deleteUpdateTarget)} onOpenChange={(value) => { if (!value) setDeleteUpdateTarget(null) }}>{deleteUpdateTarget && <DialogContent className="sm:max-w-sm"><DialogHeader><DialogTitle>Excluir atualização?</DialogTitle><DialogDescription>Esta atualização será removida permanentemente. A tarefa continuará existindo.</DialogDescription></DialogHeader><DialogFooter><DialogClose render={<Button variant="outline" />}>Cancelar</DialogClose><Button variant="destructive" onClick={() => void removeUpdate()}>Excluir atualização</Button></DialogFooter></DialogContent>}</Dialog>
    </>
  )
}
