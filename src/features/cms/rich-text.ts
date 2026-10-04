import { z } from "zod";

export type RichMark = { type: "bold" | "italic" | "strike" | "code" | "link"; attrs?: { href: string; target?: "_blank" | null; rel?: string | null; class?: null } };
export type RichNode = {
  type: "doc" | "paragraph" | "heading" | "text" | "bulletList" | "orderedList" | "listItem" | "blockquote" | "hardBreak" | "horizontalRule" | "codeBlock";
  text?: string;
  attrs?: { level?: number; start?: number; language?: string | null };
  marks?: RichMark[];
  content?: RichNode[];
};

export function safeRichLink(href: string) {
  if (href.length > 2000 || /[\s\\\u0000-\u001f\u007f]/.test(href)) return false;
  if (/^\/(?!\/)/.test(href) || /^#[a-zA-Z0-9_-]+$/.test(href)) return true;
  try {
    const url = new URL(href);
    return ["http:", "https:", "mailto:", "tel:"].includes(url.protocol) && !url.username && !url.password;
  } catch { return false; }
}
const linkAttrs = z.object({
  href: z.string().refine(safeRichLink, "Unsafe link."), target: z.enum(["_blank"]).nullable().optional(),
  rel: z.string().max(100).nullable().optional(), class: z.null().optional(),
}).strict();
const markSchema = z.union([
  z.object({ type: z.enum(["bold", "italic", "strike", "code"]) }).strict(),
  z.object({ type: z.literal("link"), attrs: linkAttrs }).strict(),
]);
const baseNode = z.object({
  type: z.enum(["doc", "paragraph", "heading", "text", "bulletList", "orderedList", "listItem", "blockquote", "hardBreak", "horizontalRule", "codeBlock"]),
  text: z.string().max(30000).optional(), marks: z.array(markSchema).max(5).optional(),
  attrs: z.object({ level: z.number().int().min(2).max(4).optional(), start: z.number().int().min(1).max(10000).optional(), language: z.string().max(40).nullable().optional() }).strict().optional(),
  content: z.array(z.unknown()).max(1000).optional(),
}).strict();

// Validate iteratively before casting: depth/node/text limits also bound hostile payloads.
export const richDocumentSchema = z.unknown().superRefine((value, context) => {
  const stack = [{ value, depth: 0, parent: "root" }];
  let nodes = 0, textLength = 0;
  while (stack.length) {
    const current = stack.pop()!;
    if (++nodes > 2000 || current.depth > 12) {
      context.addIssue({ code: "custom", message: "Rich content exceeds depth/node limit." }); return;
    }
    const parsed = baseNode.safeParse(current.value);
    if (!parsed.success) { context.addIssue({ code: "custom", message: "Unsupported rich content node/attributes." }); return; }
    const node = parsed.data;
    const children = node.content ?? [];
    const inline = ["text", "hardBreak"].includes(node.type);
    const allowed: Record<string, string[]> = {
      root: ["doc"], doc: ["paragraph", "heading", "bulletList", "orderedList", "blockquote", "horizontalRule", "codeBlock"],
      paragraph: ["text", "hardBreak"], heading: ["text", "hardBreak"], codeBlock: ["text"],
      bulletList: ["listItem"], orderedList: ["listItem"],
      listItem: ["paragraph", "bulletList", "orderedList"],
      blockquote: ["paragraph", "heading", "bulletList", "orderedList", "codeBlock"],
    };
    const attrs = Object.keys(node.attrs ?? {});
    const validAttrs = node.type === "heading" ? attrs.every(key => key === "level") && node.attrs?.level !== undefined
      : node.type === "orderedList" ? attrs.every(key => key === "start")
      : node.type === "codeBlock" ? attrs.every(key => key === "language") : attrs.length === 0;
    if (!allowed[current.parent]?.includes(node.type) || !validAttrs ||
        (node.type === "text" ? !node.text || children.length > 0 : node.text !== undefined || !!node.marks?.length) ||
        (inline || node.type === "horizontalRule") && children.length > 0 ||
        (["doc", "bulletList", "orderedList", "listItem", "blockquote"].includes(node.type) && !children.length)) {
      context.addIssue({ code: "custom", message: "Invalid rich content structure." }); return;
    }
    textLength += node.text?.length ?? 0;
    if (textLength > 30000) { context.addIssue({ code: "custom", message: "Rich content is too long." }); return; }
    for (const child of children) stack.push({ value: child, depth: current.depth + 1, parent: node.type });
  }
}).transform(value => value as RichNode);

export function richTextToPlainText(node: RichNode): string {
  if (node.type === "text") return node.text ?? "";
  if (node.type === "hardBreak") return "\n";
  const separator = ["paragraph", "heading", "codeBlock"].includes(node.type) ? "" : "\n\n";
  return (node.content ?? []).map(richTextToPlainText).join(separator).trim();
}
export function plainTextToRichDocument(body: string): RichNode {
  return { type: "doc", content: body.split(/\n\s*\n/).map(text => ({ type: "paragraph", ...(text ? { content: [{ type: "text", text }] } : {}) })) };
}
