import { EmptyState } from "@/components/planner/empty-state"
import { PageHeader } from "@/components/planner/page-header"
import { BarChart3 } from "lucide-react"

export const metadata = { title: "Resumo" }

export default function SummaryPage() {
  return <><PageHeader eyebrow="Panorama" title="Resumo" description="Tenha uma leitura rápida do andamento do workspace em um só lugar." /><EmptyState icon={BarChart3} title="Ainda não há dados para resumir" description="Indicadores e visões gerais aparecerão aqui conforme o workspace receber conteúdo." /></>
}
