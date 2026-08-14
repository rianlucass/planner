import type { LucideIcon } from "lucide-react"
import type { ReactNode } from "react"

type EmptyStateProps = { icon: LucideIcon; title: string; description: string; action?: ReactNode }

export function EmptyState({ icon: Icon, title, description, action }: EmptyStateProps) {
  return (
    <section className="relative flex min-h-[420px] items-center justify-center overflow-hidden rounded-xl border bg-card/70 p-6 shadow-sm">
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/50 to-transparent" />
      <div className="relative flex max-w-sm flex-col items-center text-center">
        <div className="mb-5 grid size-14 place-items-center rounded-2xl border bg-background shadow-lg shadow-black/20"><Icon className="size-6 text-primary" strokeWidth={1.7} /></div>
        <h2 className="text-base font-semibold tracking-tight">{title}</h2>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">{description}</p>
        {action ?? <span className="mt-5 rounded-full border bg-muted/40 px-3 py-1 text-[11px] font-medium text-muted-foreground">Nenhum item por enquanto</span>}
      </div>
    </section>
  )
}
