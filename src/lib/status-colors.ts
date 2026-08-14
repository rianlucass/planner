export const statusColors = [
  "#64748b",
  "#6366f1",
  "#8b5cf6",
  "#a855f7",
  "#d946ef",
  "#ec4899",
  "#f43f5e",
  "#ef4444",
  "#f97316",
  "#f59e0b",
  "#84cc16",
  "#22c55e",
  "#14b8a6",
  "#06b6d4",
] as const

export type StatusColor = (typeof statusColors)[number]

export function statusTextColor(color: string) {
  return color === "#f59e0b" || color === "#84cc16" || color === "#06b6d4" ? "#111827" : "#ffffff"
}
