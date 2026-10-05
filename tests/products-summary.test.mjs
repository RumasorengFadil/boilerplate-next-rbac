import test from "node:test";
import assert from "node:assert/strict";
import { productFeaturesSchema, productSummaryContentSchema, validateProductSummaryPublication, readProductSummaryContent, previewProductSummaryConversion } from "../src/features/products/summary-content.ts";
import { plainTextToRichDocument } from "../src/features/cms/rich-text.ts";
import { productSummaryInputSchema } from "../src/features/products/summary-input.ts";
import { contentInputSchema } from "../src/features/cms/schema.ts";

const translation = { title: "Enterprise Chat", excerpt: "Private communications for your organization." };
const content = () => ({ translations: { id: { ...translation }, en: { ...translation } }, productFeatures: { id: ["Chat privat perusahaan"], en: ["Private company chat"] } });
const legacy = () => ({ kind: "PRODUCT", translations: { id: { ...translation, body: translation.excerpt }, en: { ...translation, richBody: plainTextToRichDocument(translation.excerpt) } }, details: { features: ["Private company chat", "Self-hosted / on-premise", "Admin control"], image: "/images/keep.png", productStatus: "COMING_SOON" } });

test("summary-only contract bounds 150 characters, rejects duplicate body/rich and allows short publication without detail", () => {
  const data = content();
  data.translations.id.excerpt = "a".repeat(150);
  assert.equal(productSummaryContentSchema.safeParse(data).success, true);
  data.translations.id.excerpt += "a";
  assert.equal(productSummaryContentSchema.safeParse(data).success, false);
  for (const key of ["body", "richBody"]) {
    const duplicate = content(); duplicate.translations.id[key] = key === "body" ? "Duplicate" : plainTextToRichDocument("Duplicate");
    assert.equal(productSummaryContentSchema.safeParse(duplicate).success, false);
  }
  const short = content(); short.translations.en.excerpt = "a".repeat(10);
  assert.doesNotThrow(() => validateProductSummaryPublication(productSummaryContentSchema.parse(short)));
  short.translations.id.excerpt = "a".repeat(9);
  assert.throws(() => validateProductSummaryPublication(productSummaryContentSchema.parse(short)), error => error.issues[0].path.join(".") === "translations.id.excerpt");
});

test("features are bilingual, independently removable and bounded at 12 points of 100 characters", () => {
  assert.equal(productFeaturesSchema.safeParse({ id: Array(12).fill("a".repeat(100)), en: [] }).success, true);
  for (const bad of [{ id: ["a".repeat(101)], en: [] }, { id: Array(13).fill("Feature"), en: [] }, { id: [" "], en: [] }, { id: [], en: [], other: [] }, ["Private company chat"]])
    assert.equal(productFeaturesSchema.safeParse(bad).success, false);
});

test("product summary input publishes without body, enforces schedule and isolates features from articles", () => {
  const raw = { kind: "PRODUCT", slug: "summary-example", status: "PUBLISHED", translations: content().translations, details: { productFeatures: content().productFeatures } };
  assert.equal(productSummaryInputSchema.safeParse(raw).success, true);
  assert.equal(productSummaryInputSchema.safeParse({ ...raw, status: "SCHEDULED" }).success, false);
  const injected = structuredClone(raw); injected.translations.id.body = "Injected detail";
  assert.equal(productSummaryInputSchema.safeParse(injected).success, false);
  assert.equal(contentInputSchema.safeParse({ ...raw, kind: "ARTICLE", status: "DRAFT" }).success, false);
});

test("legacy read is nonmutating, retains literal features and honors explicit empty localized lists", () => {
  const row = legacy(), before = structuredClone(row), normalized = readProductSummaryContent(row);
  assert.deepEqual(normalized.productFeatures, { id: row.details.features, en: row.details.features });
  assert.deepEqual(row, before); normalized.productFeatures.id.push("Another point"); assert.deepEqual(row, before);
  row.details.productFeatures = { id: [], en: ["Configured English"] };
  assert.deepEqual(readProductSummaryContent(row).productFeatures, row.details.productFeatures);
  assert.throws(() => readProductSummaryContent({ ...row, kind: "CASE_STUDY" }));
  row.translations.id.excerpt = "x".repeat(200); row.details.productFeatures.id = ["y".repeat(150)];
  assert.equal(readProductSummaryContent(row).translations.id.excerpt.length, 200);
  assert.equal(readProductSummaryContent(row).productFeatures.id[0].length, 150);
});

test("conversion preflight accepts duplicates, refuses distinct text/formatting and never discards oversized legacy", () => {
  const row = legacy(), before = structuredClone(row), preview = previewProductSummaryConversion(row);
  assert.equal(preview.ready, true); assert.deepEqual(row, before);
  assert.equal(Object.hasOwn(preview.content.translations.id, "body"), false);
  const reordered = legacy(); reordered.translations.en.richBody = { content: [{ content: [{ text: translation.excerpt, type: "text" }], type: "paragraph" }], type: "doc" };
  assert.equal(previewProductSummaryConversion(reordered).ready, true);
  const missing = legacy(); missing.translations.id.excerpt = "";
  assert.equal(previewProductSummaryConversion(missing).content.translations.id.excerpt, translation.excerpt);
  row.translations.id.body = "Distinct information that should be reviewed before deletion.";
  assert.ok(previewProductSummaryConversion(row).conflicts.includes("id.distinctBody"));
  row.translations.en.richBody.content[0].content[0].marks = [{ type: "bold" }];
  assert.ok(previewProductSummaryConversion(row).conflicts.includes("en.richFormatting"));
  row.details.features.push("z".repeat(151));
  assert.equal(previewProductSummaryConversion(row).ready, false);
  assert.equal(previewProductSummaryConversion(row).content.productFeatures.id.at(-1).length, 151);
});
