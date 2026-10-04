import "./server-loader.mjs";
import test from "node:test";
import assert from "node:assert/strict";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
const { presentContent } = await import("../src/features/cms/service.ts");
const { PublishedDetail } = await import("../src/features/cms/public.tsx");
const { RichTextContent } = await import("../src/features/cms/rich-text-renderer.tsx");
const { seoFromPublishedEntry } = await import("../src/features/website/seo/content.ts");

const translation = { title: "Portfolio example", excerpt: "Illustrative public portfolio content.", body: "Original admin introduction." };
const row = (kind = "CASE_STUDY") => ({ id: "970966c0-4538-4a30-adf9-e0172b17d736", slug: "public-example", kind, status: "PUBLISHED", version: 1,
  publishedAt: new Date("2026-01-01"), createdAt: new Date("2026-01-01"), updatedAt: new Date("2026-01-01"), deletedAt: null, authorId: null,
  translations: { id: translation, en: translation }, details: { industry: { id: "Distribusi", en: "Distribution" },
    challenge: { id: "Dokumen manual.", en: "Manual documents." }, capabilities: ["Automation"], category: "Operations", tags: ["Workflow"], verifiedProject: false } });

test("read adapter converts legacy once without writes and renderer displays rich content without duplicate legacy blocks", () => {
  const raw = row(), before = structuredClone(raw), entry = presentContent(raw);
  assert.deepEqual(raw, before); assert.equal(entry.details.industry.id, ""); assert.deepEqual(entry.details.capabilities, []);
  const html = renderToStaticMarkup(createElement(PublishedDetail, { entry, locale: "id" }));
  assert.equal((html.match(/Dokumen manual\./g) ?? []).length, 1);
  assert.match(html, /<h2><span>Tantangan bisnis/); assert.match(html, /<ul><li><p><span>Automation/);
  assert.ok(!html.includes(">challenge<")); assert.ok(!html.includes(">capabilities<")); assert.match(html, /OVERVIEW/);
  const seo = seoFromPublishedEntry(entry, "id"); assert.ok(seo.keywords.includes("Workflow")); assert.ok(!seo.keywords.includes("Automation"));
});

test("React renderer supports safe marks and semantic blocks, escapes text and refuses hostile JSON", () => {
  const document = { type: "doc", content: [{ type: "heading", attrs: { level: 3 }, content: [{ type: "text", text: "Heading" }] },
    { type: "paragraph", content: [{ type: "text", text: "<script>alert(1)</script>", marks: [{ type: "bold" }, { type: "italic" }, { type: "link", attrs: { href: "/id/contact" } }] }, { type: "hardBreak" }] },
    { type: "orderedList", attrs: { start: 2, type: "a" }, content: [{ type: "listItem", content: [{ type: "paragraph", content: [{ type: "text", text: "Item" }] }] }] },
    { type: "blockquote", content: [{ type: "paragraph", content: [{ type: "text", text: "Quote" }] }] },
    { type: "codeBlock", content: [{ type: "text", text: "const example = true;" }] }, { type: "horizontalRule" }] };
  const html = renderToStaticMarkup(createElement(RichTextContent, { document }));
  assert.match(html, /<h3>/); assert.match(html, /<strong>/); assert.match(html, /<em>/); assert.match(html, /noopener noreferrer/);
  assert.match(html, /&lt;script&gt;/); assert.ok(!html.includes("<script>")); assert.match(html, /<ol start="2" type="a">/); assert.match(html, /<blockquote>/); assert.match(html, /<pre><code>/);
  const unsafe = structuredClone(document); unsafe.content[1].content[0].marks[2].attrs.href = "javascript:alert(1)";
  assert.throws(() => renderToStaticMarkup(createElement(RichTextContent, { document: unsafe })));
});

test("article/product data and plain rendering do not use portfolio conversion", () => {
  for (const kind of ["ARTICLE", "PRODUCT"]) {
    const entry = presentContent(row(kind)); assert.equal(entry.translations.id.richBody, undefined); assert.equal(entry.details.industry.id, "Distribusi");
    const html = renderToStaticMarkup(createElement(PublishedDetail, { entry, locale: "id" }));
    assert.ok(!html.includes("data-rich-content")); assert.match(html, /Original admin introduction/);
  }
});
