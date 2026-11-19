"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { EditorContent, useEditor, type Editor } from "@tiptap/react";
import type { Mark } from "@tiptap/pm/model";
import { StarterKit } from "@tiptap/starter-kit";
import { TextStyle, Color, FontFamily, FontSize } from "@tiptap/extension-text-style";
import { Highlight } from "@tiptap/extension-highlight";
import { Subscript } from "@tiptap/extension-subscript";
import { Superscript } from "@tiptap/extension-superscript";
import { TextAlign } from "@tiptap/extension-text-align";
import { TableRow } from "@tiptap/extension-table";
import { Placeholder } from "@tiptap/extensions";
import {
  AlignCenter, AlignJustify, AlignLeft, AlignRight, Baseline, Bold, Brush, Eraser, Highlighter,
  ImagePlus, IndentDecrease, IndentIncrease, Italic, Link2, List, ListOrdered, Minus, Pilcrow,
  Redo2, Smile, Strikethrough, Subscript as SubIcon, Superscript as SupIcon, Table as TableIcon,
  Trash2, Underline as UnderlineIcon, Undo2, Unlink,
} from "lucide-react";
import { toast } from "sonner";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  BlockFormat, MailImage, MailShortcuts, MailTable, MailTableCell, MailTableHeader,
} from "./extensions";

// ─── Constants ────────────────────────────────────────────────────────────────

const FONTS = ["Tahoma", "Segoe UI", "Arial", "Cairo", "Times New Roman", "Verdana", "Courier New"];
const SIZES = [8, 9, 10, 11, 12, 14, 16, 18, 20, 24, 28, 32, 36];
const LINE_HEIGHTS = ["1.0", "1.15", "1.5", "2.0"];
const PALETTE = [
  "#000000", "#434343", "#666666", "#999999", "#cccccc", "#ffffff",
  "#c00000", "#ff0000", "#ffc000", "#ffff00", "#92d050", "#00b050",
  "#00b0f0", "#0070c0", "#002060", "#7030a0", "#e36c09", "#f2dcdb",
  "#fde9d9", "#ebf1dd", "#dbeef3", "#dce6f1", "#e5e0ec", "#fff2cc",
];
const EMOJIS = [
  "😀", "😊", "😂", "😍", "🙂", "😉", "😎", "🤔", "😢", "😡", "👍", "👎", "👏", "🙏", "💪", "🤝",
  "🎉", "🔥", "⭐", "❤️", "✅", "❌", "⚠️", "📌", "📎", "📅", "⏰", "📞", "📧", "💡", "📝", "🚀",
];
const SYMBOLS = ["©", "®", "™", "°", "±", "×", "÷", "≠", "≤", "≥", "→", "←", "↑", "↓", "✓", "✗", "★", "☆", "•", "…", "€", "$", "£", "§", "¶", "½", "¼", "∞"];
/** Inline images are kept inside the body, so they're shrunk before insertion. */
const IMAGE_MAX_WIDTH = 1200;
const IMAGE_MAX_BYTES = 2 * 1024 * 1024;

async function imageToDataUrl(file: File): Promise<string> {
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = document.createElement("img");
      el.onload = () => resolve(el);
      el.onerror = reject;
      el.src = url;
    });
    const scale = Math.min(1, IMAGE_MAX_WIDTH / img.naturalWidth);
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(img.naturalWidth * scale);
    canvas.height = Math.round(img.naturalHeight * scale);
    canvas.getContext("2d")!.drawImage(img, 0, 0, canvas.width, canvas.height);
    return file.type === "image/png"
      ? canvas.toDataURL("image/png")
      : canvas.toDataURL("image/jpeg", 0.85);
  } finally {
    URL.revokeObjectURL(url);
  }
}

/** Word / Office paste noise the schema would mostly drop anyway — removed up front. */
function cleanPastedHtml(html: string) {
  return html
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/<\/?o:p[^>]*>/gi, "")
    .replace(/<\/?(w|m|v):[^>]*>/gi, "")
    .replace(/\s*mso-[^:;"]+:[^;"]+;?/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "");
}

