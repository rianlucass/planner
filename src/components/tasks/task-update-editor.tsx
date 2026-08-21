"use client"

import { useEffect, useId, useMemo } from "react"
import { EditorContent, useEditor, useEditorState } from "@tiptap/react"
import { Bold, Italic, Link2, List, ListOrdered, Quote, Redo2, RemoveFormatting, Strikethrough, Underline, Undo2 } from "lucide-react"

import { getTaskUpdateExtensions, normalizeTaskUpdateLink, taskUpdateFontSizes } from "@/components/tasks/task-update-extensions"
import type { TaskUpdateComposerValue, TaskUpdateDocument } from "@/lib/task-update-content"
import { emptyTaskUpdateDocument } from "@/lib/task-update-content"
import { cn } from "@/lib/utils"

function ToolbarButton({ label, active = false, disabled = false, onClick, children }: { label: string; active?: boolean; disabled?: boolean; onClick: () => void; children: React.ReactNode }) {
  return <button type="button" title={label} aria-label={label} aria-pressed={active} disabled={disabled} onClick={onClick} className={cn("grid size-8 shrink-0 place-items-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:pointer-events-none disabled:opacity-35", active && "bg-primary/15 text-primary")}>{children}</button>
}

function EditorToolbar({ editor, disabled }: { editor: NonNullable<ReturnType<typeof useEditor>>; disabled: boolean }) {
  const fontSizeId = useId()
  const headingId = useId()
  const state = useEditorState({
    editor,
    selector: ({ editor: current }) => ({
      bold: current.isActive("bold"),
      italic: current.isActive("italic"),
      underline: current.isActive("underline"),
      strike: current.isActive("strike"),
      bulletList: current.isActive("bulletList"),
      orderedList: current.isActive("orderedList"),
      blockquote: current.isActive("blockquote"),
      link: current.isActive("link"),
      heading: current.isActive("heading", { level: 1 }) ? "1" : current.isActive("heading", { level: 2 }) ? "2" : current.isActive("heading", { level: 3 }) ? "3" : "paragraph",
      fontSize: current.getAttributes("textStyle").fontSize || "16px",
      canUndo: current.can().chain().undo().run(),
      canRedo: current.can().chain().redo().run(),
      isEmpty: current.isEmpty,
    }),
  })

  function editLink() {
    const previous = editor.getAttributes("link").href as string | undefined
    const value = window.prompt("Informe a URL do link:", previous ?? "https://")
    if (value === null) return
    if (!value.trim()) {
      editor.chain().focus().extendMarkRange("link").unsetLink().run()
      return
    }
    const href = normalizeTaskUpdateLink(value.trim())
    if (!href) {
      window.alert("Informe uma URL HTTP, HTTPS ou de e-mail válida.")
      return
    }
    editor.chain().focus().extendMarkRange("link").setLink({ href }).run()
  }

  const controlsDisabled = disabled || !state

  return (
    <div className="max-w-full overflow-x-auto overscroll-x-contain border-b bg-muted/15 p-1.5" aria-label="Formatação do texto">
      <div className="flex w-max min-w-full items-center gap-0.5">
        <ToolbarButton label="Negrito" active={state?.bold} disabled={controlsDisabled} onClick={() => editor.chain().focus().toggleBold().run()}><Bold className="size-3.5" /></ToolbarButton>
        <ToolbarButton label="Itálico" active={state?.italic} disabled={controlsDisabled} onClick={() => editor.chain().focus().toggleItalic().run()}><Italic className="size-3.5" /></ToolbarButton>
        <ToolbarButton label="Sublinhado" active={state?.underline} disabled={controlsDisabled} onClick={() => editor.chain().focus().toggleUnderline().run()}><Underline className="size-3.5" /></ToolbarButton>
        <ToolbarButton label="Tachado" active={state?.strike} disabled={controlsDisabled} onClick={() => editor.chain().focus().toggleStrike().run()}><Strikethrough className="size-3.5" /></ToolbarButton>

        <span className="mx-1 h-5 w-px shrink-0 bg-border" />
        <label className="sr-only" htmlFor={fontSizeId}>Tamanho da fonte</label>
        <select id={fontSizeId} value={taskUpdateFontSizes.includes(state?.fontSize as typeof taskUpdateFontSizes[number]) ? state?.fontSize : "16px"} disabled={controlsDisabled} onChange={(event) => editor.chain().focus().setFontSize(event.target.value).run()} className="h-8 shrink-0 rounded-md border bg-background px-2 text-[11px] outline-none focus:ring-2 focus:ring-ring/30">
          {taskUpdateFontSizes.map((size) => <option key={size} value={size}>{size}</option>)}
        </select>
        <label className="sr-only" htmlFor={headingId}>Tipo de texto</label>
        <select id={headingId} value={state?.heading ?? "paragraph"} disabled={controlsDisabled} onChange={(event) => { const value = event.target.value; if (value === "paragraph") editor.chain().focus().setParagraph().run(); else editor.chain().focus().setHeading({ level: Number(value) as 1 | 2 | 3 }).run() }} className="h-8 w-24 shrink-0 rounded-md border bg-background px-2 text-[11px] outline-none focus:ring-2 focus:ring-ring/30">
          <option value="paragraph">Normal</option><option value="1">Título 1</option><option value="2">Título 2</option><option value="3">Título 3</option>
        </select>

        <span className="mx-1 h-5 w-px shrink-0 bg-border" />
        <ToolbarButton label="Lista com marcadores" active={state?.bulletList} disabled={controlsDisabled} onClick={() => editor.chain().focus().toggleBulletList().run()}><List className="size-3.5" /></ToolbarButton>
        <ToolbarButton label="Lista numerada" active={state?.orderedList} disabled={controlsDisabled} onClick={() => editor.chain().focus().toggleOrderedList().run()}><ListOrdered className="size-3.5" /></ToolbarButton>
        <ToolbarButton label="Citação" active={state?.blockquote} disabled={controlsDisabled} onClick={() => editor.chain().focus().toggleBlockquote().run()}><Quote className="size-3.5" /></ToolbarButton>
        <ToolbarButton label="Link" active={state?.link} disabled={controlsDisabled || Boolean(state?.isEmpty)} onClick={editLink}><Link2 className="size-3.5" /></ToolbarButton>

        <span className="mx-1 h-5 w-px shrink-0 bg-border" />
        <ToolbarButton label="Desfazer" disabled={controlsDisabled || !state?.canUndo} onClick={() => editor.chain().focus().undo().run()}><Undo2 className="size-3.5" /></ToolbarButton>
        <ToolbarButton label="Refazer" disabled={controlsDisabled || !state?.canRedo} onClick={() => editor.chain().focus().redo().run()}><Redo2 className="size-3.5" /></ToolbarButton>
        <ToolbarButton label="Limpar formatação" disabled={controlsDisabled || Boolean(state?.isEmpty)} onClick={() => editor.chain().focus().unsetAllMarks().clearNodes().run()}><RemoveFormatting className="size-3.5" /></ToolbarButton>
      </div>
    </div>
  )
}

