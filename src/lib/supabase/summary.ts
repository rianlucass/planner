import "server-only"

import { createSupabaseServerClient } from "@/lib/supabase/server"
import type { SummaryData } from "@/lib/planner-summary"

// Read every page: the API row limit must not silently change dashboard totals.
async function readAll<T>(query: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: { message: string } | null }>): Promise<T[]> {
  const rows: T[] = []
  while (true) {
    const { data, error } = await query(rows.length, rows.length + 499)
    if (error) throw new Error(error.message)
    if (!data?.length) return rows
    rows.push(...data)
  }
}

export async function getSummaryData(): Promise<SummaryData | null> {
  try {
    const supabase = createSupabaseServerClient()
    const [boards, groups, statuses, tasks, assignees] = await Promise.all([
      readAll((from, to) => supabase.from("boards").select("id, name").order("id").range(from, to)),
      readAll((from, to) => supabase.from("groups").select("id, name, board_id").order("id").range(from, to)),
      readAll((from, to) => supabase.from("statuses").select("id, board_id, name, color, is_completed, position").order("id").range(from, to)),
      readAll((from, to) => supabase.from("tasks").select("id, group_id, title, status_id, task_date").order("id").range(from, to)),
      readAll((from, to) => supabase.from("task_assignees").select("task_id, member_id").order("task_id").order("member_id").range(from, to)),
    ])
    return { boards, groups, statuses, tasks, assignees }
  } catch (error) {
    console.error("Erro ao carregar resumo:", error instanceof Error ? error.message : "Erro desconhecido")
    return null
  }
}
