"use client"

import { useActionState, useEffect, useState } from "react"
import { CheckCircle2, CircleDot, Pencil, Plus, Settings2, Trash2 } from "lucide-react"

import { createStatus, deleteStatus, updateStatus, type StatusActionState } from "@/app/boards/[id]/status-actions"
import { Button } from "@/components/ui/button"
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"
import { statusColors, statusTextColor, type StatusColor } from "@/lib/status-colors"

export type BoardStatus = { id: string; name: string; color: string; is_completed: boolean; position: number }

const initialState: StatusActionState = { error: null, success: false }

function StatusForm({ boardId, status, onSuccess }: { boardId: string; status?: BoardStatus; onSuccess: () => void }) {
  const action = status ? updateStatus : createStatus
  const [state, formAction, pending] = useActionState(action, initialState)
  const initialColor = statusColors.includes(status?.color as StatusColor) ? status?.color as StatusColor : statusColors[1]
  const [color, setColor] = useState<StatusColor>(initialColor)

  useEffect(() => { if (state.success) onSuccess() }, [state, onSuccess])

  return (
    <form action={formAction} className="grid gap-5">
      <input type="hidden" name="boardId" value={boardId} />
      <input type="hidden" name="color" value={color} />
      {status && <input type="hidden" name="statusId" value={status.id} />}
      <div className="grid gap-2"><label htmlFor={`status-name-${status?.id ?? "new"}`} className="text-xs font-medium">Nome do status</label><Input id={`status-name-${status?.id ?? "new"}`} name="name" defaultValue={status?.name} maxLength={80} autoFocus required placeholder="Ex.: Em edição" /></div>
      <fieldset className="grid min-w-0 max-w-full gap-2"><legend className="text-xs font-medium">Cor</legend><div className="flex max-w-full flex-wrap gap-2">{statusColors.map((value) => <button key={value} type="button" onClick={() => setColor(value)} aria-label={`Selecionar cor ${value}`} aria-pressed={color === value} className={cn("size-7 rounded-md border-2 border-transparent transition-transform hover:scale-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring", color === value && "border-foreground ring-2 ring-background")} style={{ backgroundColor: value }} />)}</div></fieldset>
      <label className="flex min-w-0 max-w-full cursor-pointer items-center gap-2.5 rounded-md border bg-muted/20 px-3 py-2.5 text-xs"><input type="checkbox" name="isCompleted" defaultChecked={status?.is_completed} className="size-4 shrink-0 accent-primary" /><span className="min-w-0 break-words">Considerar como concluído</span></label>
      <div className="flex min-h-9 min-w-0 max-w-full items-center justify-center rounded-md px-2 py-1 text-center text-xs font-semibold break-words" style={{ backgroundColor: color, color: statusTextColor(color) }}>{status?.name || "Prévia do status"}</div>
      {state.error && <p role="alert" className="text-xs text-destructive">{state.error}</p>}
      <DialogFooter><DialogClose render={<Button type="button" variant="outline" disabled={pending} />}>Cancelar</DialogClose><Button type="submit" disabled={pending}>{pending ? "Salvando..." : status ? "Salvar" : "Criar status"}</Button></DialogFooter>
    </form>
  )
}

export function StatusFormDialog({ boardId, status, open, onOpenChange }: { boardId: string; status?: BoardStatus; open: boolean; onOpenChange: (open: boolean) => void }) {
  return <Dialog open={open} onOpenChange={onOpenChange}>{open && <DialogContent className="sm:max-w-sm"><DialogHeader><DialogTitle>{status ? "Editar status" : "Criar status"}</DialogTitle><DialogDescription>{status ? "Atualize nome, cor e comportamento deste status." : "Adicione um status específico para este quadro."}</DialogDescription></DialogHeader><StatusForm boardId={boardId} status={status} onSuccess={() => onOpenChange(false)} /></DialogContent>}</Dialog>
}

