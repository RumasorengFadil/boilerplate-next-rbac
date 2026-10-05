import test from "node:test";
import assert from "node:assert/strict";
import { productInputSchema, productValidationErrors, productLifecycleSchema } from "../src/features/products/schema.ts";
import { productCtaSchema, productCtaHref } from "../src/features/products/cta-schema.ts";
import { normalizeProductContent } from "../src/features/products/legacy-content.ts";
import { plainTextToRichDocument } from "../src/features/cms/rich-text.ts";
import { contentInputSchema } from "../src/features/cms/schema.ts";

const text = "An illustrative product concept with enough text for publication.";
const translation = { title: "Product concept", excerpt: "Illustrative concept", richBody: plainTextToRichDocument(text) };
const input = { kind: "PRODUCT", slug: "test-concept", status: "DRAFT", translations: { id: translation, en: translation }, details: {} };

test("product publication choices and readiness are independent, UUID and slug validated", () => {
  for (const status of ["DRAFT", "PUBLISHED", "SCHEDULED"]) for (const productStatus of ["COMING_SOON", "BETA", "LIVE"])
    assert.equal(productInputSchema.safeParse({ ...input, status, publishedAt: "2099-01-01T00:00:00.000Z", details: { productStatus } }).success, true);
  for (const status of ["REVIEW", "ARCHIVED"]) assert.equal(productInputSchema.safeParse({ ...input, status }).success, false);
  for (const slug of ["1", "4cc15086-6b47-4bdb-9d06-3f7348e9b716", "../secret"]) assert.equal(productInputSchema.safeParse({ ...input, slug }).success, false);
  assert.equal(productInputSchema.safeParse({ ...input, id: "1" }).success, false);
  assert.equal(productInputSchema.safeParse({ ...input, kind: "ARTICLE" }).success, false);
  assert.equal(productLifecycleSchema.safeParse({ id: "1", version: 1, operation: "archive" }).success, false);
});

test("CTA accepts consultation/legacy internal paths or HTTPS, rejects unsafe URLs and mixed payload", () => {
  assert.equal(productCtaHref({ type: "internal", path: "/consultation" }, "en"), "/en/consultation");
  assert.equal(productCtaHref({ type: "external", url: "https://demo.example.test/app?locale=en" }, "id"), "https://demo.example.test/app?locale=en");
  for (const url of ["http://example.test", "//example.test", "javascript:alert(1)", "data:text/html,test", "https://user:secret@example.test", "https://example.test\\@evil.test", "https://example.test\n/app"])
    assert.equal(productCtaSchema.safeParse({ type: "external", url }).success, false);
  for (const path of ["//evil.test", "/../private", "/en/contact", "/contact?token=secret"])
    assert.equal(productCtaSchema.safeParse({ type: "internal", path }).success, false);
  assert.equal(productCtaSchema.safeParse({ type: "internal", path: "/consultation", url: "https://example.test" }).success, false);
});

test("legacy adapter retains original text, readiness/features, configured CTA and rich edits", () => {
  const translations = { id: { ...translation, richBody: undefined, body: text }, en: { ...translation, richBody: undefined, body: text } };
  const legacy = { translations, details: { productStatus: "BETA", features: ["Example feature"], ctaPath: "/en/contact", ctaLabel: { id: "Hubungi", en: "Contact" } } };
  const before = JSON.stringify(legacy);
  const parsed = normalizeProductContent(legacy);
  assert.equal(parsed.translations.id.body, text);
  assert.equal(parsed.translations.en.richBody.type, "doc");
  assert.deepEqual(parsed.details.features, ["Example feature"]);
  assert.equal(parsed.details.productStatus, "BETA");
  assert.equal(productCtaHref(parsed.details.productCta, "id"), "/id/contact");
  assert.equal(JSON.stringify(legacy), before);
  assert.equal(normalizeProductContent({ translations, details: {} }).details.productCta.path, "/consultation");
  assert.equal(normalizeProductContent({ translations, details: { ctaPath: "/id/contact/" } }).details.productCta.path, "/contact/");
  const edited = normalizeProductContent({ translations: input.translations, details: { productCta: { type: "external", url: "https://example.test" } } });
  assert.deepEqual(edited.translations.id.richBody, translation.richBody);
  assert.equal(edited.details.productCta.type, "external");
});

test("publication minima, hostile rich content and friendly per-language feedback", () => {
  const result = productInputSchema.safeParse({ ...input, status: "PUBLISHED", translations: {
    id: { ...translation, excerpt: "", richBody: plainTextToRichDocument("") }, en: { ...translation, excerpt: "", richBody: plainTextToRichDocument("") },
  } });
  assert.equal(result.success, false);
  const errors = productValidationErrors(result.error.issues);
  assert.equal(Object.keys(errors).length, 4);
  assert.match(errors["id.richBody"], /Bahasa Indonesia minimal 30/);
  assert.match(errors["en.excerpt"], /Bahasa Inggris minimal 10/);
  assert.doesNotMatch(Object.values(errors).join(" "), /translations\.|ZodError/);
  assert.equal(productInputSchema.safeParse({ ...input, status: "SCHEDULED" }).success, false);
  assert.equal(productInputSchema.safeParse({ ...input, translations: { ...input.translations, en: { ...translation, richBody: { type: "script" } } } }).success, false);
  assert.equal(contentInputSchema.safeParse({ ...input, kind: "ARTICLE" }).success, false);
  assert.equal(contentInputSchema.safeParse({ ...input, kind: "CASE_STUDY", details: { productCta: { type: "internal" } } }).success, false);
  assert.equal(productInputSchema.safeParse({ ...input, details: { image: "/media/portfolio/5ad0c75f-8e38-4b0c-9e24-0aa0d3cc598e/a7d40ab3-3222-48b5-b789-f5895b4c268e" } }).success, false);
});
