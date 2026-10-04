import type { ReactNode } from "react";
import { richDocumentSchema, type RichNode } from "./rich-text";

function renderNode(node: RichNode, key: number): ReactNode {
  const children = node.content?.map(renderNode);
  switch (node.type) {
    case "doc": return <div key={key}>{children}</div>;
    case "text": {
      let text: ReactNode = node.text;
      for (const mark of node.marks ?? []) {
        switch (mark.type) {
          case "bold": text = <strong>{text}</strong>; break;
          case "italic": text = <em>{text}</em>; break;
          case "strike": text = <s>{text}</s>; break;
          case "code": text = <code>{text}</code>; break;
          case "link": text = <a href={mark.attrs!.href} target="_blank" rel="noopener noreferrer" title={mark.attrs?.title ?? undefined}>{text}</a>; break;
        }
      }
      return <span key={key}>{text}</span>;
    }
    case "paragraph": return <p key={key}>{children}</p>;
    case "heading": return node.attrs?.level === 2 ? <h2 key={key}>{children}</h2> : node.attrs?.level === 3 ? <h3 key={key}>{children}</h3> : <h4 key={key}>{children}</h4>;
    case "bulletList": return <ul key={key}>{children}</ul>;
    case "orderedList": return <ol key={key} start={node.attrs?.start} type={node.attrs?.type ?? undefined}>{children}</ol>;
    case "listItem": return <li key={key}>{children}</li>;
    case "blockquote": return <blockquote key={key}>{children}</blockquote>;
    case "codeBlock": return <pre key={key}><code>{children}</code></pre>;
    case "horizontalRule": return <hr key={key} />;
    case "hardBreak": return <br key={key} />;
  }
}

// React escapes text; JSON is validated again before rendering. No raw HTML,
// client editor, or arbitrary attributes are accepted on the public route.
export function RichTextContent({ document }: { document: unknown }) {
  const validated = richDocumentSchema.parse(document);
  return <div data-rich-content className="min-w-0 break-words leading-8 text-[#42565B] [&_p]:my-4 [&_p]:whitespace-pre-wrap [&_h2]:mb-4 [&_h2]:mt-10 [&_h2]:text-2xl [&_h2]:font-semibold [&_h2]:text-[#132A32] [&_h3]:mb-3 [&_h3]:mt-8 [&_h3]:text-xl [&_h3]:font-semibold [&_h4]:mb-3 [&_h4]:mt-6 [&_h4]:text-lg [&_h4]:font-semibold [&_ul]:list-disc [&_ul]:pl-6 [&_ol]:list-decimal [&_ol]:pl-6 [&_blockquote]:border-l-4 [&_blockquote]:border-[#18B7B3] [&_blockquote]:pl-5 [&_pre]:overflow-x-auto [&_pre]:rounded-lg [&_pre]:bg-[#F1F7F7] [&_pre]:p-4 [&_code]:rounded [&_code]:bg-[#F1F7F7] [&_code]:px-1 [&_a]:text-[#08747A] [&_a]:underline [&_hr]:my-8">{renderNode(validated, 0)}</div>;
}
