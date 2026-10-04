"use client";
import { useEffect, useState } from "react";
import { EditorContent, useEditor, useEditorState } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { plainTextToRichDocument, richDocumentSchema, safeRichLink, type RichNode } from "./rich-text";

export function RichTextEditor({ name, label, initial, body = "", disabled = false, error }: {
  name: string; label: string; initial?: RichNode; body?: string; disabled?: boolean; error?: string;
}) {
  const [document] = useState(() => initial ?? plainTextToRichDocument(body));
  const [json, setJson] = useState(() => JSON.stringify(document));
  const [linkOpen, setLinkOpen] = useState(false);
  const [href, setHref] = useState("");
  const [linkError, setLinkError] = useState("");
  const editor = useEditor({
    immediatelyRender: false,
    extensions: [StarterKit.configure({
      heading: { levels: [2, 3, 4] }, underline: false, trailingNode: false,
      link: { openOnClick: false, autolink: false, linkOnPaste: false, isAllowedUri: safeRichLink, HTMLAttributes: { rel: "noopener noreferrer", target: "_blank" } },
    })],
    content: document, editable: !disabled,
    editorProps: { attributes: {
      role: "textbox", "aria-multiline": "true", "aria-label": label,
      class: "min-h-72 min-w-0 break-words p-4 text-sm leading-7 outline-none [&_p]:my-3 [&_h2]:my-5 [&_h2]:text-2xl [&_h2]:font-semibold [&_h3]:my-4 [&_h3]:text-xl [&_h3]:font-semibold [&_h4]:my-4 [&_h4]:text-lg [&_h4]:font-semibold [&_ul]:list-disc [&_ul]:pl-6 [&_ol]:list-decimal [&_ol]:pl-6 [&_blockquote]:border-l-4 [&_blockquote]:pl-4 [&_blockquote]:text-slate-600 [&_pre]:overflow-x-auto [&_pre]:rounded-md [&_pre]:bg-slate-100 [&_pre]:p-4 [&_code]:rounded [&_code]:bg-slate-100 [&_a]:text-[#08747A] [&_a]:underline [&_hr]:my-6",
    } },
    onUpdate: ({ editor: updated }) => setJson(JSON.stringify(updated.getJSON())),
  });
  const active = useEditorState({ editor, selector: ({ editor: current }) => current ? {
    bold: current.isActive("bold"), italic: current.isActive("italic"), strike: current.isActive("strike"), code: current.isActive("code"),
    heading: current.getAttributes("heading").level, bullet: current.isActive("bulletList"), ordered: current.isActive("orderedList"),
    quote: current.isActive("blockquote"), block: current.isActive("codeBlock"), link: current.isActive("link"),
  } : null });
  useEffect(() => { editor?.setEditable(!disabled); }, [disabled, editor]);
  useEffect(() => {
    if (!editor) return;
    editor.view.dom.setAttribute("aria-invalid", String(Boolean(error)));
    if (error) editor.view.dom.setAttribute("aria-describedby", `error-${name}`);
    else editor.view.dom.removeAttribute("aria-describedby");
  }, [editor, error, name]);
  const valid = richDocumentSchema.safeParse(JSON.parse(json)).success;
  const button = (text: string, run: () => void, pressed = false) => <button key={text} type="button" disabled={!editor || disabled} aria-pressed={pressed}
    onClick={run} className={`min-h-11 rounded-md border px-3 py-2 text-xs font-medium disabled:opacity-40 ${pressed ? "border-[#08747A] bg-[#EAF5F4] text-[#08747A]" : "bg-white"}`}>{text}</button>;
  return <div className="min-w-0 space-y-2"><p className="text-sm font-medium">{label}</p><input type="hidden" name={name} value={json} />
    <div className={`min-w-0 overflow-hidden rounded-lg border bg-white ${error ? "border-red-500" : ""}`}><div role="group" aria-label={`Format ${label}`} className="flex flex-wrap gap-1 border-b bg-slate-50 p-2">
      {button("Paragraf", () => editor?.chain().focus().setParagraph().run())}
      {([2, 3, 4] as const).map(level => button(`H${level}`, () => editor?.chain().focus().toggleHeading({ level }).run(), active?.heading === level))}
      {button("Tebal", () => editor?.chain().focus().toggleBold().run(), active?.bold)}
      {button("Miring", () => editor?.chain().focus().toggleItalic().run(), active?.italic)}
      {button("Coret", () => editor?.chain().focus().toggleStrike().run(), active?.strike)}
      {button("Daftar", () => editor?.chain().focus().toggleBulletList().run(), active?.bullet)}
      {button("Nomor", () => editor?.chain().focus().toggleOrderedList().run(), active?.ordered)}
      {button("Kutipan", () => editor?.chain().focus().toggleBlockquote().run(), active?.quote)}
      {button("Kode", () => editor?.chain().focus().toggleCode().run(), active?.code)}
      {button("Blok kode", () => editor?.chain().focus().toggleCodeBlock().run(), active?.block)}
      {button("Garis", () => editor?.chain().focus().setHorizontalRule().run())}
      {button("Tautan", () => { setHref(String(editor?.getAttributes("link").href ?? "")); setLinkError(""); setLinkOpen(!linkOpen); }, active?.link)}
      {button("Undo", () => editor?.chain().focus().undo().run())}{button("Redo", () => editor?.chain().focus().redo().run())}
    </div>
    {linkOpen && <div className="space-y-2 border-b p-3"><label className="grid gap-2 text-sm">URL tautan<input className="input" value={href} onChange={event => setHref(event.target.value)} placeholder="/id/contact atau https://…" maxLength={2000} disabled={disabled} /></label>
      <div className="flex flex-wrap gap-2">{button("Terapkan tautan", () => {
        if (!safeRichLink(href)) { setLinkError("Gunakan tautan internal, HTTP(S), email atau telepon yang aman."); return; }
        editor?.chain().focus().extendMarkRange("link").setLink({ href }).run(); setLinkOpen(false);
      })}{button("Hapus tautan", () => { editor?.chain().focus().extendMarkRange("link").unsetLink().run(); setLinkOpen(false); })}</div>
      {linkError && <p role="alert" className="text-xs text-red-700">{linkError}</p>}
    </div>}
    {!editor && <p className="min-h-72 p-4 text-sm text-slate-500">Memuat editor…</p>}<EditorContent editor={editor} />
    </div>{error && <p id={`error-${name}`} className="text-xs text-red-700">{error}</p>}<p className={`text-xs ${valid ? "text-slate-500" : "text-red-700"}`} role={valid ? undefined : "alert"}>{valid ? "Heading H2–H4, paragraf, daftar dan tautan aman. Konten tersimpan sebagai JSON; tanpa upload media." : "Struktur atau panjang konten tidak didukung. Kurangi nested lists/kutipan atau jumlah teks sebelum menyimpan."}</p>
  </div>;
}
