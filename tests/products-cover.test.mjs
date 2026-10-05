import "./server-loader.mjs";
import test from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { mkdtemp, rm, stat } from "node:fs/promises";
import sharp from "sharp";
const { normalizeCover, storeCover, readCover, discardUncommittedCover } = await import("../src/features/products/cover-storage.ts");
const { productCoverPath, parseProductCoverPath } = await import("../src/features/products/cover-schema.ts");
const { detailsSchema, contentInputSchema } = await import("../src/features/cms/schema.ts");
const { productSummaryInputSchema } = await import("../src/features/products/summary-input.ts");
test("product UUID paths are disjoint; CMS and summary boundaries reject cross-domain media", () => {
  const contentId = randomUUID(), assetId = randomUUID(), path = productCoverPath(contentId, assetId);
  assert.deepEqual(parseProductCoverPath(path), { contentId, assetId });
  for (const bad of ["/media/products/1/2", path + "/extra", path.replace("products", "portfolio"), "/media/products/../x"]) assert.equal(parseProductCoverPath(bad), null);
  assert.equal(detailsSchema.parse({ image: path }).image, path);
  const translations = { id: { title: "Example", excerpt: "" }, en: { title: "Example", excerpt: "" } };
  for (const kind of ["ARTICLE", "CASE_STUDY"]) assert.equal(contentInputSchema.safeParse({ kind, slug: "example", status: "DRAFT", translations, details: { image: path } }).success, false);
  assert.equal(productSummaryInputSchema.safeParse({ kind: "PRODUCT", slug: "example", status: "DRAFT", translations, details: { productFeatures: { id: [], en: [] }, image: path.replace("products", "portfolio") } }).success, false);
  assert.equal(productSummaryInputSchema.safeParse({ kind: "PRODUCT", slug: "example", status: "DRAFT", translations, details: { productFeatures: { id: [], en: [] }, image: path } }).success, true);
});
test("product private storage normalizes bytes, ignores filenames and uses separate root", async () => {
  const directory = await mkdtemp("/private/tmp/lunabiner-product-cover-unit-");
  process.env.PRODUCT_UPLOAD_DIR = directory;
  try {
    const png = await sharp({ create: { width: 80, height: 40, channels: 3, background: "#08747a" } }).png().toBuffer();
    const bytes = await normalizeCover(new File([png], "../../secret.png", { type: "image/png" }));
    assert.equal((await sharp(bytes).metadata()).format, "webp");
    const stored = await storeCover(randomUUID(), bytes), ids = parseProductCoverPath(stored.path);
    assert.deepEqual(await readCover(ids), bytes);
    assert.equal((await stat(`${directory}/${ids.contentId}/${ids.assetId}.webp`)).mode & 0o777, 0o600);
    await assert.rejects(() => readCover({ contentId: "..", assetId: ".." }));
    await assert.rejects(() => normalizeCover(new File(["fake"], "fake.png", { type: "image/png" })), /Gambar tidak valid/);
    await discardUncommittedCover(ids); await assert.rejects(() => readCover(ids));
  } finally { delete process.env.PRODUCT_UPLOAD_DIR; assert.ok(directory.startsWith("/private/tmp/lunabiner-product-cover-unit-")); await rm(directory, { recursive: true }); }
});
