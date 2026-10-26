"use client"

import { useRef, useState } from "react"
import { DragDropProvider, DragOverlay } from "@dnd-kit/react"
import { isSortable } from "@dnd-kit/react/sortable"
import { move } from "@dnd-kit/helpers"

import { reorderGroups } from "@/app/boards/[id]/actions"
import { moveTask } from "@/app/boards/[id]/task-actions"
import { GroupSection } from "@/components/groups/group-controls"
import type { BoardStatus } from "@/components/statuses/status-controls"
import type { Member } from "@/lib/members"

export type PlannerTask = { id: string; title: string; position: number; status_id: string | null; task_date: string | null; assignee_ids: string[] }
export type PlannerGroup = { id: string; name: string; color: string | null; position: number; tasks: PlannerTask[] }
type TaskBuckets = Record<string, PlannerTask[]>

function createBuckets(groups: PlannerGroup[]): TaskBuckets {
  return Object.fromEntries(groups.map((group) => [group.id, group.tasks]))
}

function cloneBuckets(buckets: TaskBuckets): TaskBuckets {
  return Object.fromEntries(Object.entries(buckets).map(([groupId, tasks]) => [groupId, [...tasks]]))
}

function findTaskGroup(buckets: TaskBuckets, taskId: string) {
  return Object.keys(buckets).find((groupId) => buckets[groupId].some((task) => task.id === taskId))
}

export function TaskDndBoard({ boardId, groups, statuses, members, boardMemberIds }: { boardId: string; groups: PlannerGroup[]; statuses: BoardStatus[]; members: Member[]; boardMemberIds: string[] }) {
  const initialBuckets = createBuckets(groups)
  const [buckets, setBuckets] = useState<TaskBuckets>(initialBuckets)
  const [saving, setSaving] = useState(false)
  const [groupOrder, setGroupOrder] = useState(() => groups.map((group) => group.id))
  const savingRef = useRef(false)
  const groupTargetRef = useRef<string | null>(null)
  const [groupDropTarget, setGroupDropTarget] = useState<{ id: string; edge: "before" | "after" } | null>(null)
  const [error, setError] = useState<string | null>(null)
  const bucketsRef = useRef(initialBuckets)
  const snapshotRef = useRef(initialBuckets)
  const boardMemberSet = new Set(boardMemberIds)
  const boardMembers = members.filter((member) => boardMemberSet.has(member.id))

  function updateBuckets(next: TaskBuckets) {
    bucketsRef.current = next
    setBuckets(next)
  }

  return (
    <DragDropProvider
      onBeforeDragStart={(event) => { if (savingRef.current) event.preventDefault() }}
      onDragStart={() => {
        groupTargetRef.current = null
        setGroupDropTarget(null)
        snapshotRef.current = cloneBuckets(bucketsRef.current)
        setError(null)
      }}
      onDragOver={(event) => {
        if (event.operation.source?.type === "board-group") {
          // Keep sections in place while dragging; React owns the final reorder.
          // This avoids direct DOM sorting interfering with failure rollback.
          event.preventDefault()
          const { source, target } = event.operation
          if (target?.type === "board-group" && target.id !== source.id) {
            const id = String(target.data.groupId)
            groupTargetRef.current = id
            setGroupDropTarget({ id, edge: groupOrder.indexOf(String(source.data.groupId)) < groupOrder.indexOf(id) ? "after" : "before" })
          } else {
            groupTargetRef.current = null
            setGroupDropTarget(null)
          }
          return
        }
        if (event.operation.source?.type !== "task") return
        const next = move(bucketsRef.current, event)
        updateBuckets(next)
      }}
      onDragEnd={(event) => {
        const { source } = event.operation
        if (source?.type === "board-group") {
          setGroupDropTarget(null)
          if (event.canceled || !isSortable(source) || source.group !== boardId) return
          const previousOrder = groupOrder
          const from = previousOrder.indexOf(String(source.data.groupId))
          const to = previousOrder.indexOf(groupTargetRef.current ?? "")
          if (from < 0 || to < 0 || from === to) return
          const nextOrder = [...previousOrder]
          const [id] = nextOrder.splice(from, 1)
          nextOrder.splice(to, 0, id)
          setGroupOrder(nextOrder)
          setSaving(true)
          savingRef.current = true
          void reorderGroups({ boardId, groupIds: nextOrder }).then((result) => {
            if (!result.success) {
              setGroupOrder(previousOrder)
              setError(result.error)
            }
          }).catch(() => {
            setGroupOrder(previousOrder)
            setError("Não foi possível salvar a ordem dos grupos. Tente novamente.")
          }).finally(() => { savingRef.current = false; setSaving(false) })
          return
        }
        if (source?.type !== "task") return
        const taskId = String(event.operation.source?.id ?? "")
        const sourceGroupId = findTaskGroup(snapshotRef.current, taskId)
        const destinationGroupId = findTaskGroup(bucketsRef.current, taskId)

        if (event.canceled || !event.operation.target || !sourceGroupId || !destinationGroupId) {
          updateBuckets(snapshotRef.current)
          return
        }

        const sourcePosition = snapshotRef.current[sourceGroupId].findIndex((task) => task.id === taskId)
        const destinationPosition = bucketsRef.current[destinationGroupId].findIndex((task) => task.id === taskId)
        if (sourcePosition === destinationPosition && sourceGroupId === destinationGroupId) return

        const optimisticLayout = cloneBuckets(bucketsRef.current)
        setSaving(true)
        savingRef.current = true
        void moveTask({ boardId, taskId, sourceGroupId, destinationGroupId, destinationPosition }).then((result) => {
          setSaving(false)
          savingRef.current = false
          if (!result.success) {
            updateBuckets(snapshotRef.current)
            setError(result.error ?? "Não foi possível salvar a movimentação.")
            return
          }
          updateBuckets(optimisticLayout)
        }).catch(() => {
          updateBuckets(snapshotRef.current)
          setError("Não foi possível salvar a movimentação.")
          savingRef.current = false
          setSaving(false)
        })
      }}
    >
      <div className="grid w-full min-w-0 max-w-full gap-4">
        {error && <p role="alert" className="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-xs text-destructive">{error}</p>}
        {groupOrder.map((id, index) => {
          const group = groups.find((item) => item.id === id)!
          return <GroupSection key={group.id} boardId={boardId} index={index} dropEdge={groupDropTarget?.id === id ? groupDropTarget.edge : undefined} group={{ ...group, tasks: buckets[group.id] ?? [] }} statuses={statuses} members={boardMembers} allMembers={members} boardMemberIds={boardMemberIds} dndDisabled={saving} />
        })}
      </div>
      <DragOverlay disabled={(source) => source?.type !== "board-group"} dropAnimation={null} style={{ height: 44 }}>
        {(source) => <div className="flex h-11 min-w-0 items-center gap-2 rounded-lg border border-primary/50 bg-card px-4 shadow-xl" style={{ borderLeftWidth: 3, borderLeftColor: source.data.color ?? "#6366f1" }}><span className="size-2.5 shrink-0 rounded-full" style={{ backgroundColor: source.data.color ?? "#6366f1" }} /><span className="truncate text-sm font-semibold">{source.data.name}</span><span className="shrink-0 text-xs text-muted-foreground">— {source.data.count}</span></div>}
      </DragOverlay>
    </DragDropProvider>
  )
}
