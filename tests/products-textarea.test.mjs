import test from "node:test";
import assert from "node:assert/strict";
import { productEditorInputSchema, validateProductTextLengths, productValidationErrors, PRODUCT_TEXT_MAX } from "../src/features/products/schema.ts";
import { parseProductForm } from "../src/features/products/form.ts";
import { plainTextToRichDocument } from "../src/features/cms/rich-text.ts";

const translations = (body = "x".repeat(150), excerpt = "A short product description.") => ({ id: { title: "Product example", body, excerpt }, en: { title: "Product example", body, excerpt } });
const raw = (body, excerpt) => ({ kind: "PRODUCT", slug: "product-example", status: "PUBLISHED", translations: translations(body, excerpt), details: {} });

test("textarea boundary allows 150 and rejects 151/new rich JSON with friendly field errors", () => {
  assert.equal(PRODUCT_TEXT_MAX, 150);
  assert.equal(productEditorInputSchema.safeParse(raw()).success, true);
  const parsed = productEditorInputSchema.safeParse(raw("x".repeat(151), "y".repeat(151)));
  assert.equal(parsed.success, false);
  const errors = productValidationErrors(parsed.error.issues, true);
  assert.equal(Object.keys(errors).length, 4);
  assert.match(errors["id.body"], /maksimal 150 karakter/);
  assert.match(errors["en.excerpt"], /Bahasa Inggris maksimal 150/);
  assert.doesNotMatch(Object.values(errors).join(" "), /translations\.|richBody/);
  assert.equal(productEditorInputSchema.safeParse({ ...raw(), translations: { ...translations(), id: { ...translations().id, richBody: plainTextToRichDocument("New injected body") } } }).success, false);
});

test("legacy over-limit text is retained only if unchanged, new edits are bounded", () => {
  const previous = translations("a".repeat(200), "b".repeat(200));
  const input = productEditorInputSchema.parse({ ...raw("a".repeat(200), "b".repeat(200)), id: "5ad0c75f-8e38-4b0c-9e24-0aa0d3cc598e" });
  assert.doesNotThrow(() => validateProductTextLengths(input, previous));
  assert.throws(() => validateProductTextLengths({ ...input, translations: translations("c".repeat(151)) }, previous));
  assert.doesNotThrow(() => validateProductTextLengths({ ...input, translations: translations() }, previous));
});

test("plain form boundary ignores client cover/features/kind/rich data and converts schedule as UTC", () => {
  const form = new FormData();
  form.set("kind", "ARTICLE"); form.set("slug", "product-example"); form.set("status", "SCHEDULED");
  form.set("publishedAt", "2030-01-01T09:30"); form.set("productStatus", "COMING_SOON"); form.set("ctaType", "internal");
  form.set("image", "/images/untrusted.png"); form.set("features", "Untrusted rewrite"); form.set("id.richBody", "{invalid}");
  const parsed = parseProductForm(form);
  assert.equal(parsed.kind, "PRODUCT"); assert.equal(parsed.publishedAt, "2030-01-01T09:30:00.000Z");
  assert.equal(parsed.translations.id.richBody, undefined); assert.equal(parsed.details.image, undefined); assert.equal(parsed.details.features, undefined);
  assert.deepEqual(parsed.details.productCta, { type: "internal", path: "/consultation" });
  form.set("id.body", new Blob(["file content"])); assert.throws(() => parseProductForm(form), /text field/);
});
