import assert from "node:assert/strict"
import test from "node:test"

import { buildPlannerSummary, summaryToday } from "../src/lib/planner-summary.ts"

function fixture() {
  return {
    boards: [{ id: "a", name: "Conteúdo" }, { id: "b", name: "Campanhas" }, { id: "empty", name: "Vazio" }],
    groups: [{ id: "ga", board_id: "a", name: "Produção" }, { id: "gb", board_id: "b", name: "Planejamento" }],
    statuses: [
      { id: "done-a", board_id: "a", name: "Publicado", color: "#22c55e", is_completed: true, position: 1 },
      { id: "todo-a", board_id: "a", name: "Publicado", color: "#64748b", is_completed: false, position: 0 },
      { id: "done-b", board_id: "b", name: "Publicado", color: "#22c55e", is_completed: true, position: 0 },
    ],
    tasks: [
      { id: "future", group_id: "ga", title: "Futuro", status_id: "todo-a", task_date: "2026-10-01" },
      { id: "today", group_id: "ga", title: "Hoje", status_id: null, task_date: "2026-09-09" },
      { id: "late", group_id: "ga", title: "Atrasada", status_id: "todo-a", task_date: "2026-09-08" },
      { id: "older", group_id: "ga", title: "Mais antiga", status_id: null, task_date: "2025-12-31" },
      { id: "done", group_id: "ga", title: "Concluída", status_id: "done-a", task_date: "2026-01-01" },
      { id: "undated", group_id: "ga", title: "Sem data", status_id: null, task_date: null },
      { id: "done-future", group_id: "gb", title: "Concluída futura", status_id: "done-b", task_date: "2026-10-01" },
    ],
    assignees: [{ task_id: "late", member_id: "m1" }, { task_id: "late", member_id: "m2" }],
  }
}

test("separa atrasadas e próximas sem incluir concluídas nem tarefas sem data", () => {
  const result = buildPlannerSummary(fixture(), "2026-09-09")
  assert.deepEqual(result.overdue.map((task) => task.id), ["older", "late"])
  assert.deepEqual(result.upcoming.map((task) => task.id), ["today", "future"])
  assert.equal(result.undated, 1)
  assert.equal(result.total, 7)
  assert.equal(result.completed, 2)
  assert.equal(result.progress, 29)
})

test("responsáveis múltiplos não duplicam tarefas; sem responsável inclui concluídas", () => {
  const result = buildPlannerSummary(fixture(), "2026-09-09")
  assert.equal(result.unassigned.length, 6)
  assert.ok(result.unassigned.some((task) => task.id === "done"))
  assert.ok(!result.unassigned.some((task) => task.id === "late"))
  assert.equal(result.unassigned.at(-1).id, "undated")
})

test("progresso usa is_completed e mantém status homônimos separados por quadro", () => {
  const result = buildPlannerSummary(fixture(), "2026-09-09")
  const a = result.boards.find((board) => board.id === "a")
  const b = result.boards.find((board) => board.id === "b")
  assert.equal(a.total, 6)
  assert.equal(a.completed, 1)
  assert.equal(a.progress, 17)
  assert.equal(a.noStatus, 3)
  assert.deepEqual(a.statuses.map((status) => [status.id, status.count]), [["todo-a", 2], ["done-a", 1]])
  assert.equal(b.progress, 100)
  for (const board of result.boards) {
    assert.equal(board.statuses.reduce((total, status) => total + status.count, board.noStatus), board.total)
  }
})

test("workspace e quadros vazios mantêm progresso zero", () => {
  const result = buildPlannerSummary({ boards: [], groups: [], tasks: [], statuses: [], assignees: [] }, "2026-09-09")
  assert.equal(result.total, 0)
  assert.equal(result.progress, 0)
  assert.deepEqual(result.boards, [])
  const empty = buildPlannerSummary(fixture(), "2026-09-09").boards.find((board) => board.id === "empty")
  assert.equal(empty.total, 0)
  assert.equal(empty.progress, 0)
})

test("status removido ou de outro quadro conta como sem status", () => {
  const data = fixture()
  data.tasks[0].status_id = "removed"
  data.tasks[1].status_id = "done-b"
  const result = buildPlannerSummary(data, "2026-09-09")
  assert.deepEqual(result.upcoming.map((task) => task.id), ["today", "future"])
  assert.equal(result.boards.find((board) => board.id === "a").noStatus, 4)
})

test("hoje respeita a virada do dia em São Paulo, independente do fuso do servidor", () => {
  assert.equal(summaryToday(new Date("2026-09-10T02:59:59Z")), "2026-09-09")
  assert.equal(summaryToday(new Date("2026-09-10T03:00:00Z")), "2026-09-10")
  assert.equal(summaryToday(new Date("2027-01-01T01:00:00Z")), "2026-12-31")
})
