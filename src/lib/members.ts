export type Member = {
  id: string
  name: string
  role: string | null
  email: string | null
  avatar_url: string | null
}

export function memberInitials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return "?"
  if (parts.length === 1) return parts[0].slice(0, 1).toLocaleUpperCase("pt-BR")
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toLocaleUpperCase("pt-BR")
}
