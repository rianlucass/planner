"use client"

import { useActionState, useEffect, useRef, useState } from "react"
import { useSortable } from "@dnd-kit/react/sortable"
import { Check, GripVertical, MoreHorizontal, Pencil, Plus, Trash2, X } from "lucide-react"

import { createTask, deleteTask, updateTask, type TaskActionState } from "@/app/boards/[id]/task-actions"
import { Button } from "@/components/ui/button"
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import { StatusCell } from "@/components/statuses/status-cell"
import type { BoardStatus } from "@/components/statuses/status-controls"
import { TaskDatePicker } from "@/components/tasks/task-date-picker"
import { TaskDetailSheet } from "@/components/tasks/task-detail-sheet"
import { TaskAssigneePicker } from "@/components/tasks/task-assignee-picker"
import { cn } from "@/lib/utils"
import type { Member } from "@/lib/members"

const initialState: TaskActionState = { error: null, success: false }

type Task = { id: string; title: string; position: number; status_id: string | null; task_date: string | null; assignee_ids: string[] }

function AddTaskRow({ groupId }: { groupId: string }) {
  const [editing, setEditing] = useState(false)
  const [state, formAction, pending] = useActionState(createTask, initialState)
  const formRef = useRef<HTMLFormElement>(null)

  useEffect(() => {
    if (state.success) formRef.current?.reset()
  }, [state])

  if (!editing) {
    return <button type="button" onClick={() => setEditing(true)} className="flex h-9 w-full items-center gap-2 px-3 text-left text-xs text-muted-foreground transition-colors hover:bg-muted/30 hover:text-foreground"><Plus className="size-3.5" />Adicionar tarefa</button>
  }

  return (
    <form ref={formRef} action={formAction} className="flex min-h-10 items-center gap-2 px-3 py-1.5">
      <input type="hidden" name="groupId" value={groupId} />
      <div className="min-w-0 flex-1">
        <Input name="title" maxLength={200} autoFocus required placeholder="Nome da tarefa" className="h-7 text-xs" />
        {state.error && <p role="alert" className="mt-1 text-[11px] text-destructive">{state.error}</p>}
      </div>
      <Button type="submit" size="icon-xs" disabled={pending} aria-label="Salvar tarefa"><Check /></Button>
      <Button type="button" variant="ghost" size="icon-xs" disabled={pending} onClick={() => setEditing(false)} aria-label="Cancelar"><X /></Button>
    </form>
  )
}

