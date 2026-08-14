"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { Layers3 } from "lucide-react"
import { navigation } from "@/components/planner/navigation"
import { cn } from "@/lib/utils"

type AppSidebarProps = { className?: string; onNavigate?: () => void }

export function AppSidebar({ className, onNavigate }: AppSidebarProps) {
  const pathname = usePathname()
  return (
    <aside className={cn("flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground", className)}>
      <div className="flex h-14 items-center gap-2.5 border-b border-sidebar-border px-4">
        <span className="grid size-7 place-items-center rounded-lg bg-primary text-primary-foreground shadow-sm shadow-primary/20"><Layers3 className="size-4" /></span>
        <span className="text-sm font-semibold tracking-tight">Plano</span>
      </div>
      <div className="flex-1 px-3 py-5">
        <p className="mb-2 px-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">Workspace</p>
        <nav aria-label="Navegação principal" className="space-y-1">
          {navigation.map((item) => {
            const isActive = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href)
            const Icon = item.icon
            return (
              <Link key={item.href} href={item.href} onClick={onNavigate} aria-current={isActive ? "page" : undefined}
                className={cn("group flex h-9 items-center gap-3 rounded-md px-2.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground", isActive && "bg-sidebar-accent text-sidebar-accent-foreground shadow-[inset_2px_0_0_var(--sidebar-primary)]")}>
                <Icon className={cn("size-4", isActive && "text-sidebar-primary")} />{item.label}
              </Link>
            )
          })}
        </nav>
      </div>
      <div className="border-t border-sidebar-border p-3">
        <div className="flex items-center gap-3 rounded-lg bg-sidebar-accent/50 px-3 py-2.5">
          <span className="grid size-7 shrink-0 place-items-center rounded-md bg-violet-500/15 text-xs font-semibold text-violet-300">P</span>
          <div className="min-w-0"><p className="truncate text-xs font-medium">Meu workspace</p><p className="truncate text-[11px] text-muted-foreground">Planejamento</p></div>
        </div>
      </div>
    </aside>
  )
}
