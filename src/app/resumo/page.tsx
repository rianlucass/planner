import { AlertCircle, BarChart3, CalendarDays, CheckCircle2, UserRound, type LucideIcon } from "lucide-react"
import Link from "next/link"
import type { ReactNode } from "react"

import { EmptyState } from "@/components/planner/empty-state"
import { PageHeader } from "@/components/planner/page-header"
import { Button } from "@/components/ui/button"
import { buildPlannerSummary, summaryToday, type SummaryTask } from "@/lib/planner-summary"
import { statusTextColor } from "@/lib/status-colors"
import { getSummaryData } from "@/lib/supabase/summary"
import { formatDateOnly } from "@/lib/task-date"

export const metadata = { title: "Resumo" }
export const dynamic = "force-dynamic"

function Panel({ title, description, icon: Icon, count, children }: { title: string; description: string; icon: LucideIcon; count: number; children: ReactNode }) {
  return (
    <section className="min-w-0 rounded-xl border bg-card/80 shadow-sm">
      <div className="border-b p-4">
        <div className="flex items-center gap-2"><Icon aria-hidden="true" className="size-4 text-primary" /><h2 className="text-sm font-semibold">{title}</h2><span className="ml-auto rounded-full bg-muted px-2 py-0.5 text-xs tabular-nums">{count}</span></div>
        <p className="mt-2 text-xs leading-5 text-muted-foreground">{description}</p>
      </div>
      {children}
    </section>
  )
}

function TaskList({ tasks, empty, today }: { tasks: SummaryTask[]; empty: string; today: string }) {
  if (!tasks.length) return <p className="p-5 text-sm text-muted-foreground">{empty}</p>
  return (
    <ul className="max-h-96 overflow-y-auto divide-y">
      {tasks.map((task) => (
        <li key={task.id} className="p-4">
          <Link href={`/boards/${task.board.id}`} className="block rounded-sm text-sm font-medium break-words hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" aria-label={`${task.title} — abrir quadro ${task.board.name}`}>{task.title}</Link>
          <p className="mt-1 text-xs break-words text-muted-foreground">{task.board.name} · {task.group.name}</p>
          <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px]">
            {task.task_date ? <time dateTime={task.task_date} className={task.task_date < today && !task.status?.is_completed ? "text-destructive" : "text-muted-foreground"}>{task.task_date === today ? "Hoje · " : ""}{formatDateOnly(task.task_date, true)}</time> : <span className="text-muted-foreground">Sem data</span>}
            <span className="max-w-full rounded bg-muted px-2 py-0.5 break-words" style={task.status ? { backgroundColor: task.status.color, color: statusTextColor(task.status.color) } : undefined}>{task.status?.name ?? "Sem status"}</span>
          </div>
        </li>
      ))}
    </ul>
  )
}

function Progress({ value, label }: { value: number; label: string }) {
  return <div role="progressbar" aria-label={label} aria-valuemin={0} aria-valuemax={100} aria-valuenow={value} className="h-2 overflow-hidden rounded-full bg-muted"><div className="h-full rounded-full bg-primary" style={{ width: `${value}%` }} /></div>
}

