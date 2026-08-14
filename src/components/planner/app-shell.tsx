import type { ReactNode } from "react"
import { AppSidebar } from "@/components/planner/app-sidebar"
import { Topbar } from "@/components/planner/topbar"

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-background">
      <AppSidebar className="fixed inset-y-0 left-0 z-30 hidden w-60 md:flex" />
      <div className="min-h-screen md:pl-60">
        <Topbar />
        <main className="surface-grid min-h-[calc(100vh-3.5rem)] px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
          <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">{children}</div>
        </main>
      </div>
    </div>
  )
}
