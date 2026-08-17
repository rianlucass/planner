import { EmptyState } from "@/components/planner/empty-state"
import { MemberDirectory, NewMemberDialog } from "@/components/members/member-controls"
import { PageHeader } from "@/components/planner/page-header"
import { Users } from "lucide-react"
import { createSupabaseServerClient } from "@/lib/supabase/server"
import type { Member } from "@/lib/members"

export const metadata = { title: "Equipe" }
export const dynamic = "force-dynamic"

async function getMembers(): Promise<{ members: Member[]; error: boolean }> {
  const { data, error } = await createSupabaseServerClient().from("members").select("id, name, role, email, avatar_url").order("name", { ascending: true }).order("created_at", { ascending: true })
  if (error) {
    console.error("Erro ao carregar equipe:", error.message)
    return { members: [], error: true }
  }
  return { members: data ?? [], error: false }
}

export default async function TeamPage() {
  const { members, error } = await getMembers()
  return <><div className="flex min-w-0 max-w-full flex-col justify-between gap-4 sm:flex-row sm:items-end"><PageHeader eyebrow="Colaboração" title="Equipe" description="Cadastre as pessoas que podem participar dos projetos e ser responsáveis por Tasks." /><div className="shrink-0"><NewMemberDialog /></div></div>{error ? <section className="rounded-xl border border-destructive/30 bg-destructive/5 p-5"><h2 className="text-sm font-semibold">Não foi possível carregar a equipe</h2><p className="mt-1 text-sm text-muted-foreground">Confirme se a migration da tabela <code className="text-foreground">members</code> foi executada no Supabase.</p></section> : members.length === 0 ? <EmptyState icon={Users} title="Nenhum membro cadastrado." description="Adicione a primeira pessoa para começar a montar as equipes dos Boards." action={<div className="mt-5"><NewMemberDialog /></div>} /> : <MemberDirectory members={members} />}</>
}