// ─── Toolbar bits ─────────────────────────────────────────────────────────────

function Btn({
  onClick, active, title, children, disabled,
}: { onClick: () => void; active?: boolean; title: string; children: ReactNode; disabled?: boolean }) {
  return (
    <button
      type="button"
      title={title}
      disabled={disabled}
      // mousedown keeps the editor's selection; click would blur it first.
      onMouseDown={(e) => { e.preventDefault(); if (!disabled) onClick(); }}
      className={`flex h-7 min-w-7 items-center justify-center rounded px-1 transition-colors disabled:opacity-40 ${
        active ? "bg-accent text-foreground" : "text-muted-foreground hover:bg-accent hover:text-foreground"
      }`}
    >
      {children}
    </button>
  );
}

const Sep = () => <span className="mx-0.5 h-5 w-px bg-border" />;

function NativeSelect({
  value, onChange, title, children, className = "",
}: { value: string; onChange: (v: string) => void; title: string; children: ReactNode; className?: string }) {
  return (
    <select
      title={title}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={`h-7 rounded border bg-background px-1 text-xs text-foreground ${className}`}
    >
      {children}
    </select>
  );
}

function ColorPicker({
  title, icon, onPick, onClear, current,
}: { title: string; icon: ReactNode; onPick: (c: string) => void; onClear: () => void; current?: string | null }) {
  const [open, setOpen] = useState(false);
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          title={title}
          onMouseDown={(e) => e.preventDefault()}
          className="flex h-7 min-w-7 flex-col items-center justify-center rounded px-1 text-muted-foreground hover:bg-accent hover:text-foreground"
        >
          {icon}
          <span className="mt-0.5 h-1 w-4 rounded-sm" style={{ background: current || "transparent", outline: current ? "none" : "1px solid var(--border)" }} />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-56 p-2" onOpenAutoFocus={(e) => e.preventDefault()}>
        <div className="grid grid-cols-6 gap-1">
          {PALETTE.map((c) => (
            <button
              key={c}
              type="button"
              title={c}
              onClick={() => { onPick(c); setOpen(false); }}
              className="h-6 w-6 rounded border"
              style={{ background: c }}
            />
          ))}
        </div>
        <div className="mt-2 flex items-center justify-between gap-2 text-xs">
          <label className="flex cursor-pointer items-center gap-1.5">
            <input
              type="color"
              className="h-6 w-8 cursor-pointer rounded border p-0"
              onChange={(e) => onPick(e.target.value)}
            />
            لون مخصص
          </label>
          <button type="button" className="text-muted-foreground hover:text-foreground" onClick={() => { onClear(); setOpen(false); }}>
            بلا لون
          </button>
        </div>
      </PopoverContent>
    </Popover>
  );
}

function TableInsert({ editor }: { editor: Editor }) {
  const [open, setOpen] = useState(false);
  const [hover, setHover] = useState({ r: 0, c: 0 });
  const N = 8;
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          title="إدراج جدول"
          onMouseDown={(e) => e.preventDefault()}
          className="flex h-7 min-w-7 items-center justify-center rounded px-1 text-muted-foreground hover:bg-accent hover:text-foreground"
        >
          <TableIcon className="h-3.5 w-3.5" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-2" onOpenAutoFocus={(e) => e.preventDefault()}>
        <div className="grid gap-0.5" style={{ gridTemplateColumns: `repeat(${N}, 1rem)` }} onMouseLeave={() => setHover({ r: 0, c: 0 })}>
          {Array.from({ length: N * N }).map((_, i) => {
            const r = Math.floor(i / N) + 1;
            const c = (i % N) + 1;
            const on = r <= hover.r && c <= hover.c;
            return (
              <button
                key={i}
                type="button"
                onMouseEnter={() => setHover({ r, c })}
                onClick={() => {
                  editor.chain().focus().insertTable({ rows: r, cols: c, withHeaderRow: false }).run();
                  setOpen(false);
                }}
                className={`h-4 w-4 rounded-sm border ${on ? "border-primary bg-primary/30" : "bg-background"}`}
              />
            );
          })}
        </div>
        <p className="mt-1.5 text-center text-xs text-muted-foreground tabular-nums">
          {hover.r ? `${hover.r} × ${hover.c}` : "اختر عدد الصفوف والأعمدة"}
        </p>
      </PopoverContent>
    </Popover>
  );
}

