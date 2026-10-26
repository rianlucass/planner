import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { test } from "node:test"
import vm from "node:vm"
import ts from "typescript"

const boardId = "11111111-1111-4111-8111-111111111111"
const ids = [1, 2, 3, 4].map((n) => `22222222-2222-4222-8222-${String(n).padStart(12, "0")}`)

function loadAction(rpc = async () => ({ error: null })) {
  const exports = {}
  const calls = []
  const source = readFileSync(new URL("../src/app/boards/[id]/actions.ts", import.meta.url), "utf8")
  const code = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText
  vm.runInNewContext(code, { exports, console, require: (name) => {
    if (name === "next/cache") return { revalidatePath() {} }
    if (name === "@/lib/supabase/server") return { createSupabaseServerClient: () => ({ rpc: (...args) => { calls.push(args); return rpc(...args) } }) }
    throw new Error(`Unexpected import: ${name}`)
  } })
  return { action: exports.reorderGroups, calls }
}

test("reorderGroups rejects malformed input and duplicate IDs before accessing the database", async () => {
  const { action, calls } = loadAction()
  assert.equal(typeof action, "function")
  for (const input of [null, {}, { boardId: "bad", groupIds: ids }, { boardId, groupIds: [] }, { boardId, groupIds: [ids[0], ids[0]] }, { boardId, groupIds: [42] }]) {
    assert.equal((await action(input)).success, false)
  }
  assert.equal(calls.length, 0)
})

test("reorderGroups sends the complete final order in one atomic RPC", async () => {
  const { action, calls } = loadAction()
  const groupIds = [ids[0], ids[3], ids[1], ids[2]]
  assert.equal((await action({ boardId, groupIds })).success, true)
  assert.equal(calls.length, 1)
  assert.equal(calls[0][0], "reorder_groups")
  assert.equal(JSON.stringify(calls[0][1]), JSON.stringify({ p_board_id: boardId, p_group_ids: groupIds }))
})

test("database rejection and connection failures return a recoverable error", async () => {
  for (const rpc of [async () => ({ error: { message: "Invalid board membership" } }), async () => { throw new Error("offline") }]) {
    const { action } = loadAction(rpc)
    const result = await action({ boardId, groupIds: ids })
    assert.equal(result.success, false)
    assert.ok(result.error)
  }
})
