import { BarChart3, Home, LayoutGrid, Users } from "lucide-react"

export const navigation = [
  { label: "Início", href: "/", icon: Home },
  { label: "Quadros", href: "/boards", icon: LayoutGrid },
  { label: "Resumo", href: "/resumo", icon: BarChart3 },
  { label: "Equipe", href: "/equipe", icon: Users },
] as const
