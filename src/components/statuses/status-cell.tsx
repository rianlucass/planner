"use client"

import { useState, useTransition } from "react"
import { Check, Plus } from "lucide-react"

import { updateTaskStatus, type StatusActionState } from "@/app/boards/[id]/status-actions"
import { StatusFormDialog, type BoardStatus } from "@/components/statuses/status-controls"
import { Popover, PopoverContent, PopoverDescription, PopoverHeader, PopoverTitle, PopoverTrigger } from "@/components/ui/popover"
import { statusTextColor } from "@/lib/status-colors"

const initialState: StatusActionState = { error: null, success: false }

export function StatusCell({ boardId, groupId, taskId, statusId, statuses }: { boardId: string; groupId: string; taskId: string; statusId: string | null; statuses: BoardStatus[] }) {
  const [open, setOpen] = useState(false)
  const [createOpen, setCreateOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()
  const current = statuses.find((status) => status.id === statusId)

  function selectStatus(nextStatusId: string) {
    const formData = new FormData()
    formData.set("groupId", groupId)
    formData.set("taskId", taskId)
    formData.set("statusId", nextStatusId)
    startTransition(async () => {
      const result = await updateTaskStatus(initialState, formData)
      setError(result.error)
      if (result.success) setOpen(false)
    })
  }

  return (
    <>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger className="flex h-9 w-full items-center justify-center px-2 text-center text-[11px] font-semibold transition-[filter] hover:brightness-110 disabled:opacity-60" disabled={pending} style={{ backgroundColor: current?.color ?? "transparent", color: current ? statusTextColor(current.color) : undefined }}>
          {pending ? "Atualizando..." : current?.name ?? "—"}
        </PopoverTrigger>
        <PopoverContent align="end" className="w-60 gap-2 p-2">
          <PopoverHeader className="px-2 py-1"><PopoverTitle>Selecionar status</PopoverTitle><PopoverDescription>Status disponíveis neste quadro.</PopoverDescription></PopoverHeader>
          <div className="grid gap-1">
            <button type="button" onClick={() => selectStatus("")} className="flex h-8 items-center gap-2 rounded px-2 text-xs hover:bg-muted"><span className="grid size-4 place-items-center">{!statusId && <Check className="size-3.5" />}</span><span className="text-muted-foreground">Sem status</span></button>
            {statuses.map((status) => <button key={status.id} type="button" onClick={() => selectStatus(status.id)} className="flex h-8 items-center gap-2 rounded px-2 text-xs hover:bg-muted"><span className="grid size-4 place-items-center">{status.id === statusId && <Check className="size-3.5" />}</span><span className="size-2.5 rounded-sm" style={{ backgroundColor: status.color }} /><span className="truncate">{status.name}</span></button>)}
          </div>
          {error && <p role="alert" className="px-2 text-[11px] text-destructive">{error}</p>}
          <div className="border-t pt-1"><button type="button" onClick={() => { setOpen(false); setCreateOpen(true) }} className="flex h-8 w-full items-center gap-2 rounded px-2 text-xs text-muted-foreground hover:bg-muted hover:text-foreground"><Plus className="size-3.5" />Criar status</button></div>
        </PopoverContent>
      </Popover>
      <StatusFormDialog boardId={boardId} open={createOpen} onOpenChange={setCreateOpen} />
    </>
  )
}
