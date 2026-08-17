"use client"

import type { ReactElement } from "react"
import { useState } from "react"
import { Loader2, Search, Users } from "lucide-react"

import { addBoardMember, removeBoardMember } from "@/app/boards/[id]/member-actions"
import { MemberAvatar } from "@/components/members/member-avatar"
import { NewMemberDialog } from "@/components/members/member-controls"
import { Button } from "@/components/ui/button"
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import type { Member } from "@/lib/members"

export function ManageBoardMembersDialog({ boardId, members, memberIds, trigger }: { boardId: string; members: Member[]; memberIds: string[]; trigger?: ReactElement }) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState("")
  const [selectionOverrides, setSelectionOverrides] = useState<Record<string, boolean>>({})
  const [pendingId, setPendingId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const normalizedQuery = query.trim().toLocaleLowerCase("pt-BR")
  const selectedFromProps = new Set(memberIds)
  const filteredMembers = members.filter((member) => !normalizedQuery || [member.name, member.role, member.email].some((value) => value?.toLocaleLowerCase("pt-BR").includes(normalizedQuery)))

  async function toggleMember(memberId: string) {
    if (pendingId) return
    const wasSelected = selectionOverrides[memberId] ?? selectedFromProps.has(memberId)
    setSelectionOverrides((current) => ({ ...current, [memberId]: !wasSelected }))
    setPendingId(memberId)
    setError(null)

    const result = wasSelected ? await removeBoardMember(boardId, memberId) : await addBoardMember(boardId, memberId)
    setPendingId(null)
    if (!result.success) {
      setSelectionOverrides((current) => ({ ...current, [memberId]: wasSelected }))
      setError(result.error ?? "Não foi possível atualizar a equipe do quadro.")
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={trigger ?? <Button type="button" variant="outline" size="sm" />}><Users />Gerenciar equipe</DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader><DialogTitle>Equipe deste quadro</DialogTitle><DialogDescription>Escolha quais membros globais participam deste cliente ou projeto.</DialogDescription></DialogHeader>
        <div className="relative min-w-0"><Search className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-muted-foreground" /><Input value={query} onChange={(event) => setQuery(event.target.value)} className="pl-8" placeholder="Buscar pessoa..." /></div>
        <div className="max-h-[min(22rem,calc(100dvh-17rem))] min-w-0 space-y-1 overflow-y-auto pr-1">
          {filteredMembers.length === 0 ? <p className="rounded-md border border-dashed px-4 py-7 text-center text-xs text-muted-foreground">{members.length === 0 ? "Nenhum membro global cadastrado." : "Nenhuma pessoa encontrada."}</p> : filteredMembers.map((member) => {
            const selected = selectionOverrides[member.id] ?? selectedFromProps.has(member.id)
            return (
              <button key={member.id} type="button" onClick={() => void toggleMember(member.id)} disabled={Boolean(pendingId)} className="flex w-full min-w-0 items-center gap-3 rounded-md border border-transparent p-2 text-left transition-colors hover:border-border hover:bg-muted/30 disabled:opacity-60">
                <span className="grid size-4 shrink-0 place-items-center rounded border bg-background text-[10px] text-primary">{pendingId === member.id ? <Loader2 className="size-3 animate-spin" /> : selected ? "✓" : null}</span>
                <MemberAvatar member={member} size="sm" />
                <span className="min-w-0 flex-1"><span className="block truncate text-xs font-medium">{member.name}</span><span className="block truncate text-[10px] text-muted-foreground">{member.role || member.email || "Sem função informada"}</span></span>
              </button>
            )
          })}
        </div>
        {error && <p role="alert" className="text-xs text-destructive">{error}</p>}
        <DialogFooter><DialogClose render={<Button type="button" variant="outline" />}>Fechar</DialogClose><NewMemberDialog boardId={boardId} label="Adicionar novo membro" size="sm" /></DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
