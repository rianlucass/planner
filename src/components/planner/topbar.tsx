import { Search } from "lucide-react"
import { MobileNavigation } from "@/components/planner/mobile-navigation"

export function Topbar() {
  return (
    <header className="sticky top-0 z-20 flex h-14 items-center justify-between border-b bg-background/90 px-4 backdrop-blur-md sm:px-6">
      <div className="flex items-center gap-2 md:hidden"><MobileNavigation /><span className="text-sm font-semibold">Plano</span></div>
      <div className="hidden items-center gap-2 text-xs text-muted-foreground md:flex"><span className="size-1.5 rounded-full bg-emerald-400" />Workspace disponível</div>
      <div className="flex h-8 w-8 items-center justify-center rounded-md border bg-card text-muted-foreground sm:w-56 sm:justify-start sm:gap-2 sm:px-2.5">
        <Search className="size-3.5" /><span className="hidden text-xs sm:inline">Buscar no workspace</span><kbd className="ml-auto hidden rounded border bg-muted px-1.5 py-0.5 font-mono text-[10px] lg:inline">⌘ K</kbd>
      </div>
    </header>
  )
}
