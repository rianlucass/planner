export type SummaryBoard = { id: string; name: string }
export type SummaryGroup = { id: string; name: string; board_id: string }
export type SummaryStatus = { id: string; board_id: string; name: string; color: string; is_completed: boolean; position: number }
export type SummaryTaskRow = { id: string; group_id: string; title: string; status_id: string | null; task_date: string | null }
export type SummaryData = {
  boards: SummaryBoard[]
  groups: SummaryGroup[]
  statuses: SummaryStatus[]
  tasks: SummaryTaskRow[]
  assignees: { task_id: string; member_id: string }[]
}
export type SummaryTask = SummaryTaskRow & { board: SummaryBoard; group: SummaryGroup; status: SummaryStatus | null }

export function summaryToday(now = new Date()) {
  const parts = new Intl.DateTimeFormat("en-US", { timeZone: "America/Sao_Paulo", year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(now)
  return ["year", "month", "day"].map((type) => parts.find((part) => part.type === type)!.value).join("-")
}

export function buildPlannerSummary(data: SummaryData, today: string) {
  const boards = new Map(data.boards.map((board) => [board.id, board]))
  const groups = new Map(data.groups.map((group) => [group.id, group]))
  const statuses = new Map(data.statuses.map((status) => [status.id, status]))
  const assigned = new Set(data.assignees.map((assignee) => assignee.task_id))
  const tasks: SummaryTask[] = []
  for (const task of data.tasks) {
    const group = groups.get(task.group_id)
    const board = group && boards.get(group.board_id)
    if (!group || !board) continue
    const status = task.status_id ? statuses.get(task.status_id) : null
    tasks.push({ ...task, group, board, status: status?.board_id === board.id ? status : null })
  }

  // ISO date-only strings preserve calendar ordering without UTC conversion.
  const byDate = (a: SummaryTask, b: SummaryTask) => (a.task_date ?? "9999-12-31").localeCompare(b.task_date ?? "9999-12-31") || a.title.localeCompare(b.title, "pt-BR") || a.id.localeCompare(b.id)
  const pending = tasks.filter((task) => !task.status?.is_completed).sort(byDate)
  const completed = tasks.length - pending.length
  const tasksByBoard = new Map<string, SummaryTask[]>()
  const statusCounts = new Map<string, number>()
  for (const task of tasks) {
    const boardTasks = tasksByBoard.get(task.board.id) ?? []
    boardTasks.push(task)
    tasksByBoard.set(task.board.id, boardTasks)
    if (task.status) statusCounts.set(task.status.id, (statusCounts.get(task.status.id) ?? 0) + 1)
  }

  return {
    total: tasks.length,
    completed,
    progress: tasks.length ? Math.round(completed / tasks.length * 100) : 0,
    overdue: pending.filter((task) => task.task_date && task.task_date < today),
    upcoming: pending.filter((task) => task.task_date && task.task_date >= today),
    unassigned: tasks.filter((task) => !assigned.has(task.id)).sort(byDate),
    undated: pending.filter((task) => !task.task_date).length,
    boards: [...data.boards].sort((a, b) => a.name.localeCompare(b.name, "pt-BR") || a.id.localeCompare(b.id)).map((board) => {
      const boardTasks = tasksByBoard.get(board.id) ?? []
      const done = boardTasks.filter((task) => task.status?.is_completed).length
      return {
        ...board,
        total: boardTasks.length,
        completed: done,
        progress: boardTasks.length ? Math.round(done / boardTasks.length * 100) : 0,
        statuses: data.statuses.filter((status) => status.board_id === board.id).sort((a, b) => a.position - b.position || a.id.localeCompare(b.id)).map((status) => ({ ...status, count: statusCounts.get(status.id) ?? 0 })),
        noStatus: boardTasks.filter((task) => !task.status).length,
      }
    }),
  }
}
