"use client"

import { useState } from "react"
import { Loader2, Search, UserRoundPlus, Users } from "lucide-react"

import { updateTaskAssignee } from "@/app/boards/[id]/member-actions"
import { ManageBoardMembersDialog } from "@/components/members/board-members-dialog"
import { MemberAvatar } from "@/components/members/member-avatar"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Popover, PopoverContent, PopoverDescription, PopoverHeader, PopoverTitle, PopoverTrigger } from "@/components/ui/popover"
import type { Member } from "@/lib/members"
import { cn } from "@/lib/utils"

function AvatarStack({ members }: { members: Member[] }) {
  const visible = members.slice(0, 3)
  const remaining = members.length - visible.length
  return (
    <span className="flex min-w-0 items-center" title={members.map((member) => member.name).join(", ")}>
      {visible.map((member, index) => <MemberAvatar key={member.id} member={member} size="xs" className={cn("ring-2 ring-background", index > 0 && "-ml-1.5")} />)}
      {remaining > 0 && <span className="-ml-1 grid size-6 place-items-center rounded-full bg-muted text-[9px] font-semibold text-muted-foreground ring-2 ring-background">+{remaining}</span>}
    </span>
  )
}

export function TaskAssigneePicker({ boardId, taskId, members, allMembers, boardMemberIds, value, onChange, variant = "cell" }: { boardId: string; taskId: string; members: Member[]; allMembers: Member[]; boardMemberIds: string[]; value: string[]; onChange: (value: string[]) => void; variant?: "cell" | "property" }) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState("")
  const [pendingId, setPendingId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const selectedIds = new Set(value)
  const selectedMembers = members.filter((member) => selectedIds.has(member.id))
  const normalizedQuery = query.trim().toLocaleLowerCase("pt-BR")
  const filteredMembers = members.filter((member) => !normalizedQuery || [member.name, member.role].some((field) => field?.toLocaleLowerCase("pt-BR").includes(normalizedQuery)))

  async function toggleAssignee(memberId: string) {
    if (pendingId) return
    const selected = selectedIds.has(memberId)
    const previous = value
    const next = selected ? value.filter((id) => id !== memberId) : [...value, memberId]
    onChange(next)
    setPendingId(memberId)
    setError(null)
    const result = await updateTaskAssignee(boardId, taskId, memberId, !selected)
    setPendingId(null)
    if (!result.success) {
      onChange(previous)
      setError(result.error ?? "Não foi possível atualizar os responsáveis.")
    }
  }

  return (
    <div className={cn("min-w-0 max-w-full", variant === "property" && "flex flex-wrap items-center gap-2")} onPointerDown={(event) => event.stopPropagation()}>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger
          render={<Button type="button" variant="ghost" className={cn("min-w-0 font-normal", variant === "cell" && "h-9 w-full justify-start rounded-none px-2 hover:bg-muted/30", variant === "property" && "h-8 max-w-full justify-start border bg-muted/20 px-2.5 text-xs hover:bg-muted/40")} aria-label={selectedMembers.length ? `Responsáveis: ${selectedMembers.map((member) => member.name).join(", ")}` : "Definir responsáveis"} />}
        >
          {variant === "property" && <span className="font-medium text-muted-foreground">Responsáveis:</span>}
          {selectedMembers.length > 0 ? <AvatarStack members={selectedMembers} /> : <span className="flex items-center gap-1 text-muted-foreground">{variant === "cell" && <UserRoundPlus className="size-3.5" />}—</span>}
        </PopoverTrigger>

        <PopoverContent align="center" className="w-[calc(100vw-1.5rem)] max-w-72 gap-3 p-3" onPointerDown={(event) => event.stopPropagation()}>
          <PopoverHeader><PopoverTitle>Responsáveis</PopoverTitle><PopoverDescription>Selecione membros da equipe deste quadro.</PopoverDescription></PopoverHeader>
          {members.length > 0 && <div className="relative"><Search className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-muted-foreground" /><Input value={query} onChange={(event) => setQuery(event.target.value)} className="h-8 pl-8 text-xs" placeholder="Buscar pessoa..." /></div>}
          <div className="max-h-64 space-y-1 overflow-y-auto">
            {filteredMembers.length === 0 ? <p className="rounded-md border border-dashed px-3 py-6 text-center text-xs text-muted-foreground">{members.length === 0 ? "Nenhum membro participa deste quadro." : "Nenhuma pessoa encontrada."}</p> : filteredMembers.map((member) => {
              const selected = selectedIds.has(member.id)
              return <button key={member.id} type="button" onClick={() => void toggleAssignee(member.id)} disabled={Boolean(pendingId)} className="flex w-full min-w-0 items-center gap-2 rounded-md px-2 py-1.5 text-left hover:bg-muted disabled:opacity-60"><span className="grid size-4 shrink-0 place-items-center rounded border bg-background text-[10px] text-primary">{pendingId === member.id ? <Loader2 className="size-3 animate-spin" /> : selected ? "✓" : null}</span><MemberAvatar member={member} size="sm" /><span className="min-w-0 flex-1"><span className="block truncate text-xs font-medium">{member.name}</span><span className="block truncate text-[10px] text-muted-foreground">{member.role || "Sem função informada"}</span></span></button>
            })}
          </div>
          {error && <p role="alert" className="text-[11px] text-destructive">{error}</p>}
          <div className="border-t pt-1">
            <ManageBoardMembersDialog boardId={boardId} members={allMembers} memberIds={boardMemberIds} trigger={<button type="button" onClick={() => setOpen(false)} className="flex h-8 w-full items-center gap-2 rounded px-2 text-xs text-muted-foreground hover:bg-muted hover:text-foreground"><Users className="size-3.5" />Gerenciar equipe</button>} />
          </div>
        </PopoverContent>
      </Popover>
    </div>
  )
}
