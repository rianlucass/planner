"use client"

import { useActionState, useEffect, useState } from "react"
import { MoreHorizontal, Pencil, Plus, Trash2 } from "lucide-react"

import { createBoard, deleteBoard, updateBoard, type BoardActionState } from "@/app/boards/actions"
import { Button } from "@/components/ui/button"
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"

const initialState: BoardActionState = { error: null, success: false }

type BoardFormProps = { board?: { id: string; name: string }; onSuccess: () => void }

function BoardForm({ board, onSuccess }: BoardFormProps) {
  const action = board ? updateBoard : createBoard
  const [state, formAction, pending] = useActionState(action, initialState)

  useEffect(() => {
    if (state.success) onSuccess()
  }, [state, onSuccess])

  return (
    <form action={formAction} className="grid gap-5">
      {board && <input type="hidden" name="id" value={board.id} />}
      <div className="grid gap-2">
        <label htmlFor={`board-name-${board?.id ?? "new"}`} className="text-xs font-medium">Nome do quadro</label>
        <Input id={`board-name-${board?.id ?? "new"}`} name="name" defaultValue={board?.name} maxLength={120} autoFocus required placeholder="Ex.: Planejamento editorial" />
        {state.error && <p role="alert" className="text-xs text-destructive">{state.error}</p>}
      </div>
      <DialogFooter>
        <DialogClose render={<Button type="button" variant="outline" disabled={pending} />}>Cancelar</DialogClose>
        <Button type="submit" disabled={pending}>{pending ? "Salvando..." : board ? "Salvar" : "Criar quadro"}</Button>
      </DialogFooter>
    </form>
  )
}

export function NewBoardDialog() {
  const [open, setOpen] = useState(false)
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button size="sm" />}><Plus />Novo quadro</DialogTrigger>
      {open && (
        <DialogContent>
          <DialogHeader><DialogTitle>Novo quadro</DialogTitle><DialogDescription>Dê um nome curto e claro para identificar este quadro.</DialogDescription></DialogHeader>
          <BoardForm onSuccess={() => setOpen(false)} />
        </DialogContent>
      )}
    </Dialog>
  )
}

function RenameBoardDialog({ board, open, onOpenChange }: { board: { id: string; name: string }; open: boolean; onOpenChange: (open: boolean) => void }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {open && (
        <DialogContent>
          <DialogHeader><DialogTitle>Renomear quadro</DialogTitle><DialogDescription>Altere o nome usado para identificar este quadro.</DialogDescription></DialogHeader>
          <BoardForm board={board} onSuccess={() => onOpenChange(false)} />
        </DialogContent>
      )}
    </Dialog>
  )
}

function DeleteBoardDialog({ board, open, onOpenChange }: { board: { id: string; name: string }; open: boolean; onOpenChange: (open: boolean) => void }) {
  const [state, formAction, pending] = useActionState(deleteBoard, initialState)

  useEffect(() => {
    if (state.success) onOpenChange(false)
  }, [state, onOpenChange])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {open && (
        <DialogContent>
          <DialogHeader><DialogTitle>Excluir quadro?</DialogTitle><DialogDescription>O quadro “{board.name}” será removido permanentemente. Esta ação não pode ser desfeita.</DialogDescription></DialogHeader>
          <form action={formAction}>
            <input type="hidden" name="id" value={board.id} />
            {state.error && <p role="alert" className="mb-4 text-xs text-destructive">{state.error}</p>}
            <DialogFooter>
              <DialogClose render={<Button type="button" variant="outline" disabled={pending} />}>Cancelar</DialogClose>
              <Button type="submit" variant="destructive" disabled={pending}>{pending ? "Excluindo..." : "Excluir quadro"}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      )}
    </Dialog>
  )
}

export function BoardActions({ board }: { board: { id: string; name: string } }) {
  const [renameOpen, setRenameOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger render={<Button variant="ghost" size="icon-sm" aria-label={`Ações de ${board.name}`} />}><MoreHorizontal /></DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-36">
          <DropdownMenuItem onClick={() => setRenameOpen(true)}><Pencil />Renomear</DropdownMenuItem>
          <DropdownMenuItem variant="destructive" onClick={() => setDeleteOpen(true)}><Trash2 />Excluir</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <RenameBoardDialog board={board} open={renameOpen} onOpenChange={setRenameOpen} />
      {deleteOpen && <DeleteBoardDialog board={board} open={deleteOpen} onOpenChange={setDeleteOpen} />}
    </>
  )
}
