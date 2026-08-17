"use client"

import { useActionState, useEffect, useState } from "react"
import { BriefcaseBusiness, Mail, MoreHorizontal, Pencil, Trash2, UserRoundPlus } from "lucide-react"

import { createMember, deleteMember, updateMember, type MemberActionState } from "@/app/equipe/actions"
import { MemberAvatar } from "@/components/members/member-avatar"
import { Button } from "@/components/ui/button"
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import type { Member } from "@/lib/members"

const initialState: MemberActionState = { error: null, success: false }

function MemberForm({ member, boardId, onSuccess }: { member?: Member; boardId?: string; onSuccess: () => void }) {
  const [state, formAction, pending] = useActionState(member ? updateMember : createMember, initialState)

  useEffect(() => {
    if (state.success) onSuccess()
  }, [state, onSuccess])

  return (
    <form action={formAction} className="grid min-w-0 gap-4">
      {member && <input type="hidden" name="memberId" value={member.id} />}
      {boardId && <input type="hidden" name="boardId" value={boardId} />}
      <div className="grid gap-2">
        <label htmlFor={`member-name-${member?.id ?? boardId ?? "new"}`} className="text-xs font-medium">Nome *</label>
        <Input id={`member-name-${member?.id ?? boardId ?? "new"}`} name="name" defaultValue={member?.name} maxLength={120} autoFocus required placeholder="Nome da pessoa" />
      </div>
      <div className="grid gap-2">
        <label htmlFor={`member-role-${member?.id ?? boardId ?? "new"}`} className="text-xs font-medium">Função</label>
        <Input id={`member-role-${member?.id ?? boardId ?? "new"}`} name="role" defaultValue={member?.role ?? ""} maxLength={120} placeholder="Ex.: Editor, Cliente, Designer" />
      </div>
      <div className="grid gap-2">
        <label htmlFor={`member-email-${member?.id ?? boardId ?? "new"}`} className="text-xs font-medium">E-mail</label>
        <Input id={`member-email-${member?.id ?? boardId ?? "new"}`} name="email" type="email" defaultValue={member?.email ?? ""} maxLength={254} placeholder="nome@exemplo.com" />
      </div>
      {state.error && <p role="alert" className="text-xs text-destructive">{state.error}</p>}
      <DialogFooter>
        <DialogClose render={<Button type="button" variant="outline" disabled={pending} />}>Cancelar</DialogClose>
        <Button type="submit" disabled={pending}>{pending ? "Salvando..." : member ? "Salvar alterações" : "Adicionar membro"}</Button>
      </DialogFooter>
    </form>
  )
}

export function NewMemberDialog({ boardId, label = "Adicionar membro", variant = "default", size = "default" }: { boardId?: string; label?: string; variant?: "default" | "outline" | "ghost"; size?: "default" | "sm" }) {
  const [open, setOpen] = useState(false)
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button type="button" variant={variant} size={size} />}><UserRoundPlus />{label}</DialogTrigger>
      {open && <DialogContent className="sm:max-w-md"><DialogHeader><DialogTitle>Adicionar membro</DialogTitle><DialogDescription>{boardId ? "Cadastre a pessoa e adicione-a automaticamente à equipe deste quadro." : "Cadastre uma pessoa para organização e atribuição de tarefas."}</DialogDescription></DialogHeader><MemberForm boardId={boardId} onSuccess={() => setOpen(false)} /></DialogContent>}
    </Dialog>
  )
}

function EditMemberDialog({ member, open, onOpenChange }: { member: Member; open: boolean; onOpenChange: (open: boolean) => void }) {
  return <Dialog open={open} onOpenChange={onOpenChange}>{open && <DialogContent className="sm:max-w-md"><DialogHeader><DialogTitle>Editar membro</DialogTitle><DialogDescription>Atualize os dados organizacionais desta pessoa.</DialogDescription></DialogHeader><MemberForm member={member} onSuccess={() => onOpenChange(false)} /></DialogContent>}</Dialog>
}

function DeleteMemberDialog({ member, open, onOpenChange }: { member: Member; open: boolean; onOpenChange: (open: boolean) => void }) {
  const [state, formAction, pending] = useActionState(deleteMember, initialState)
  useEffect(() => { if (state.success) onOpenChange(false) }, [state, onOpenChange])
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader><DialogTitle>Excluir membro?</DialogTitle><DialogDescription>“{member.name}” será removido da equipe, dos Boards e das atribuições. As Tasks permanecerão normalmente.</DialogDescription></DialogHeader>
        <form action={formAction}>
          <input type="hidden" name="memberId" value={member.id} />
          {state.error && <p role="alert" className="mb-4 text-xs text-destructive">{state.error}</p>}
          <DialogFooter><DialogClose render={<Button type="button" variant="outline" disabled={pending} />}>Cancelar</DialogClose><Button type="submit" variant="destructive" disabled={pending}>{pending ? "Excluindo..." : "Excluir membro"}</Button></DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function MemberRow({ member }: { member: Member }) {
  const [editOpen, setEditOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  return (
    <article className="flex min-w-0 max-w-full items-center gap-3 rounded-lg border bg-card/70 p-3 shadow-sm sm:p-4">
      <MemberAvatar member={member} />
      <div className="min-w-0 flex-1">
        <h2 className="truncate text-sm font-semibold" title={member.name}>{member.name}</h2>
        <div className="mt-1 flex min-w-0 flex-col gap-1 text-[11px] text-muted-foreground sm:flex-row sm:flex-wrap sm:gap-x-4">
          {member.role && <span className="flex min-w-0 items-center gap-1.5"><BriefcaseBusiness className="size-3 shrink-0" /><span className="truncate">{member.role}</span></span>}
          {member.email && <span className="flex min-w-0 items-center gap-1.5"><Mail className="size-3 shrink-0" /><span className="truncate">{member.email}</span></span>}
          {!member.role && !member.email && <span>Sem função ou e-mail informado.</span>}
        </div>
      </div>
      <DropdownMenu>
        <DropdownMenuTrigger render={<Button type="button" variant="ghost" size="icon-sm" aria-label={`Ações de ${member.name}`} />}><MoreHorizontal /></DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-36"><DropdownMenuItem onClick={() => setEditOpen(true)}><Pencil />Editar</DropdownMenuItem><DropdownMenuItem variant="destructive" onClick={() => setDeleteOpen(true)}><Trash2 />Excluir</DropdownMenuItem></DropdownMenuContent>
      </DropdownMenu>
      <EditMemberDialog member={member} open={editOpen} onOpenChange={setEditOpen} />
      {deleteOpen && <DeleteMemberDialog member={member} open={deleteOpen} onOpenChange={setDeleteOpen} />}
    </article>
  )
}

export function MemberDirectory({ members }: { members: Member[] }) {
  return <section className="grid min-w-0 max-w-full gap-3">{members.map((member) => <MemberRow key={member.id} member={member} />)}</section>
}