function RenameTaskDialog({ groupId, task, open, onOpenChange }: { groupId: string; task: Task; open: boolean; onOpenChange: (open: boolean) => void }) {
  const [state, formAction, pending] = useActionState(updateTask, initialState)
  useEffect(() => { if (state.success) onOpenChange(false) }, [state, onOpenChange])
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader><DialogTitle>Renomear tarefa</DialogTitle><DialogDescription>Altere o título desta tarefa.</DialogDescription></DialogHeader>
        <form action={formAction} className="grid gap-4">
          <input type="hidden" name="groupId" value={groupId} /><input type="hidden" name="taskId" value={task.id} />
          <Input name="title" defaultValue={task.title} maxLength={200} autoFocus required />
          {state.error && <p role="alert" className="text-xs text-destructive">{state.error}</p>}
          <DialogFooter><DialogClose render={<Button type="button" variant="outline" disabled={pending} />}>Cancelar</DialogClose><Button type="submit" disabled={pending}>{pending ? "Salvando..." : "Salvar"}</Button></DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function DeleteTaskDialog({ groupId, task, open, onOpenChange }: { groupId: string; task: Task; open: boolean; onOpenChange: (open: boolean) => void }) {
  const [state, formAction, pending] = useActionState(deleteTask, initialState)
  useEffect(() => { if (state.success) onOpenChange(false) }, [state, onOpenChange])
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader><DialogTitle>Excluir tarefa?</DialogTitle><DialogDescription>A tarefa “{task.title}” será removida permanentemente.</DialogDescription></DialogHeader>
        <form action={formAction}>
          <input type="hidden" name="groupId" value={groupId} /><input type="hidden" name="taskId" value={task.id} />
          {state.error && <p role="alert" className="mb-4 text-xs text-destructive">{state.error}</p>}
          <DialogFooter><DialogClose render={<Button type="button" variant="outline" disabled={pending} />}>Cancelar</DialogClose><Button type="submit" variant="destructive" disabled={pending}>{pending ? "Excluindo..." : "Excluir tarefa"}</Button></DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function TaskActions({ groupId, task }: { groupId: string; task: Task }) {
  const [renameOpen, setRenameOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  return (
    <>
      <DropdownMenu><DropdownMenuTrigger render={<Button variant="ghost" size="icon-xs" aria-label={`Ações de ${task.title}`} />}><MoreHorizontal /></DropdownMenuTrigger><DropdownMenuContent align="end" className="w-36"><DropdownMenuItem onClick={() => setRenameOpen(true)}><Pencil />Renomear</DropdownMenuItem><DropdownMenuItem variant="destructive" onClick={() => setDeleteOpen(true)}><Trash2 />Excluir</DropdownMenuItem></DropdownMenuContent></DropdownMenu>
      {renameOpen && <RenameTaskDialog groupId={groupId} task={task} open={renameOpen} onOpenChange={setRenameOpen} />}
      {deleteOpen && <DeleteTaskDialog groupId={groupId} task={task} open={deleteOpen} onOpenChange={setDeleteOpen} />}
    </>
  )
}

function SortableTaskRow({ boardId, groupId, task, index, statuses, members, allMembers, boardMemberIds, disabled }: { boardId: string; groupId: string; task: Task; index: number; statuses: BoardStatus[]; members: Member[]; allMembers: Member[]; boardMemberIds: string[]; disabled: boolean }) {
  const { ref, handleRef, isDragSource, isDropTarget } = useSortable({ id: task.id, index, group: groupId, type: "task", accept: "task", disabled, data: { groupId } })
  const [taskDate, setTaskDate] = useState(task.task_date)
  const [assigneeIds, setAssigneeIds] = useState(task.assignee_ids)
  return (
    <tr ref={ref} className={cn("h-9 transition-[opacity,background-color,box-shadow] hover:bg-muted/20", isDragSource && "relative z-10 opacity-40 shadow-lg", isDropTarget && !isDragSource && "bg-primary/10 shadow-[inset_0_2px_0_var(--primary)]")}>
      <td className="px-1"><div className="flex min-w-0 items-center"><button ref={handleRef} type="button" disabled={disabled} className="grid size-7 shrink-0 touch-none cursor-grab place-items-center rounded text-muted-foreground/60 hover:bg-muted hover:text-foreground active:cursor-grabbing disabled:cursor-default disabled:opacity-40" aria-label={`Mover tarefa ${task.title}`}><GripVertical className="size-3.5" /></button><TaskDetailSheet boardId={boardId} taskId={task.id} title={task.title} taskDate={taskDate} onTaskDateChange={setTaskDate} members={members} allMembers={allMembers} boardMemberIds={boardMemberIds} assigneeIds={assigneeIds} onAssigneeIdsChange={setAssigneeIds} /></div></td>
      <td className="p-0"><TaskAssigneePicker boardId={boardId} taskId={task.id} members={members} allMembers={allMembers} boardMemberIds={boardMemberIds} value={assigneeIds} onChange={setAssigneeIds} /></td>
      <td className="p-0"><TaskDatePicker boardId={boardId} taskId={task.id} value={taskDate} onChange={setTaskDate} /></td>
      <td className="p-0"><StatusCell boardId={boardId} groupId={groupId} taskId={task.id} statusId={task.status_id} statuses={statuses} /></td>
      <td className="px-2 text-right"><TaskActions groupId={groupId} task={task} /></td>
    </tr>
  )
}

export function TaskTable({ boardId, groupId, tasks, statuses, members, allMembers, boardMemberIds, dndDisabled = false }: { boardId: string; groupId: string; tasks: Task[]; statuses: BoardStatus[]; members: Member[]; allMembers: Member[]; boardMemberIds: string[]; dndDisabled?: boolean }) {
  return (
    <div className="w-full min-w-0 max-w-full touch-pan-x overflow-x-auto overscroll-x-contain bg-background/20 [contain:inline-size_paint]">
      <table className="w-full min-w-[620px] table-fixed text-left text-xs">
        <thead className="border-b bg-muted/20 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
          <tr><th className="w-[48%] px-3 py-2">Tarefa</th><th className="w-[18%] px-3 py-2">Responsável</th><th className="w-[14%] px-3 py-2">Data</th><th className="w-[14%] px-3 py-2">Status</th><th className="w-10 px-2 py-2"><span className="sr-only">Ações</span></th></tr>
        </thead>
        <tbody className="divide-y divide-border/60">
          {tasks.map((task, index) => <SortableTaskRow key={task.id} boardId={boardId} groupId={groupId} task={task} index={index} statuses={statuses} members={members} allMembers={allMembers} boardMemberIds={boardMemberIds} disabled={dndDisabled} />)}
        </tbody>
        <tfoot className="border-t"><tr><td colSpan={5}><AddTaskRow groupId={groupId} /></td></tr></tfoot>
      </table>
    </div>
  )
}