function InsertCharPopover({ editor }: { editor: Editor }) {
  const [open, setOpen] = useState(false);
  const insert = (ch: string) => { editor.chain().focus().insertContent(ch).run(); };
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          title="رموز وإيموجي"
          onMouseDown={(e) => e.preventDefault()}
          className="flex h-7 min-w-7 items-center justify-center rounded px-1 text-muted-foreground hover:bg-accent hover:text-foreground"
        >
          <Smile className="h-3.5 w-3.5" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-72 p-2" onOpenAutoFocus={(e) => e.preventDefault()}>
        <p className="mb-1 text-xs text-muted-foreground">إيموجي</p>
        <div className="grid grid-cols-8 gap-0.5">
          {EMOJIS.map((e) => (
            <button key={e} type="button" onClick={() => insert(e)} className="h-7 rounded text-lg hover:bg-accent">{e}</button>
          ))}
        </div>
        <p className="mb-1 mt-2 text-xs text-muted-foreground">رموز</p>
        <div className="grid grid-cols-10 gap-0.5">
          {SYMBOLS.map((s) => (
            <button key={s} type="button" onClick={() => insert(s)} className="h-7 rounded text-sm hover:bg-accent">{s}</button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}

function LinkPopover({
  editor, open, onOpenChange,
}: { editor: Editor; open: boolean; onOpenChange: (o: boolean) => void }) {
  const [text, setText] = useState("");
  const [url, setUrl] = useState("");
  const editing = editor.isActive("link");

  // Fill from the selection / existing link each time it opens.
  const [wasOpen, setWasOpen] = useState(open);
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) {
      const { from, to } = editor.state.selection;
      setText(editor.state.doc.textBetween(from, to, " "));
      setUrl(editor.getAttributes("link").href ?? "");
    }
  }

  const apply = () => {
    let href = url.trim();
    if (!href) return;
    if (!/^(https?:|mailto:|tel:)/i.test(href)) href = `https://${href}`;
    const { empty } = editor.state.selection;
    if (empty && !editing) {
      editor.chain().focus().insertContent({
        type: "text", text: text.trim() || href, marks: [{ type: "link", attrs: { href } }],
      }).run();
    } else {
      editor.chain().focus().extendMarkRange("link").setLink({ href }).run();
    }
    onOpenChange(false);
  };

  return (
    <Popover open={open} onOpenChange={onOpenChange}>
      <PopoverTrigger asChild>
        <button
          type="button"
          title="رابط (Ctrl+K)"
          onMouseDown={(e) => e.preventDefault()}
          className={`flex h-7 min-w-7 items-center justify-center rounded px-1 ${editing ? "bg-accent text-foreground" : "text-muted-foreground hover:bg-accent hover:text-foreground"}`}
        >
          <Link2 className="h-3.5 w-3.5" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-72 space-y-2 p-3" dir="rtl">
        {!editing && editor.state.selection.empty && (
          <Input value={text} onChange={(e) => setText(e.target.value)} placeholder="النص المعروض" className="h-8 text-sm" />
        )}
        <Input
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); apply(); } }}
          placeholder="https://..."
          dir="ltr"
          className="h-8 text-sm"
          autoFocus
        />
        <div className="flex justify-between gap-2">
          {editing ? (
            <Button
              type="button" variant="ghost" size="sm" className="gap-1 text-destructive"
              onClick={() => { editor.chain().focus().extendMarkRange("link").unsetLink().run(); onOpenChange(false); }}
            >
              <Unlink className="h-3.5 w-3.5" /> إزالة الرابط
            </Button>
          ) : <span />}
          <Button type="button" size="sm" onClick={apply} disabled={!url.trim()}>
            {editing ? "تحديث" : "إدراج"}
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}

// ─── Editor ───────────────────────────────────────────────────────────────────

