"use client";

import Placeholder from "@tiptap/extension-placeholder";
import { EditorContent, useEditor, useEditorState } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { Bold, Heading2, Heading3, Italic, Link2, List, ListOrdered, Quote, Redo2, Strikethrough, Undo2 } from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { cn } from "@/shared/lib/utils";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/shared/ui/popover";

type Props = { value: string; onChange: (html: string) => void; placeholder: string; invalid?: boolean; id?: string; describedBy?: string };

const Tool = ({ label, active, onClick, children, disabled }: { label: string; active?: boolean; onClick: () => void; children: ReactNode; disabled?: boolean }) => (
  <button
    type="button"
    aria-label={label}
    title={label}
    aria-pressed={active}
    disabled={disabled}
    onMouseDown={(e) => e.preventDefault()}
    onClick={onClick}
    className={cn("grid size-8 place-items-center rounded-md text-text-secondary hover:bg-muted hover:text-text disabled:opacity-40", active && "bg-brand-soft text-heading")}
  >
    {children}
  </button>
);

/** Rich text with the formatting news needs (the server keeps only these tags). */
export const RichText = ({ value, onChange, placeholder, invalid, id, describedBy }: Props) => {
  const { t } = useTranslation();
  const [url, setUrl] = useState("");
  const editor = useEditor({
    extensions: [StarterKit.configure({ heading: { levels: [2, 3] }, link: { openOnClick: false, autolink: true, defaultProtocol: "https" } }), Placeholder.configure({ placeholder })],
    content: value,
    immediatelyRender: false,
    editorProps: { attributes: { class: "news-body min-h-[220px] px-4 py-3 outline-none", ...(id ? { id } : {}), role: "textbox", "aria-multiline": "true", ...(describedBy ? { "aria-describedby": describedBy } : {}) } },
    onUpdate: ({ editor: e }) => onChange(e.isEmpty ? "" : e.getHTML()),
  });
  const state = useEditorState({
    editor,
    selector: ({ editor: e }) => ({
      bold: e?.isActive("bold"), italic: e?.isActive("italic"), strike: e?.isActive("strike"), h2: e?.isActive("heading", { level: 2 }), h3: e?.isActive("heading", { level: 3 }),
      bullet: e?.isActive("bulletList"), ordered: e?.isActive("orderedList"), quote: e?.isActive("blockquote"), link: e?.isActive("link"),
      undo: e?.can().undo(), redo: e?.can().redo(),
    }),
  });

  // Loading another post replaces the content (without adding an undo step).
  useEffect(() => {
    if (editor && value !== editor.getHTML() && !editor.isFocused) editor.commands.setContent(value, { emitUpdate: false });
  }, [editor, value]);

  const run = (fn: (c: ReturnType<NonNullable<typeof editor>["chain"]>) => { run: () => boolean }) => editor && fn(editor.chain().focus()).run();

  return (
    <div className={cn("overflow-hidden rounded-md border bg-card focus-within:ring-2 focus-within:ring-ring", invalid ? "border-risk-high" : "border-border")}>
      <div role="toolbar" aria-label={t("newsEditor.toolbar")} className="flex flex-wrap items-center gap-0.5 border-b border-border bg-muted/50 p-1">
        <Tool label={t("newsEditor.bold")} active={state?.bold} onClick={() => run((c) => c.toggleBold())}><Bold className="size-4" /></Tool>
        <Tool label={t("newsEditor.italic")} active={state?.italic} onClick={() => run((c) => c.toggleItalic())}><Italic className="size-4" /></Tool>
        <Tool label={t("newsEditor.strike")} active={state?.strike} onClick={() => run((c) => c.toggleStrike())}><Strikethrough className="size-4" /></Tool>
        <span className="mx-1 h-5 w-px bg-border" />
        <Tool label={t("newsEditor.h2")} active={state?.h2} onClick={() => run((c) => c.toggleHeading({ level: 2 }))}><Heading2 className="size-4" /></Tool>
        <Tool label={t("newsEditor.h3")} active={state?.h3} onClick={() => run((c) => c.toggleHeading({ level: 3 }))}><Heading3 className="size-4" /></Tool>
        <Tool label={t("newsEditor.bullets")} active={state?.bullet} onClick={() => run((c) => c.toggleBulletList())}><List className="size-4" /></Tool>
        <Tool label={t("newsEditor.numbers")} active={state?.ordered} onClick={() => run((c) => c.toggleOrderedList())}><ListOrdered className="size-4" /></Tool>
        <Tool label={t("newsEditor.quote")} active={state?.quote} onClick={() => run((c) => c.toggleBlockquote())}><Quote className="size-4" /></Tool>
        <Popover onOpenChange={(open) => open && setUrl((editor?.getAttributes("link").href as string | undefined) ?? "")}>
          <PopoverTrigger asChild>
            <button type="button" aria-label={t("newsEditor.link")} title={t("newsEditor.link")} aria-pressed={state?.link} className={cn("grid size-8 place-items-center rounded-md text-text-secondary hover:bg-muted hover:text-text", state?.link && "bg-brand-soft text-heading")}>
              <Link2 className="size-4" />
            </button>
          </PopoverTrigger>
          <PopoverContent className="flex w-80 gap-2">
            <Input dir="ltr" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://" aria-label={t("newsEditor.linkUrl")} />
            <Button size="sm" onClick={() => run((c) => (url ? c.extendMarkRange("link").setLink({ href: url }) : c.extendMarkRange("link").unsetLink()))}>{t("newsEditor.apply")}</Button>
          </PopoverContent>
        </Popover>
        <span className="flex-1" />
        <Tool label={t("newsEditor.undo")} disabled={!state?.undo} onClick={() => run((c) => c.undo())}><Undo2 className="size-4" /></Tool>
        <Tool label={t("newsEditor.redo")} disabled={!state?.redo} onClick={() => run((c) => c.redo())}><Redo2 className="size-4" /></Tool>
      </div>
      <EditorContent editor={editor} />
    </div>
  );
};
