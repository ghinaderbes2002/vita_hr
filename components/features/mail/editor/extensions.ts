import { Extension, type CommandProps } from "@tiptap/core";
import type { Node as PMNode } from "@tiptap/pm/model";
import { Image } from "@tiptap/extension-image";
import { Table, TableCell, TableHeader } from "@tiptap/extension-table";

/** Block nodes that carry paragraph-level formatting. */
const BLOCK_TYPES = ["paragraph", "heading"];
const MAX_INDENT = 8;

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    blockFormat: {
      setBlockLineHeight: (value: string | null) => ReturnType;
      setBlockDir: (dir: "rtl" | "ltr" | null) => ReturnType;
      indent: () => ReturnType;
      outdent: () => ReturnType;
    };
  }
}

/**
 * Paragraph-level formatting that Outlook has and TipTap doesn't ship:
 * line spacing, per-paragraph direction and indentation.
 * Direction defaults to `dir="auto"`, so each paragraph follows its first
 * strong character (Arabic → RTL) unless set by hand.
 */
export const BlockFormat = Extension.create({
  name: "blockFormat",

  addGlobalAttributes() {
    return [
      {
        types: BLOCK_TYPES,
        attributes: {
          lineHeight: {
            default: null,
            parseHTML: (el) => (el as HTMLElement).style.lineHeight || null,
            renderHTML: (attrs) => (attrs.lineHeight ? { style: `line-height: ${attrs.lineHeight}` } : {}),
          },
          dir: {
            default: null,
            parseHTML: (el) => {
              const d = el.getAttribute("dir");
              return d === "rtl" || d === "ltr" ? d : null;
            },
            renderHTML: (attrs) => ({ dir: attrs.dir || "auto" }),
          },
          indent: {
            default: 0,
            parseHTML: (el) => Number(el.getAttribute("data-indent")) || 0,
            renderHTML: (attrs) =>
              attrs.indent
                ? { "data-indent": attrs.indent, style: `margin-inline-start: ${attrs.indent * 2}em` }
                : {},
          },
        },
      },
    ];
  },

  addCommands() {
    const shiftIndent = (delta: number) => () => ({ tr, state }: CommandProps) => {
      const { from, to } = state.selection;
      let changed = false;
      state.doc.nodesBetween(from, to, (node: PMNode, pos: number) => {
        if (!BLOCK_TYPES.includes(node.type.name)) return;
        const cur = node.attrs.indent || 0;
        const next = Math.max(0, Math.min(MAX_INDENT, cur + delta));
        if (next !== cur) {
          tr.setNodeMarkup(pos, undefined, { ...node.attrs, indent: next });
          changed = true;
        }
      });
      return changed;
    };
    return {
      setBlockLineHeight: (value) => ({ commands }) =>
        BLOCK_TYPES.map((t) => commands.updateAttributes(t, { lineHeight: value })).some(Boolean),
      setBlockDir: (dir) => ({ commands }) =>
        BLOCK_TYPES.map((t) => commands.updateAttributes(t, { dir })).some(Boolean),
      indent: shiftIndent(1),
      outdent: shiftIndent(-1),
    };
  },

  addKeyboardShortcuts() {
    return {
      // In a list Tab nests the item (multi-level lists); elsewhere it indents.
      // Either way it never moves focus out of the editor.
      Tab: () =>
        this.editor.isActive("listItem")
          ? this.editor.commands.sinkListItem("listItem") || true
          : this.editor.commands.indent() || true,
      "Shift-Tab": () =>
        this.editor.isActive("listItem")
          ? this.editor.commands.liftListItem("listItem") || true
          : this.editor.commands.outdent() || true,
    };
  },
});

export interface MailShortcutOptions {
  onSubmit: () => void;
  onLink: () => void;
}

/**
 * Outlook's shortcuts. Runs before the built-ins so Ctrl+E/L/R align (not
 * inline code / browser actions), Ctrl+Shift+L makes a bullet list and
 * Ctrl+Enter sends instead of inserting a line break.
 */
export const MailShortcuts = Extension.create<MailShortcutOptions>({
  name: "mailShortcuts",
  priority: 1000,

  addOptions() {
    return { onSubmit: () => {}, onLink: () => {} };
  },

  addKeyboardShortcuts() {
    return {
      "Mod-Enter": () => { this.options.onSubmit(); return true; },
      "Mod-k": () => { this.options.onLink(); return true; },
      "Mod-Shift-l": () => this.editor.chain().focus().toggleBulletList().run(),
      "Mod-e": () => this.editor.chain().focus().setTextAlign("center").run(),
      "Mod-l": () => this.editor.chain().focus().setTextAlign("left").run(),
      "Mod-r": () => this.editor.chain().focus().setTextAlign("right").run(),
      "Mod-j": () => this.editor.chain().focus().setTextAlign("justify").run(),
    };
  },
});

const cellShading = {
  backgroundColor: {
    default: null,
    parseHTML: (el: HTMLElement) => el.style.backgroundColor || el.getAttribute("bgcolor") || null,
    renderHTML: (attrs: Record<string, unknown>) =>
      attrs.backgroundColor ? { style: `background-color: ${String(attrs.backgroundColor)}` } : {},
  },
};

export const MailTableCell = TableCell.extend({
  addAttributes() { return { ...this.parent?.(), ...cellShading }; },
});

export const MailTableHeader = TableHeader.extend({
  addAttributes() { return { ...this.parent?.(), ...cellShading }; },
});

/** A table can drop its borders; they're on by default. */
export const MailTable = Table.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      borderless: {
        default: false,
        parseHTML: (el: HTMLElement) => el.getAttribute("data-borderless") === "true",
        renderHTML: (attrs: Record<string, unknown>) => (attrs.borderless ? { "data-borderless": "true" } : {}),
      },
    };
  },
});

/** Inline images with a width the toolbar can change (25–100%). */
export const MailImage = Image.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      width: {
        default: null,
        parseHTML: (el: HTMLElement) => el.style.width || el.getAttribute("width") || null,
        renderHTML: (attrs: Record<string, unknown>) => (attrs.width ? { style: `width: ${String(attrs.width)}` } : {}),
      },
    };
  },
});