export interface RichMailEditorProps {
  /** HTML (or plain text) to start from. Read once, on mount. */
  initialContent?: string;
  /** Called with the body HTML on every change — "" while the editor is empty. */
  onChange: (html: string) => void;
  /** Ctrl+Enter. */
  onSubmit?: () => void;
  minHeight?: number;
}

export function RichMailEditor({
  initialContent = "", onChange, onSubmit, minHeight = 168,
}: RichMailEditorProps) {
  // Extensions are built once; callbacks and data are read through refs so
  // they always see the latest props.
  const onChangeRef = useRef(onChange);
  const onSubmitRef = useRef(onSubmit);
  useEffect(() => {
    onChangeRef.current = onChange;
    onSubmitRef.current = onSubmit;
  });

  const [linkOpen, setLinkOpen] = useState(false);
  const [painter, setPainter] = useState<readonly Mark[] | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  // The paste/drop handlers are set up once, before the editor exists.
  const editorRef = useRef<Editor | null>(null);

  const startHtml = useMemo(
    () => (/<[a-z][\s\S]*>/i.test(initialContent) ? initialContent : initialContent.replace(/\n/g, "<br>")),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  const insertImages = async (ed: Editor, files: File[]) => {
    for (const file of files) {
      try {
        const src = await imageToDataUrl(file);
        if (src.length * 0.75 > IMAGE_MAX_BYTES) {
          toast.error(`الصورة «${file.name}» كبيرة جداً — أرفقيها كملف بدلاً من ذلك`);
          continue;
        }
        ed.chain().focus().setImage({ src, alt: file.name }).run();
      } catch {
        toast.error(`تعذّر إدراج الصورة «${file.name}»`);
      }
    }
  };

  const editor = useEditor({
    immediatelyRender: false,
    shouldRerenderOnTransaction: true,
    content: startHtml,
    extensions: [
      StarterKit.configure({
        code: false,
        codeBlock: false,
        heading: { levels: [1, 2, 3] },
        link: {
          openOnClick: false,
          autolink: true,
          defaultProtocol: "https",
          HTMLAttributes: { target: "_blank", rel: "noopener noreferrer" },
        },
      }),
      TextStyle,
      Color,
      FontFamily,
      FontSize,
      Highlight.configure({ multicolor: true }),
      Subscript,
      Superscript,
      TextAlign.configure({ types: ["heading", "paragraph"] }),
      MailTable.configure({ resizable: false }),
      TableRow,
      MailTableHeader,
      MailTableCell,
      MailImage.configure({ allowBase64: true }),
      BlockFormat,
      MailShortcuts.configure({
        onSubmit: () => onSubmitRef.current?.(),
        onLink: () => setLinkOpen(true),
      }),
      Placeholder.configure({ placeholder: "اكتب رسالتك هنا..." }),
    ],
    editorProps: {
      attributes: {
        class: "mail-content focus:outline-none px-3 py-2 text-sm",
        dir: "rtl",
      },
      transformPastedHTML: cleanPastedHtml,
      // Ctrl+Shift+V already pastes as plain text (ProseMirror reads Shift on paste).
      handlePaste: (_view, event) => {
        const data = event.clipboardData;
        const files = Array.from(data?.files ?? []).filter((f) => f.type.startsWith("image/"));
        // Word copies text as HTML *and* a picture of it — keep the text then.
        const hasText = !!data?.getData("text/plain")?.trim();
        if (!files.length || hasText) return false;
        if (editorRef.current) insertImages(editorRef.current, files);
        return true;
      },
      handleDrop: (_view, event) => {
        const files = Array.from((event as DragEvent).dataTransfer?.files ?? []).filter((f) => f.type.startsWith("image/"));
        if (!files.length) return false;
        event.preventDefault();
        if (editorRef.current) insertImages(editorRef.current, files);
        return true;
      },
    },
    onUpdate: ({ editor: ed }) => onChangeRef.current(ed.isEmpty ? "" : ed.getHTML()),
  });

  useEffect(() => { editorRef.current = editor; }, [editor]);

  // Format painter: the next selection made with the mouse takes the copied marks.
  useEffect(() => {
    if (!editor || !painter) return;
    const dom = editor.view.dom;
    const onUp = () => setTimeout(() => {
      if (editor.state.selection.empty) return;
      let chain = editor.chain().focus().unsetAllMarks();
      painter.forEach((m) => { chain = chain.setMark(m.type.name, m.attrs); });
      chain.run();
      setPainter(null);
    });
    dom.addEventListener("mouseup", onUp);
    return () => dom.removeEventListener("mouseup", onUp);
  }, [editor, painter]);

  if (!editor) {
    return <div className="rounded-md border bg-muted/20" style={{ height: minHeight + 72 }} />;
  }

  const c = () => editor.chain().focus();
  const ts = editor.getAttributes("textStyle");
  const block = editor.isActive("heading") ? editor.getAttributes("heading") : editor.getAttributes("paragraph");
  const styleValue =
    editor.isActive("blockquote") ? "quote"
      : editor.isActive("heading", { level: 1 }) ? "h1"
        : editor.isActive("heading", { level: 2 }) ? "h2"
          : editor.isActive("heading", { level: 3 }) ? "h3" : "p";
  const inTable = editor.isActive("table");
  const onImage = editor.isActive("image");

  return (
    <div className={`rounded-md border focus-within:ring-1 focus-within:ring-ring ${painter ? "[&_.ProseMirror]:cursor-copy" : ""}`}>
      {/* ── Toolbar ── */}
      <div className="flex flex-wrap items-center gap-0.5 border-b bg-muted/30 px-1.5 py-1" dir="rtl">
        <Btn title="تراجع (Ctrl+Z)" onClick={() => c().undo().run()} disabled={!editor.can().undo()}><Undo2 className="h-3.5 w-3.5" /></Btn>
        <Btn title="إعادة (Ctrl+Y)" onClick={() => c().redo().run()} disabled={!editor.can().redo()}><Redo2 className="h-3.5 w-3.5" /></Btn>
        <Sep />
        <NativeSelect
          title="النمط"
          value={styleValue}
          className="w-24"
          onChange={(v) => {
            if (v === "p") c().setParagraph().run();
            else if (v === "quote") c().setParagraph().toggleBlockquote().run();
            else c().setHeading({ level: Number(v[1]) as 1 | 2 | 3 }).run();
          }}
        >
          <option value="p">عادي</option>
          <option value="h1">عنوان 1</option>
          <option value="h2">عنوان 2</option>
          <option value="h3">عنوان 3</option>
          <option value="quote">اقتباس</option>
        </NativeSelect>
        <NativeSelect
          title="نوع الخط"
          value={ts.fontFamily ?? ""}
          className="w-28"
          onChange={(v) => (v ? c().setFontFamily(v).run() : c().unsetFontFamily().run())}
        >
          <option value="">الخط الافتراضي</option>
          {FONTS.map((f) => <option key={f} value={f} style={{ fontFamily: f }}>{f}</option>)}
        </NativeSelect>
        <NativeSelect
          title="حجم الخط"
          value={ts.fontSize ? String(parseInt(ts.fontSize, 10)) : ""}
          className="w-14"
          onChange={(v) => (v ? c().setFontSize(`${v}px`).run() : c().unsetFontSize().run())}
        >
          <option value="">—</option>
          {SIZES.map((s) => <option key={s} value={s}>{s}</option>)}
        </NativeSelect>
        <Sep />
        <Btn title="عريض (Ctrl+B)" active={editor.isActive("bold")} onClick={() => c().toggleBold().run()}><Bold className="h-3.5 w-3.5" /></Btn>
        <Btn title="مائل (Ctrl+I)" active={editor.isActive("italic")} onClick={() => c().toggleItalic().run()}><Italic className="h-3.5 w-3.5" /></Btn>
        <Btn title="تسطير (Ctrl+U)" active={editor.isActive("underline")} onClick={() => c().toggleUnderline().run()}><UnderlineIcon className="h-3.5 w-3.5" /></Btn>
        <Btn title="يتوسطه خط" active={editor.isActive("strike")} onClick={() => c().toggleStrike().run()}><Strikethrough className="h-3.5 w-3.5" /></Btn>
        <Btn title="مرتفع" active={editor.isActive("superscript")} onClick={() => c().unsetSubscript().toggleSuperscript().run()}><SupIcon className="h-3.5 w-3.5" /></Btn>
        <Btn title="منخفض" active={editor.isActive("subscript")} onClick={() => c().unsetSuperscript().toggleSubscript().run()}><SubIcon className="h-3.5 w-3.5" /></Btn>
        <ColorPicker
          title="لون النص"
          icon={<Baseline className="h-3.5 w-3.5" />}
          current={ts.color}
          onPick={(col) => c().setColor(col).run()}
          onClear={() => c().unsetColor().run()}
        />
        <ColorPicker
          title="لون التظليل"
          icon={<Highlighter className="h-3.5 w-3.5" />}
          current={editor.getAttributes("highlight").color}
          onPick={(col) => c().setHighlight({ color: col }).run()}
          onClear={() => c().unsetHighlight().run()}
        />
        <Btn title="مسح التنسيق" onClick={() => c().unsetAllMarks().clearNodes().run()}><Eraser className="h-3.5 w-3.5" /></Btn>
        <Btn
          title={painter ? "نسخ التنسيق — حدّدي النص المراد تنسيقه" : "نسخ التنسيق"}
          active={!!painter}
          onClick={() => setPainter(painter ? null : editor.state.selection.$from.marks())}
        >
          <Brush className="h-3.5 w-3.5" />
        </Btn>

        <span className="basis-full" />

        <Btn title="قائمة نقطية (Ctrl+Shift+L)" active={editor.isActive("bulletList")} onClick={() => c().toggleBulletList().run()}><List className="h-3.5 w-3.5" /></Btn>
        <Btn title="قائمة مرقّمة" active={editor.isActive("orderedList")} onClick={() => c().toggleOrderedList().run()}><ListOrdered className="h-3.5 w-3.5" /></Btn>
        <Btn title="زيادة المسافة البادئة (Tab)" onClick={() => (editor.isActive("listItem") ? c().sinkListItem("listItem").run() : c().indent().run())}><IndentIncrease className="h-3.5 w-3.5" /></Btn>
        <Btn title="إنقاص المسافة البادئة (Shift+Tab)" onClick={() => (editor.isActive("listItem") ? c().liftListItem("listItem").run() : c().outdent().run())}><IndentDecrease className="h-3.5 w-3.5" /></Btn>
        <Sep />
        <Btn title="محاذاة لليمين (Ctrl+R)" active={editor.isActive({ textAlign: "right" })} onClick={() => c().setTextAlign("right").run()}><AlignRight className="h-3.5 w-3.5" /></Btn>
        <Btn title="توسيط (Ctrl+E)" active={editor.isActive({ textAlign: "center" })} onClick={() => c().setTextAlign("center").run()}><AlignCenter className="h-3.5 w-3.5" /></Btn>
        <Btn title="محاذاة لليسار (Ctrl+L)" active={editor.isActive({ textAlign: "left" })} onClick={() => c().setTextAlign("left").run()}><AlignLeft className="h-3.5 w-3.5" /></Btn>
        <Btn title="ضبط (Ctrl+J)" active={editor.isActive({ textAlign: "justify" })} onClick={() => c().setTextAlign("justify").run()}><AlignJustify className="h-3.5 w-3.5" /></Btn>
        <NativeSelect
          title="تباعد الأسطر"
          value={block.lineHeight ?? ""}
          className="w-16"
          onChange={(v) => c().setBlockLineHeight(v || null).run()}
        >
          <option value="">↕ —</option>
          {LINE_HEIGHTS.map((h) => <option key={h} value={h}>{h}</option>)}
        </NativeSelect>
        <Btn title="من اليمين لليسار (RTL)" active={block.dir === "rtl"} onClick={() => c().setBlockDir(block.dir === "rtl" ? null : "rtl").run()}>
          <span className="flex items-center text-[10px] font-bold"><Pilcrow className="h-3 w-3" />ع</span>
        </Btn>
        <Btn title="من اليسار لليمين (LTR)" active={block.dir === "ltr"} onClick={() => c().setBlockDir(block.dir === "ltr" ? null : "ltr").run()}>
          <span className="flex items-center text-[10px] font-bold">A<Pilcrow className="h-3 w-3 -scale-x-100" /></span>
        </Btn>
        <Sep />
        <LinkPopover editor={editor} open={linkOpen} onOpenChange={setLinkOpen} />
        <Btn title="إدراج صورة" onClick={() => fileRef.current?.click()}><ImagePlus className="h-3.5 w-3.5" /></Btn>
        <TableInsert editor={editor} />
        <Btn title="خط فاصل" onClick={() => c().setHorizontalRule().run()}><Minus className="h-3.5 w-3.5" /></Btn>
        <InsertCharPopover editor={editor} />
      </div>

      {/* ── Context bar: table / image ── */}
      {(inTable || onImage) && (
        <div className="flex flex-wrap items-center gap-1 border-b bg-muted/10 px-2 py-1 text-xs" dir="rtl">
          {inTable && (
            <>
              <span className="text-muted-foreground">الجدول:</span>
              <button type="button" className="rounded px-1.5 py-0.5 hover:bg-accent" onMouseDown={(e) => { e.preventDefault(); c().addRowAfter().run(); }}>+ صف</button>
              <button type="button" className="rounded px-1.5 py-0.5 hover:bg-accent" onMouseDown={(e) => { e.preventDefault(); c().addColumnAfter().run(); }}>+ عمود</button>
              <button type="button" className="rounded px-1.5 py-0.5 hover:bg-accent" onMouseDown={(e) => { e.preventDefault(); c().deleteRow().run(); }}>− صف</button>
              <button type="button" className="rounded px-1.5 py-0.5 hover:bg-accent" onMouseDown={(e) => { e.preventDefault(); c().deleteColumn().run(); }}>− عمود</button>
              <button
                type="button" className="rounded px-1.5 py-0.5 hover:bg-accent"
                onMouseDown={(e) => { e.preventDefault(); c().updateAttributes("table", { borderless: !editor.getAttributes("table").borderless }).run(); }}
              >
                {editor.getAttributes("table").borderless ? "إظهار الحدود" : "إخفاء الحدود"}
              </button>
              <ColorPicker
                title="تظليل الخلية"
                icon={<Highlighter className="h-3.5 w-3.5" />}
                current={editor.getAttributes("tableCell").backgroundColor ?? editor.getAttributes("tableHeader").backgroundColor}
                onPick={(col) => c().setCellAttribute("backgroundColor", col).run()}
                onClear={() => c().setCellAttribute("backgroundColor", null).run()}
              />
              <button type="button" className="flex items-center gap-1 rounded px-1.5 py-0.5 text-destructive hover:bg-accent" onMouseDown={(e) => { e.preventDefault(); c().deleteTable().run(); }}>
                <Trash2 className="h-3 w-3" /> حذف الجدول
              </button>
            </>
          )}
          {onImage && (
            <>
              <span className="text-muted-foreground">حجم الصورة:</span>
              {["25%", "50%", "75%", "100%"].map((w) => (
                <button
                  key={w} type="button"
                  className={`rounded px-1.5 py-0.5 hover:bg-accent ${editor.getAttributes("image").width === w ? "bg-accent" : ""}`}
                  onMouseDown={(e) => { e.preventDefault(); c().updateAttributes("image", { width: w }).run(); }}
                >
                  {w}
                </button>
              ))}
            </>
          )}
        </div>
      )}

      <div className="max-h-[45vh] overflow-y-auto" style={{ minHeight }}>
        <EditorContent editor={editor} className="[&_.ProseMirror]:outline-none" style={{ minHeight }} />
      </div>

      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={(e) => {
          const files = Array.from(e.target.files ?? []);
          if (files.length) insertImages(editor, files);
          e.target.value = "";
        }}
      />
    </div>
  );
}

export default RichMailEditor;
