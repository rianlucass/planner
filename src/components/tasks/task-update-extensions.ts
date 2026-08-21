import { FontSize, TextStyle } from "@tiptap/extension-text-style"
import StarterKit from "@tiptap/starter-kit"

export const taskUpdateFontSizes = ["14px", "16px", "18px", "20px", "24px"] as const

const PersistedFontSize = FontSize.extend({
  addGlobalAttributes() {
    return [
      {
        types: this.options.types,
        attributes: {
          fontSize: {
            default: null,
            parseHTML: (element) => element.getAttribute("data-font-size") ?? element.style.fontSize,
            renderHTML: (attributes) => attributes.fontSize ? {
              "data-font-size": attributes.fontSize,
              style: `font-size: ${attributes.fontSize}`,
            } : {},
          },
        },
      },
    ]
  },
})

export function normalizeTaskUpdateLink(value: string) {
  const withProtocol = /^[a-z][a-z\d+.-]*:/i.test(value) ? value : `https://${value}`

  try {
    const protocol = new URL(withProtocol).protocol
    return protocol === "http:" || protocol === "https:" || protocol === "mailto:" ? withProtocol : null
  } catch {
    return null
  }
}

export function getTaskUpdateExtensions() {
  return [
    StarterKit.configure({
      heading: { levels: [1, 2, 3] },
      code: false,
      codeBlock: false,
      horizontalRule: false,
      link: {
        autolink: true,
        linkOnPaste: true,
        openOnClick: false,
        defaultProtocol: "https",
        HTMLAttributes: { target: "_blank", rel: "noopener noreferrer" },
        shouldAutoLink: (url) => Boolean(normalizeTaskUpdateLink(url)),
      },
    }),
    TextStyle.configure({ mergeNestedSpanStyles: true }),
    PersistedFontSize.configure({ types: ["textStyle"] }),
  ]
}