export function TaskUpdateEditor({ initialContent = emptyTaskUpdateDocument, onChange, onPasteImages, disabled = false }: { initialContent?: TaskUpdateDocument; onChange: (value: TaskUpdateComposerValue) => void; onPasteImages?: (files: File[]) => void; disabled?: boolean }) {
  const extensions = useMemo(() => getTaskUpdateExtensions(), [])
  const editor = useEditor({
    immediatelyRender: false,
    extensions,
    content: initialContent,
    editorProps: {
      attributes: { class: "tiptap rich-text-content rich-text-editor-content min-h-36 px-3 py-3 outline-none" },
      handlePaste: (_view, event) => {
        if (!onPasteImages) return false
        const images = Array.from(event.clipboardData?.files ?? []).filter((file) => file.type.startsWith("image/"))
        if (!images.length) return false
        onPasteImages(images)
        return true
      },
    },
    onUpdate: ({ editor: current }) => onChange({ document: current.getJSON(), text: current.getText({ blockSeparator: "\n" }), isEmpty: current.isEmpty }),
  })

  const editorState = useEditorState({ editor, selector: ({ editor: current }) => ({ isEmpty: current?.isEmpty ?? true }) })
  useEffect(() => { editor?.setEditable(!disabled) }, [disabled, editor])

  if (!editor) return <div className="min-h-44 animate-pulse rounded-lg border bg-muted/10" />

  return (
    <div className={cn("min-w-0 max-w-full overflow-hidden rounded-lg border border-input bg-background/50 transition-shadow focus-within:border-ring focus-within:ring-2 focus-within:ring-ring/30", disabled && "opacity-60")}>
      <EditorToolbar editor={editor} disabled={disabled} />
      <div className="relative min-w-0 max-w-full">
        {editorState?.isEmpty && <span className="pointer-events-none absolute top-3 left-3 right-3 text-sm text-muted-foreground">Escreva um roteiro, observação, link ou referência...</span>}
        <EditorContent editor={editor} />
      </div>
    </div>
  )
}

export function TaskUpdateRichContent({ content }: { content: TaskUpdateDocument }) {
  const extensions = useMemo(() => getTaskUpdateExtensions(), [])
  const editor = useEditor({ immediatelyRender: false, extensions, content, editable: false, editorProps: { attributes: { class: "tiptap rich-text-content min-w-0 max-w-full outline-none" } } })
  useEffect(() => { editor?.commands.setContent(content, { emitUpdate: false }) }, [content, editor])
  return <EditorContent editor={editor} />
}
