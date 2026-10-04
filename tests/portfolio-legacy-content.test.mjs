import test from "node:test";
import assert from "node:assert/strict";
import { convertLegacyPortfolioContent, legacyPortfolioKeys } from "../src/features/portfolio/legacy-content.ts";
import { richTextToPlainText } from "../src/features/cms/rich-text.ts";

const translation = { title: "Portfolio fixture", excerpt: "Illustrative workflow excerpt", body: "Existing admin introduction.", seoTitle: "Admin SEO title", seoDescription: "Admin SEO description" };
const fixture = (details = {}) => ({ translations: { id: { ...translation }, en: { ...translation } }, details });

test("legacy fields become bilingual rich content and only target keys are removed", () => {
  const input = fixture({ industry: { id: "Distribusi", en: "Distribution" }, challenge: { id: "Dokumen manual.", en: "Manual documents." },
    capabilities: ["Automation", "Approvals"], technology: ["Next.js"], verifiedProject: false, category: "Operations", relatedServices: ["automation"] });
  const original = structuredClone(input), result = convertLegacyPortfolioContent(input);
  assert.deepEqual(input, original);
  assert.match(result.translations.id.body, /Industri\n\nDistribusi/); assert.match(result.translations.en.body, /Industry\n\nDistribution/);
  assert.match(result.translations.id.body, /Existing admin introduction/);
  assert.ok(result.translations.id.richBody.content.some(node => node.type === "bulletList"));
  assert.deepEqual(result.details, { verifiedProject: false, category: "Operations", relatedServices: ["automation"] });
  assert.equal(result.translations.id.seoTitle, translation.seoTitle);
  for (const key of legacyPortfolioKeys) assert.equal(Object.hasOwn(result.details, key), false);
  assert.equal(convertLegacyPortfolioContent(result).changed, false);
});

test("existing rich formatting and matching text survive without duplicates", () => {
  const input = fixture({ challenge: { id: "Dokumen berjalan manual.", en: "Documents moved manually." }, capabilities: ["Automation", "Automation", "Approvals"] });
  const document = text => ({ type: "doc", content: [{ type: "paragraph", content: [{ type: "text", text, marks: [{ type: "bold" }] }] },
    { type: "paragraph", content: [{ type: "text", text: "Automation" }] }] });
  input.translations.id.richBody = document("Dokumen  berjalan\nmanual."); input.translations.en.richBody = document("Documents moved manually.");
  const result = convertLegacyPortfolioContent(input);
  for (const locale of ["id", "en"]) {
    assert.deepEqual(result.translations[locale].richBody.content.slice(0, 2), input.translations[locale].richBody.content);
    assert.equal((result.translations[locale].body.match(/Automation/g) ?? []).length, 1);
    assert.equal((result.translations[locale].body.match(/Approvals/g) ?? []).length, 1);
    assert.ok(!result.translations[locale].richBody.content.some(node => node.type === "heading" && node.content?.[0]?.text === (locale === "id" ? "Tantangan bisnis" : "Business challenge")));
  }
});

test("all narrative fields are preserved and empty defaults add no headings", () => {
  const input = fixture(Object.fromEntries(legacyPortfolioKeys.filter(key => !["capabilities", "technology"].includes(key)).map(key => [key, { id: `${key} Indonesia.`, en: `${key} English.` }])));
  const result = convertLegacyPortfolioContent(input);
  for (const key of legacyPortfolioKeys.filter(key => !["capabilities", "technology"].includes(key))) assert.ok(result.translations.id.body.includes(`${key} Indonesia.`));
  assert.equal(convertLegacyPortfolioContent(fixture()).translations.id.richBody.content.length, 1);
});

test("invalid or oversized content aborts conversion without modifying the source", () => {
  const input = fixture({ challenge: { id: "x".repeat(12000), en: "Valid content" }, approach: { id: "y".repeat(12000), en: "Valid content" } });
  input.translations.id.body = "z".repeat(10000);
  const original = structuredClone(input); assert.throws(() => convertLegacyPortfolioContent(input)); assert.deepEqual(input, original);
  const unsafe = fixture(); unsafe.translations.id.richBody = { type: "doc", content: [{ type: "image", attrs: { src: "unsafe" } }] };
  assert.throws(() => convertLegacyPortfolioContent(unsafe));
  assert.equal(richTextToPlainText(convertLegacyPortfolioContent(fixture()).translations.en.richBody), translation.body);
});