export default async function SummaryPage() {
  const data = await getSummaryData()
  const today = summaryToday()
  const summary = data ? buildPlannerSummary(data, today) : null

  return (
    <>
      <PageHeader eyebrow="Panorama" title="Resumo" description="Tenha uma leitura rápida do andamento do workspace em um só lugar." />
      {!summary ? (
        <section role="alert" className="rounded-xl border border-destructive/30 bg-destructive/5 p-5">
          <h2 className="text-sm font-semibold">Não foi possível carregar o resumo</h2>
          <p className="mt-1 text-sm text-muted-foreground">Os dados estão indisponíveis no momento. Tente novamente em instantes.</p>
          <Button className="mt-4" variant="outline" size="sm" render={<a href="/resumo" />}>Tentar novamente</Button>
        </section>
      ) : summary.boards.length === 0 ? (
        <EmptyState icon={BarChart3} title="Ainda não há dados para resumir" description="Crie seu primeiro quadro e adicione tarefas para acompanhar o andamento do trabalho." action={<Button className="mt-5" render={<Link href="/boards" />}>Ir para Quadros</Button>} />
      ) : (
        <>
          <section aria-label="Indicadores do planner" className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {[
              { title: "Total de tarefas", value: summary.total, detail: `${summary.boards.length} quadros`, icon: BarChart3 },
              { title: "Concluídas", value: summary.completed, detail: `${summary.progress}% do total`, icon: CheckCircle2 },
              { title: "Atrasadas", value: summary.overdue.length, detail: "Pendentes com data anterior a hoje", icon: AlertCircle },
              { title: "Sem responsável", value: summary.unassigned.length, detail: "Todas as tarefas sem atribuição", icon: UserRound },
            ].map(({ title, value, detail, icon: Icon }) => (
              <article key={title} className="rounded-xl border bg-card/80 p-4 shadow-sm">
                <div className="flex items-center justify-between gap-2"><h2 className="text-xs font-medium text-muted-foreground">{title}</h2><Icon aria-hidden="true" className="size-4 text-primary" /></div>
                <p className="mt-3 text-3xl font-semibold tabular-nums">{value}</p><p className="mt-1 text-xs text-muted-foreground">{detail}</p>
              </article>
            ))}
          </section>

          {summary.total === 0 && <EmptyState icon={BarChart3} title="Nenhuma tarefa nos quadros" description="Adicione tarefas aos seus quadros para começar a acompanhar prazos, responsáveis e progresso." action={<Button className="mt-5" render={<Link href="/boards" />}>Ir para Quadros</Button>} />}

          <div className="grid items-start gap-4 lg:grid-cols-3">
            <Panel title="Tarefas atrasadas" description="Pendentes, da data mais antiga para a mais recente." icon={AlertCircle} count={summary.overdue.length}><TaskList tasks={summary.overdue} empty="Nenhuma tarefa atrasada. Tudo em dia por aqui." today={today} /></Panel>
            <Panel title="Próximas tarefas" description="Pendentes de hoje em diante, em ordem de data." icon={CalendarDays} count={summary.upcoming.length}><TaskList tasks={summary.upcoming} empty="Nenhuma tarefa pendente agendada de hoje em diante." today={today} /></Panel>
            <Panel title="Sem responsável" description="Tarefas sem atribuição, incluindo as concluídas. Sem data ao final." icon={UserRound} count={summary.unassigned.length}><TaskList tasks={summary.unassigned} empty="Nenhuma tarefa sem responsável." today={today} /></Panel>
          </div>
          <p className="text-xs text-muted-foreground">Referência: {formatDateOnly(today, true)} · Horário de São Paulo. Pendentes sem data: {summary.undated}.</p>

          <section aria-labelledby="board-progress-title" className="min-w-0">
            <h2 id="board-progress-title" className="text-base font-semibold">Progresso por quadro e status</h2>
            <p className="mt-1 text-xs leading-5 text-muted-foreground">A conclusão segue os status marcados como concluídos em cada quadro. As porcentagens por status usam o total do quadro.</p>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              {summary.boards.map((board) => (
                <article key={board.id} className="min-w-0 rounded-xl border bg-card/80 p-4 shadow-sm">
                  <Link href={`/boards/${board.id}`} className="rounded-sm text-sm font-semibold break-words hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">{board.name}</Link>
                  <div className="mt-3 mb-2 flex justify-between gap-2 text-xs text-muted-foreground"><span>{board.completed} de {board.total} concluídas</span><span className="tabular-nums">{board.progress}%</span></div>
                  <Progress value={board.progress} label={`Conclusão do quadro ${board.name}`} />
                  {board.total === 0 ? <p className="mt-4 text-xs text-muted-foreground">Este quadro ainda não tem tarefas.</p> : (
                    <ul className="mt-4 space-y-3">
                      {[...board.statuses, { id: "no-status", name: "Sem status", color: "#64748b", count: board.noStatus, is_completed: false }].map((status) => (
                        <li key={status.id} className="flex items-start gap-2 text-xs">
                          <span aria-hidden="true" className="mt-0.5 size-2.5 shrink-0 rounded-sm" style={{ backgroundColor: status.color }} />
                          <span className="min-w-0 flex-1 break-words">{status.name}{status.is_completed && <span className="text-muted-foreground"> · Concluído</span>}</span>
                          <span className="shrink-0 text-muted-foreground tabular-nums">{status.count} · {Math.round(status.count / board.total * 100)}%</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </article>
              ))}
            </div>
          </section>
        </>
      )}
    </>
  )
}
