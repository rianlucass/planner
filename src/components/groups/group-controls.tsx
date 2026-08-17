"use client"

import { useActionState, useEffect, useState } from "react"
import { useDroppable } from "@dnd-kit/react"
import { ChevronDown, MoreHorizontal, Pencil, Plus, Trash2 } from "lucide-react"

import { createGroup, deleteGroup, updateGroup, type GroupActionState } from "@/app/boards/[id]/actions"
import { Button } from "@/components/ui/button"
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import { TaskTable } from "@/components/tasks/task-table"
import type { BoardStatus } from "@/components/statuses/status-controls"
import type { Member } from "@/lib/members"
import { cn } from "@/lib/utils"

const initialState: GroupActionState = { error: null, success: false }
const colors = ["#6366f1", "#8b5cf6", "#ec4899", "#f59e0b", "#10b981", "#06b6d4"] as const

function GroupForm({ boardId, group, onSuccess }: { boardId: string; group?: { id: string; name: string }; onSuccess: () => void }) {
  const action = group ? updateGroup : createGroup
  const [state, formAction, pending] = useActionState(action, initialState)
  const [color, setColor] = useState<(typeof colors)[number]>(colors[0])

  useEffect(() => {
    if (state.success) onSuccess()
  }, [state, onSuccess])

  return (
    <form action={formAction} className="grid gap-5">
      <input type="hidden" name="boardId" value={boardId} />
      {group && <input type="hidden" name="id" value={group.id} />}
      <div className="grid gap-2">
        <label htmlFor={`group-name-${group?.id ?? "new"}`} className="text-xs font-medium">Nome do grupo</label>
        <Input id={`group-name-${group?.id ?? "new"}`} name="name" defaultValue={group?.name} maxLength={120} autoFocus required placeholder="Ex.: Em andamento" />
      </div>
      {!group && (
        <fieldset className="grid gap-2">
          <legend className="text-xs font-medium">Cor</legend>
          <input type="hidden" name="color" value={color} />
          <div className="flex max-w-full flex-wrap gap-2">
            {colors.map((value) => (
              <button key={value} type="button" onClick={() => setColor(value)} aria-label={`Selecionar cor ${value}`} aria-pressed={color === value}
                className={cn("size-7 rounded-full border-2 border-transparent transition-transform hover:scale-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring", color === value && "border-foreground ring-2 ring-background")}
                style={{ backgroundColor: value }} />
            ))}
          </div>
        </fieldset>
      )}
      {state.error && <p role="alert" className="text-xs text-destructive">{state.error}</p>}
      <DialogFooter>
        <DialogClose render={<Button type="button" variant="outline" disabled={pending} />}>Cancelar</DialogClose>
        <Button type="submit" disabled={pending}>{pending ? "Salvando..." : group ? "Salvar" : "Criar grupo"}</Button>
      </DialogFooter>
    </form>
  )
}

export function NewGroupDialog({ boardId }: { boardId: string }) {
  const [open, setOpen] = useState(false)
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button size="sm" />}><Plus />Criar grupo</DialogTrigger>
      {open && <DialogContent><DialogHeader><DialogTitle>Criar grupo</DialogTitle><DialogDescription>Crie uma seção para organizar futuramente os conteúdos deste quadro.</DialogDescription></DialogHeader><GroupForm boardId={boardId} onSuccess={() => setOpen(false)} /></DialogContent>}
    </Dialog>
  )
}

function RenameGroupDialog({ boardId, group, open, onOpenChange }: { boardId: string; group: { id: string; name: string }; open: boolean; onOpenChange: (open: boolean) => void }) {
  return <Dialog open={open} onOpenChange={onOpenChange}>{open && <DialogContent><DialogHeader><DialogTitle>Renomear grupo</DialogTitle><DialogDescription>Altere o nome desta seção do quadro.</DialogDescription></DialogHeader><GroupForm boardId={boardId} group={group} onSuccess={() => onOpenChange(false)} /></DialogContent>}</Dialog>
}

