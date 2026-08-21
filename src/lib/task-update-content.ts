import type { JSONContent } from "@tiptap/core"

export type TaskUpdateDocument = JSONContent

export type TaskUpdateComposerValue = {
  document: TaskUpdateDocument
  text: string
  isEmpty: boolean
}

export const emptyTaskUpdateDocument: TaskUpdateDocument = {
  type: "doc",
  content: [{ type: "paragraph" }],
}

export function plainTextTaskUpdateDocument(value: string): TaskUpdateDocument {
  const lines = value.replace(/\r\n?/g, "\n").split("\n")

  return {
    type: "doc",
    content: lines.map((line) => ({
      type: "paragraph",
      ...(line ? { content: [{ type: "text", text: line }] } : {}),
    })),
  }
}

const allowedFontSizes = new Set(["14px", "16px", "18px", "20px", "24px"])
const inlineNodeTypes = new Set(["text", "hardBreak"])
const blockNodeTypes = new Set(["paragraph", "heading", "bulletList", "orderedList", "blockquote"])
const simpleMarkTypes = new Set(["bold", "italic", "underline", "strike"])
const maxNodes = 20_000
const maxDepth = 30
const maxTextLength = 500_000
const maxJsonLength = 900_000

type SanitizeContext = { nodes: number }

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value)
}

function isSafeHref(value: string) {
  if (value.length > 2_048) return false
  try {
    const protocol = new URL(value).protocol
    return protocol === "http:" || protocol === "https:" || protocol === "mailto:"
  } catch {
    return false
  }
}

function sanitizeMarks(value: unknown): JSONContent["marks"] {
  if (!Array.isArray(value)) return undefined

  const marks: NonNullable<JSONContent["marks"]> = []
  for (const mark of value) {
    if (!isRecord(mark) || typeof mark.type !== "string") continue
    if (simpleMarkTypes.has(mark.type)) {
      marks.push({ type: mark.type })
      continue
    }
    if (mark.type === "textStyle") {
      if (isRecord(mark.attrs) && typeof mark.attrs.fontSize === "string" && allowedFontSizes.has(mark.attrs.fontSize)) {
        marks.push({ type: "textStyle", attrs: { fontSize: mark.attrs.fontSize } })
      }
      continue
    }
    if (mark.type === "link") {
      if (isRecord(mark.attrs) && typeof mark.attrs.href === "string" && isSafeHref(mark.attrs.href)) {
        marks.push({ type: "link", attrs: { href: mark.attrs.href, target: "_blank", rel: "noopener noreferrer" } })
      }
      continue
    }
  }
  return marks
}

function sanitizeChildren(value: unknown, allowedTypes: Set<string>, context: SanitizeContext, depth: number) {
  if (value === undefined) return []
  if (!Array.isArray(value)) return null
  const children: JSONContent[] = []
  for (const child of value) {
    const sanitized = sanitizeNode(child, context, depth + 1)
    if (!sanitized || !sanitized.type || !allowedTypes.has(sanitized.type)) return null
    children.push(sanitized)
  }
  return children
}

function sanitizeNode(value: unknown, context: SanitizeContext, depth: number): JSONContent | null {
  if (!isRecord(value) || typeof value.type !== "string" || depth > maxDepth || ++context.nodes > maxNodes) return null

  if (value.type === "text") {
    if (typeof value.text !== "string" || value.text.length === 0) return null
    const marks = sanitizeMarks(value.marks)
    return { type: "text", text: value.text, ...(marks?.length ? { marks } : {}) }
  }

  if (value.type === "hardBreak") return { type: "hardBreak" }

  if (value.type === "paragraph" || value.type === "heading") {
    const content = sanitizeChildren(value.content, inlineNodeTypes, context, depth)
    if (!content) return null
    if (value.type === "heading") {
      const level = isRecord(value.attrs) ? value.attrs.level : null
      if (level !== 1 && level !== 2 && level !== 3) return { type: "paragraph", ...(content.length ? { content } : {}) }
      return { type: "heading", attrs: { level }, ...(content.length ? { content } : {}) }
    }
    return { type: "paragraph", ...(content.length ? { content } : {}) }
  }

  if (value.type === "bulletList" || value.type === "orderedList") {
    const content = sanitizeChildren(value.content, new Set(["listItem"]), context, depth)
    if (!content?.length) return null
    if (value.type === "orderedList") {
      const rawStart = isRecord(value.attrs) ? value.attrs.start : 1
      const start = typeof rawStart === "number" && Number.isInteger(rawStart) && rawStart > 0 && rawStart <= 100_000 ? rawStart : 1
      return { type: "orderedList", attrs: { start }, content }
    }
    return { type: "bulletList", content }
  }

  if (value.type === "listItem") {
    const content = sanitizeChildren(value.content, blockNodeTypes, context, depth)
    if (!content?.length || content[0].type !== "paragraph") return null
    return { type: "listItem", content }
  }

  if (value.type === "blockquote") {
    const content = sanitizeChildren(value.content, blockNodeTypes, context, depth)
    return content?.length ? { type: "blockquote", content } : null
  }

  if (value.type === "doc") {
    const content = sanitizeChildren(value.content, blockNodeTypes, context, depth)
    return content ? { type: "doc", content } : null
  }

  return null
}

function documentText(node: JSONContent): string {
  if (node.type === "text") return node.text ?? ""
  if (node.type === "hardBreak") return "\n"
  const children = node.content ?? []
  const separator = ["doc", "blockquote", "bulletList", "orderedList", "listItem"].includes(node.type ?? "") ? "\n" : ""
  return children.map(documentText).join(separator)
}

export function sanitizeTaskUpdateDocument(value: unknown): { document: TaskUpdateDocument; text: string } | null {
  const document = sanitizeNode(value, { nodes: 0 }, 0)
  if (!document || document.type !== "doc") return null
  const text = documentText(document).trim()
  if (!text || text.length > maxTextLength || JSON.stringify(document).length > maxJsonLength) return null
  return { document, text }
}
