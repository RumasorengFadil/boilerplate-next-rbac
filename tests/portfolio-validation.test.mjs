import test from "node:test";
import assert from "node:assert/strict";
import { portfolioInputSchema, portfolioValidationErrors } from "../src/features/portfolio/schema.ts";
import { plainTextToRichDocument } from "../src/features/cms/rich-text.ts";

const translation = (excerpt = "", body = "") => ({ title: "Illustrative case", excerpt, richBody: plainTextToRichDocument(body) });
const input = (status = "PUBLISHED", id = translation(), en = translation()) => ({
  kind: "CASE_STUDY", slug: "illustrative-case", status, translations: { id, en }, details: {},
});
const errors = value => {
  const parsed = portfolioInputSchema.safeParse(value); assert.equal(parsed.success, false);
  return portfolioValidationErrors(parsed.error.issues);
};

test("publication feedback identifies each missing field and language without technical paths", () => {
  assert.deepEqual(errors(input()), {
    "id.richBody": "Konten detail Bahasa Indonesia minimal 30 karakter teks untuk publikasi.",
    "id.excerpt": "Ringkasan Bahasa Indonesia minimal 10 karakter untuk publikasi.",
    "en.richBody": "Konten detail Bahasa Inggris minimal 30 karakter teks untuk publikasi.",
    "en.excerpt": "Ringkasan Bahasa Inggris minimal 10 karakter untuk publikasi.",
  });
  const complete = translation("Complete summary", "Complete illustrative business context with sufficient text.");
  assert.deepEqual(errors(input("PUBLISHED", complete, translation("", complete.richBody.content[0].content[0].text))), {
    "en.excerpt": "Ringkasan Bahasa Inggris minimal 10 karakter untuk publikasi.",
  });
  assert.equal(portfolioInputSchema.safeParse(input("PUBLISHED", complete, complete)).success, true);
  assert.equal(portfolioInputSchema.safeParse(input("DRAFT")).success, true);
  assert.equal(portfolioInputSchema.safeParse(input("REVIEW")).success, true);
});

test("feedback remains safe for malformed rich documents, slug and length validation", () => {
  const result = errors({ ...input("DRAFT"), slug: "1", translations: {
    id: { ...translation(), title: "a" }, en: { ...translation(), excerpt: "x".repeat(401), richBody: { type: "hostile-node", content: [] } },
  } });
  assert.equal(result["id.title"], "Judul Bahasa Indonesia minimal 2 karakter.");
  assert.equal(result["en.excerpt"], "Ringkasan Bahasa Inggris maksimal 400 karakter.");
  assert.match(result["en.richBody"], /^Konten detail Bahasa Inggris belum valid/);
  assert.match(result.slug, /^Slug /);
  assert.doesNotMatch(Object.values(result).join(" "), /translations\.|hostile-node|Invalid input|UUID.*hostile/);
  assert.match(errors(input("SCHEDULED")).publishedAt, /^Pilih tanggal dan waktu publikasi/);
});