function DeleteGroupDialog({ boardId, group, open, onOpenChange }: { boardId: string; group: { id: string; name: string }; open: boolean; onOpenChange: (open: boolean) => void }) {
  const [state, formAction, pending] = useActionState(deleteGroup, initialState)
  useEffect(() => { if (state.success) onOpenChange(false) }, [state, onOpenChange])
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader><DialogTitle>Excluir grupo?</DialogTitle><DialogDescription>O grupo “{group.name}” será removido permanentemente. Esta ação não pode ser desfeita.</DialogDescription></DialogHeader>
        <form action={formAction}>
          <input type="hidden" name="boardId" value={boardId} /><input type="hidden" name="id" value={group.id} />
          {state.error && <p role="alert" className="mb-4 text-xs text-destructive">{state.error}</p>}
          <DialogFooter><DialogClose render={<Button type="button" variant="outline" disabled={pending} />}>Cancelar</DialogClose><Button type="submit" variant="destructive" disabled={pending}>{pending ? "Excluindo..." : "Excluir grupo"}</Button></DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

export function GroupSection({ boardId, group, statuses, members, allMembers, boardMemberIds, dndDisabled = false }: { boardId: string; group: { id: string; name: string; color: string | null; tasks: { id: string; title: string; position: number; status_id: string | null; task_date: string | null; assignee_ids: string[] }[] }; statuses: BoardStatus[]; members: Member[]; allMembers: Member[]; boardMemberIds: string[]; dndDisabled?: boolean }) {
  const [expanded, setExpanded] = useState(true)
  const [renameOpen, setRenameOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const { ref, isDropTarget } = useDroppable({ id: group.id, type: "group", accept: "task", collisionPriority: -1, disabled: dndDisabled || !expanded, data: { groupId: group.id } })
  return (
    <section ref={ref} className={cn("w-full min-w-0 max-w-full overflow-hidden rounded-lg border bg-card/80 shadow-sm transition-[border-color,box-shadow]", isDropTarget && "border-primary/70 ring-2 ring-primary/20")}>
      <div className="flex h-11 min-w-0 max-w-full items-center gap-2 border-b px-3" style={{ borderLeftWidth: 3, borderLeftColor: group.color ?? "#6366f1" }}>
        <button type="button" onClick={() => setExpanded((value) => !value)} className="flex min-w-0 flex-1 items-center gap-2 text-left" aria-expanded={expanded}>
          <ChevronDown className={cn("size-4 shrink-0 text-muted-foreground transition-transform", !expanded && "-rotate-90")} />
          <span className="size-2.5 shrink-0 rounded-full" style={{ backgroundColor: group.color ?? "#6366f1" }} />
          <h2 className="truncate text-sm font-semibold">{group.name}</h2>
          <span className="shrink-0 text-[11px] text-muted-foreground">— {group.tasks.length}</span>
        </button>
        <DropdownMenu>
          <DropdownMenuTrigger render={<Button variant="ghost" size="icon-sm" aria-label={`Ações de ${group.name}`} />}><MoreHorizontal /></DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-36"><DropdownMenuItem onClick={() => setRenameOpen(true)}><Pencil />Renomear</DropdownMenuItem><DropdownMenuItem variant="destructive" onClick={() => setDeleteOpen(true)}><Trash2 />Excluir</DropdownMenuItem></DropdownMenuContent>
        </DropdownMenu>
      </div>
      {expanded && <TaskTable boardId={boardId} groupId={group.id} tasks={group.tasks} statuses={statuses} members={members} allMembers={allMembers} boardMemberIds={boardMemberIds} dndDisabled={dndDisabled} />}
      <RenameGroupDialog boardId={boardId} group={group} open={renameOpen} onOpenChange={setRenameOpen} />
      {deleteOpen && <DeleteGroupDialog boardId={boardId} group={group} open={deleteOpen} onOpenChange={setDeleteOpen} />}
    </section>
  )
}
