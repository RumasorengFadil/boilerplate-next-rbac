import "./server-loader.mjs";
import test from "node:test";
import assert from "node:assert/strict";
const { richDocumentSchema, safeRichLink, richTextToPlainText, plainTextToRichDocument } = await import("../src/features/cms/rich-text.ts");
const { portfolioSlugSchema, portfolioInputSchema, portfolioLifecycleSchema } = await import("../src/features/portfolio/schema.ts");
const richBody = { type: "doc", content: [{ type: "heading", attrs: { level: 2 }, content: [{ type: "text", text: "Business challenge" }] }, { type: "paragraph", content: [{ type: "text", text: "A complete illustration of the business workflow.", marks: [{ type: "bold" }] }] }] };

test("portfolio identifiers and descriptive slugs are validated", () => {
  for (const slug of ["1", "12345", "f52ef529-3c96-4ce2-868a-e7645715e1c0", "../secret", "Slug"]) assert.equal(portfolioSlugSchema.safeParse(slug).success, false);
  assert.equal(portfolioSlugSchema.safeParse("document-workflow").success, true);
  assert.equal(portfolioLifecycleSchema.safeParse({ id: "1", version: 1, operation: "restore" }).success, false);
});
test("rich content derives plain text and rejects unsafe nodes, H1 and attributes", () => {
  assert.equal(richDocumentSchema.safeParse(richBody).success, true);
  assert.match(richTextToPlainText(richBody), /Business challenge\n\nA complete/);
  assert.equal(richDocumentSchema.safeParse(plainTextToRichDocument("Legacy content")).success, true);
  for (const node of [{ type: "image", attrs: { src: "https://tracker.test" } }, { type: "heading", attrs: { level: 1 } }, { type: "paragraph", attrs: { onclick: "evil()" } }, { type: "doc" }])
    assert.equal(richDocumentSchema.safeParse({ type: "doc", content: [node] }).success, false);
  const translation = { title: "Illustration", excerpt: "A complete illustrative description.", richBody, body: "Forged summary" };
  const result = portfolioInputSchema.parse({ kind: "CASE_STUDY", slug: "illustrative-workflow", status: "PUBLISHED", translations: { id: translation, en: translation }, details: {} });
  assert.match(result.translations.id.body, /Business challenge/);
  assert.doesNotMatch(result.translations.id.body, /Forged/);
});
test("link protocols and content resource limits are enforced", () => {
  for (const href of ["javascript:alert(1)", "data:text/html,bad", "//tracker.test", "/\\evil.test", "https://user:pass@host.test", " https://host.test"]) assert.equal(safeRichLink(href), false);
  for (const href of ["/id/contact", "https://example.test/path", "mailto:hello@example.test", "#overview"]) assert.equal(safeRichLink(href), true);
  const linked = structuredClone(richBody); linked.content[1].content[0].marks = [{ type: "link", attrs: { href: "javascript:evil()" } }];
  assert.equal(richDocumentSchema.safeParse(linked).success, false);
  assert.equal(richDocumentSchema.safeParse({ type: "doc", content: [{ type: "paragraph", content: [{ type: "text", text: "x".repeat(30001) }] }] }).success, false);
  let deep = { type: "paragraph" }; for (let i = 0; i < 14; i++) deep = { type: "blockquote", content: [deep] };
  assert.equal(richDocumentSchema.safeParse({ type: "doc", content: [deep] }).success, false);
});
