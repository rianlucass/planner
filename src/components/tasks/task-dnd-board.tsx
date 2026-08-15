"use client"

import { useRef, useState } from "react"
import { DragDropProvider } from "@dnd-kit/react"
import { move } from "@dnd-kit/helpers"

import { moveTask } from "@/app/boards/[id]/task-actions"
import { GroupSection } from "@/components/groups/group-controls"
import type { BoardStatus } from "@/components/statuses/status-controls"

export type PlannerTask = { id: string; title: string; position: number; status_id: string | null }
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

export function TaskDndBoard({ boardId, groups, statuses }: { boardId: string; groups: PlannerGroup[]; statuses: BoardStatus[] }) {
  const initialBuckets = createBuckets(groups)
  const [buckets, setBuckets] = useState<TaskBuckets>(initialBuckets)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const bucketsRef = useRef(initialBuckets)
  const snapshotRef = useRef(initialBuckets)

  function updateBuckets(next: TaskBuckets) {
    bucketsRef.current = next
    setBuckets(next)
  }

  return (
    <DragDropProvider
      onDragStart={() => {
        snapshotRef.current = cloneBuckets(bucketsRef.current)
        setError(null)
      }}
      onDragOver={(event) => {
        const next = move(bucketsRef.current, event)
        updateBuckets(next)
      }}
      onDragEnd={(event) => {
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
        void moveTask({ boardId, taskId, sourceGroupId, destinationGroupId, destinationPosition }).then((result) => {
          setSaving(false)
          if (!result.success) {
            updateBuckets(snapshotRef.current)
            setError(result.error ?? "Não foi possível salvar a movimentação.")
            return
          }
          updateBuckets(optimisticLayout)
        })
      }}
    >
      <div className="grid w-full min-w-0 max-w-full gap-4">
        {error && <p role="alert" className="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-xs text-destructive">{error}</p>}
        {groups.map((group) => <GroupSection key={group.id} boardId={boardId} group={{ ...group, tasks: buckets[group.id] ?? [] }} statuses={statuses} dndDisabled={saving} />)}
      </div>
    </DragDropProvider>
  )
}
