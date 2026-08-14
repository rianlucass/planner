import { EmptyState } from "@/components/planner/empty-state"
import { PageHeader } from "@/components/planner/page-header"
import { Users } from "lucide-react"

export const metadata = { title: "Equipe" }

export default function TeamPage() {
  return <><PageHeader eyebrow="Colaboração" title="Equipe" description="Visualize as pessoas que fazem parte do workspace e mantenha todos alinhados." /><EmptyState icon={Users} title="Seu time aparecerá aqui" description="Este espaço está preparado para receber os membros da equipe quando essa etapa for configurada." /></>
}
