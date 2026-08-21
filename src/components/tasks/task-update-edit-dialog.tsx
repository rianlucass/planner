"use client"

import { useState } from "react"
import { Loader2 } from "lucide-react"

import { updateTaskUpdate, type TaskUpdate } from "@/app/boards/[id]/task-details-actions"
import { TaskUpdateEditor } from "@/components/tasks/task-update-editor"
import { Button } from "@/components/ui/button"
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { plainTextTaskUpdateDocument, type TaskUpdateComposerValue } from "@/lib/task-update-content"

export function TaskUpdateEditDialog({ boardId, taskId, update, onCancel, onSaved }: { boardId: string; taskId: string; update: TaskUpdate; onCancel: () => void; onSaved: (update: TaskUpdate) => void }) {
  const initialDocument = update.contentJson ?? plainTextTaskUpdateDocument(update.content)
  const [composer, setComposer] = useState<TaskUpdateComposerValue>({
    document: initialDocument,
    text: update.content,
    isEmpty: !update.content.trim(),
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function save() {
    if (composer.isEmpty || saving) return
    setSaving(true)
    setError(null)
    const result = await updateTaskUpdate(boardId, taskId, update.id, composer.document)
    setSaving(false)

    if (!result.success || !result.update) {
      setError(result.error ?? "Não foi possível salvar as alterações.")
      return
    }

    onSaved(result.update)
  }

  return (
    <Dialog open onOpenChange={(nextOpen) => { if (!nextOpen && !saving) onCancel() }}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Editar atualização</DialogTitle>
          <DialogDescription>Altere o conteúdo e preserve a formatação Rich Text já publicada.</DialogDescription>
        </DialogHeader>

        <div className="min-w-0 max-w-full">
          <TaskUpdateEditor initialContent={initialDocument} onChange={setComposer} disabled={saving} />
        </div>

        {error && <p role="alert" className="max-w-full break-words rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-xs text-destructive">{error}</p>}

        <DialogFooter>
          <DialogClose render={<Button variant="outline" disabled={saving} />}>Cancelar</DialogClose>
          <Button onClick={() => void save()} disabled={composer.isEmpty || saving}>
            {saving && <Loader2 className="animate-spin" />}
            Salvar alterações
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
