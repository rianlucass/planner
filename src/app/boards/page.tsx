import { LayoutGrid } from "lucide-react"
import Link from "next/link"

import { BoardActions, NewBoardDialog } from "@/components/boards/board-dialogs"
import { EmptyState } from "@/components/planner/empty-state"
import { PageHeader } from "@/components/planner/page-header"
import { createSupabaseServerClient } from "@/lib/supabase/server"

export const metadata = { title: "Quadros" }
export const dynamic = "force-dynamic"

type Board = { id: string; name: string; created_at: string; updated_at: string }

async function getBoards(): Promise<{ boards: Board[]; error: boolean }> {
  const { data, error } = await createSupabaseServerClient().from("boards").select("id, name, created_at, updated_at").order("created_at", { ascending: false })
  if (error) {
    console.error("Erro ao carregar quadros:", error.message)
    return { boards: [], error: true }
  }
  return { boards: data ?? [], error: false }
}

function formatCreatedAt(value: string) {
  return new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "short", year: "numeric", timeZone: "America/Sao_Paulo" }).format(new Date(value))
}

export default async function BoardsPage() {
  const { boards, error } = await getBoards()
  return (
    <>
      <div className="flex items-start justify-between gap-4">
        <PageHeader eyebrow="Organização" title="Quadros" description="Organize projetos e fluxos de trabalho em espaços claros e focados." />
        <div className="mt-5 shrink-0 hidden sm:block"><NewBoardDialog /></div>
      </div>
      <div className="sm:hidden"><NewBoardDialog /></div>

      {error ? (
        <section className="rounded-xl border border-destructive/30 bg-destructive/5 p-5">
          <h2 className="text-sm font-semibold">Não foi possível carregar os quadros</h2>
          <p className="mt-1 text-sm text-muted-foreground">Confirme se a migration da tabela <code className="text-foreground">boards</code> foi executada no Supabase e tente novamente.</p>
        </section>
      ) : boards.length === 0 ? (
        <EmptyState icon={LayoutGrid} title="Nenhum quadro criado" description="Crie seu primeiro quadro para começar a organizar o trabalho." action={<div className="mt-5"><NewBoardDialog /></div>} />
      ) : (
        <section aria-label="Lista de quadros" className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {boards.map((board) => (
            <article key={board.id} className="group relative flex min-h-28 flex-col justify-between rounded-xl border bg-card/80 p-4 shadow-sm transition-colors hover:border-primary/30">
              <Link href={`/boards/${board.id}`} className="absolute inset-0 rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" aria-label={`Abrir quadro ${board.name}`} />
              <div className="flex items-start justify-between gap-3">
                <div className="grid size-8 place-items-center rounded-lg bg-primary/10 text-primary"><LayoutGrid className="size-4" /></div>
                <div className="relative z-10"><BoardActions board={{ id: board.id, name: board.name }} /></div>
              </div>
              <div className="pointer-events-none relative mt-5 min-w-0">
                <h2 className="truncate text-sm font-semibold transition-colors group-hover:text-primary" title={board.name}>{board.name}</h2>
                <p className="mt-1 text-[11px] text-muted-foreground">Criado em {formatCreatedAt(board.created_at)}</p>
              </div>
            </article>
          ))}
        </section>
      )}
    </>
  )
}