function DeleteStatusDialog({ boardId, status, open, onOpenChange }: { boardId: string; status: BoardStatus; open: boolean; onOpenChange: (open: boolean) => void }) {
  const [state, formAction, pending] = useActionState(deleteStatus, initialState)
  useEffect(() => { if (state.success) onOpenChange(false) }, [state, onOpenChange])
  return (
    <Dialog open={open} onOpenChange={onOpenChange}><DialogContent className="sm:max-w-sm"><DialogHeader><DialogTitle>Excluir status?</DialogTitle><DialogDescription>O status “{status.name}” será removido. As tarefas que o utilizam ficarão sem status.</DialogDescription></DialogHeader><form action={formAction}><input type="hidden" name="boardId" value={boardId} /><input type="hidden" name="statusId" value={status.id} />{state.error && <p role="alert" className="mb-4 text-xs text-destructive">{state.error}</p>}<DialogFooter><DialogClose render={<Button type="button" variant="outline" disabled={pending} />}>Cancelar</DialogClose><Button type="submit" variant="destructive" disabled={pending}>{pending ? "Excluindo..." : "Excluir status"}</Button></DialogFooter></form></DialogContent></Dialog>
  )
}

export function ManageStatusesDialog({ boardId, statuses }: { boardId: string; statuses: BoardStatus[] }) {
  const [open, setOpen] = useState(false)
  const [createOpen, setCreateOpen] = useState(false)
  const [editStatus, setEditStatus] = useState<BoardStatus | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<BoardStatus | null>(null)

  return (
    <>
      <Button type="button" variant="outline" size="sm" onClick={() => setOpen(true)}><Settings2 />Gerenciar status</Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader><DialogTitle>Status do quadro</DialogTitle><DialogDescription>Configure as etapas disponíveis somente para este quadro.</DialogDescription></DialogHeader>
          <div className="max-h-[min(20rem,calc(100dvh-13rem))] min-w-0 max-w-full space-y-2 overflow-y-auto">
            {statuses.length === 0 ? <p className="rounded-md border border-dashed px-4 py-6 text-center text-xs text-muted-foreground">Nenhum status criado.</p> : statuses.map((status) => (
              <div key={status.id} className="grid min-w-0 max-w-full grid-cols-[minmax(0,1fr)_auto] items-center gap-2 rounded-md border bg-muted/10 p-2 sm:flex sm:gap-3">
                <span className="grid min-h-8 min-w-0 max-w-full place-items-center rounded px-2 py-1 text-center text-[11px] font-semibold break-words sm:min-w-28 sm:max-w-48" style={{ backgroundColor: status.color, color: statusTextColor(status.color) }}>{status.name}</span>
                <span className="col-span-2 row-start-2 min-w-0 text-[11px] text-muted-foreground sm:order-none sm:flex-1">{status.is_completed ? <span className="flex min-w-0 items-center gap-1"><CheckCircle2 className="size-3.5 shrink-0 text-emerald-400" />Concluído</span> : <span className="flex min-w-0 items-center gap-1"><CircleDot className="size-3.5 shrink-0" />Em andamento</span>}</span>
                <div className="col-start-2 row-start-1 flex shrink-0 items-center gap-1">
                  <Button variant="ghost" size="icon-xs" aria-label={`Editar ${status.name}`} onClick={() => { setOpen(false); setEditStatus(status) }}><Pencil /></Button>
                  <Button variant="ghost" size="icon-xs" aria-label={`Excluir ${status.name}`} onClick={() => { setOpen(false); setDeleteTarget(status) }}><Trash2 /></Button>
                </div>
              </div>
            ))}
          </div>
          <DialogFooter><DialogClose render={<Button variant="outline" />}>Fechar</DialogClose><Button onClick={() => { setOpen(false); setCreateOpen(true) }}><Plus />Novo status</Button></DialogFooter>
        </DialogContent>
      </Dialog>
      <StatusFormDialog boardId={boardId} open={createOpen} onOpenChange={setCreateOpen} />
      {editStatus && <StatusFormDialog boardId={boardId} status={editStatus} open={true} onOpenChange={(value) => { if (!value) setEditStatus(null) }} />}
      {deleteTarget && <DeleteStatusDialog boardId={boardId} status={deleteTarget} open={true} onOpenChange={(value) => { if (!value) setDeleteTarget(null) }} />}
    </>
  )
}
