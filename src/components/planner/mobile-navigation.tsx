"use client"

import { useState } from "react"
import { Menu } from "lucide-react"
import { AppSidebar } from "@/components/planner/app-sidebar"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetDescription, SheetTitle, SheetTrigger } from "@/components/ui/sheet"

export function MobileNavigation() {
  const [open, setOpen] = useState(false)
  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger render={<Button variant="ghost" size="icon-sm" aria-label="Abrir navegação" />}><Menu /></SheetTrigger>
      <SheetContent side="left" className="w-64 gap-0 p-0" showCloseButton={false}>
        <SheetTitle className="sr-only">Navegação</SheetTitle>
        <SheetDescription className="sr-only">Acesse as áreas do planner.</SheetDescription>
        <AppSidebar className="flex h-full w-full" onNavigate={() => setOpen(false)} />
      </SheetContent>
    </Sheet>
  )
}
