import type { Editor } from "@tiptap/core";

export type InlineRichTextValueMode = "auto" | "html" | "text";
export type InlineRichTextResolvedMode = "html" | "text";

export interface InlineRichTextValueSnapshot {
  mode: InlineRichTextResolvedMode;
  value: string;
  html: string;
  text: string;
}

export interface InlineRichTextChangeDetail extends InlineRichTextValueSnapshot {}

export interface InlineRichTextToolbarAction {
  id: string;
  label: string;
  title?: string;
  run: (editor: Editor) => void;
  active?: (editor: Editor) => boolean;
  disabled?: (editor: Editor) => boolean;
}

export interface InlineRichTextRuntime {
  Editor: typeof import("@tiptap/core").Editor;
  StarterKit: unknown;
  BubbleMenu?: unknown;
}

const HTML_LIKE_PATTERN = /<\/?[a-z][\s\S]*>/i;

export const DEFAULT_INLINE_RICH_TEXT_ACTIONS: InlineRichTextToolbarAction[] = [
  {
    id: "bold",
    label: "Bold",
    title: "Bold",
    run: (editor) => editor.chain().focus().toggleBold().run(),
    active: (editor) => editor.isActive("bold"),
  },
  {
    id: "italic",
    label: "Italic",
    title: "Italic",
    run: (editor) => editor.chain().focus().toggleItalic().run(),
    active: (editor) => editor.isActive("italic"),
  },
  {
    id: "strike",
    label: "Strike",
    title: "Strikethrough",
    run: (editor) => editor.chain().focus().toggleStrike().run(),
    active: (editor) => editor.isActive("strike"),
  },
  {
    id: "clear",
    label: "Clear",
    title: "Clear formatting",
    run: (editor) => editor.chain().focus().unsetAllMarks().clearNodes().run(),
  },
];

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function stripHtml(value: string) {
  if (typeof DOMParser !== "undefined") {
    const parsed = new DOMParser().parseFromString(value, "text/html");
    return parsed.body.textContent ?? "";
  }

  return value.replace(/<[^>]*>/g, "");
}

export function resolveInlineRichTextMode(
  value: string | null | undefined,
  mode: InlineRichTextValueMode = "auto",
): InlineRichTextResolvedMode {
  if (mode !== "auto") {
    return mode;
  }

  const source = value ?? "";
  return HTML_LIKE_PATTERN.test(source) ? "html" : "text";
}

export function textToInlineRichTextHtml(value: string) {
  return value.trim() ? `<p>${escapeHtml(value)}</p>` : "<p></p>";
}

export function normalizeInlineRichTextValue(
  value: string | null | undefined,
  mode: InlineRichTextValueMode = "auto",
): InlineRichTextValueSnapshot {
  const resolvedMode = resolveInlineRichTextMode(value, mode);
  const source = value ?? "";

  if (resolvedMode === "text") {
    const text = stripHtml(source);
    const html = textToInlineRichTextHtml(text);

    return {
      mode: resolvedMode,
      value: text,
      html,
      text,
    };
  }

  return {
    mode: resolvedMode,
    value: source,
    html: source,
    text: stripHtml(source),
  };
}

export function serializeInlineRichTextValue(
  editor: Editor,
  mode: InlineRichTextResolvedMode,
): InlineRichTextChangeDetail {
  const html = editor.getHTML();
  const text = editor.getText();

  return {
    mode,
    value: mode === "text" ? text : html,
    html,
    text,
  };
}

export async function loadInlineRichTextRuntime(options: {
  bubbleMenu?: boolean;
} = {}): Promise<InlineRichTextRuntime> {
  const [coreModule, starterKitModule, bubbleMenuModule] = await Promise.all([
    import("@tiptap/core"),
    import("@tiptap/starter-kit"),
    options.bubbleMenu ? import("@tiptap/extension-bubble-menu") : Promise.resolve(undefined),
  ]);

  return {
    Editor: coreModule.Editor,
    StarterKit: starterKitModule.default ?? starterKitModule,
    BubbleMenu: options.bubbleMenu
      ? bubbleMenuModule?.default ?? bubbleMenuModule
      : undefined,
  };
}

