import { EmptyState } from "@/components/planner/empty-state"
import { PageHeader } from "@/components/planner/page-header"
import { CalendarDays } from "lucide-react"

export default function HomePage() {
  return (
    <>
      <PageHeader eyebrow="Visão geral" title="Início" description="Acompanhe o que importa e mantenha o trabalho do time em movimento." />
      <EmptyState icon={CalendarDays} title="Seu espaço está pronto" description="Quando seus quadros começarem a ganhar forma, os próximos itens e atualizações aparecerão aqui." />
    </>
  )
}
