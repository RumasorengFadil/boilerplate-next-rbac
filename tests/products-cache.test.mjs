import "./server-loader.mjs";
import test from "node:test";
import assert from "node:assert/strict";
import { PassThrough } from "node:stream";
import { createElement } from "react";
import { renderToPipeableStream } from "react-dom/server";
const { db } = await import("../src/lib/db.ts");
const { publishedProducts } = await import("../src/features/products/public-data.ts");
const { resolvePublishedProduct } = await import("../src/features/products/service.ts");
const { updateTag } = await import("next/cache");
const { default: Products } = await import("../src/app/(public)/[locale]/products/page.tsx");

const id = "970966c0-4538-4a30-adf9-e0172b17d736";
let row, payloadReads, guardReads;
function reset() {
  const translation = { title: "Cache example", excerpt: "Illustrative product example." };
  row = { id, slug: "cache-example", kind: "PRODUCT", status: "PUBLISHED", version: 1,
    publishedAt: new Date("2026-01-01"), createdAt: new Date("2026-01-01"), updatedAt: new Date("2026-01-01"), deletedAt: null, authorId: null,
    translations: { id: translation, en: translation }, details: {} };
  payloadReads = 0; guardReads = 0; globalThis.__portfolioCache = new Map();
}
function eligible(where) {
  return row.deletedAt === null && where.status.in.includes(row.status) && row.publishedAt && row.publishedAt <= where.publishedAt.lte;
}
const originalMany = db.contentEntry.findMany, originalFirst = db.contentEntry.findFirst, originalRoute = db.productRoute.findUnique;
db.contentEntry.findMany = async ({ where, select }) => {
  if (select) guardReads++; else payloadReads++;
  if (!eligible(where)) return [];
  if (where.OR && !where.OR.some(key => key.id === id && key.version === row.version && +key.updatedAt === +row.updatedAt)) return [];
  return [structuredClone(select ? { id, version: row.version, updatedAt: row.updatedAt } : row)];
};
db.contentEntry.findFirst = async ({ where }) => eligible(where) ? { id, version: row.version, updatedAt: row.updatedAt, slug: row.slug } : null;
db.productRoute.findUnique = async ({ where }) => ["cache-example", "old-example"].includes(where.value) ? { contentId: id } : null;
test.after(async () => { db.contentEntry.findMany = originalMany; db.contentEntry.findFirst = originalFirst; db.productRoute.findUnique = originalRoute; delete globalThis.__portfolioCache; await db.$disconnect(); });

test("payload cache reuses revisions but live eligibility withdraws draft/archive/future content", async () => {
  reset();
  const first = await publishedProducts(); const second = await publishedProducts();
  assert.equal(payloadReads, 1); assert.equal(guardReads, 2); assert.equal(first[0].id, second[0].id);
  assert.ok(second[0].updatedAt instanceof Date); assert.ok(second[0].publishedAt instanceof Date);
  for (const status of ["DRAFT", "REVIEW", "ARCHIVED"]) {
    row.status = status; assert.deepEqual(await publishedProducts(), []);
    assert.equal(await resolvePublishedProduct("old-example"), null);
  }
  row.status = "PUBLISHED"; row.deletedAt = new Date(); assert.deepEqual(await publishedProducts(), []);
  row.deletedAt = null; row.status = "SCHEDULED"; row.publishedAt = new Date(Date.now() + 60000);
  assert.deepEqual(await publishedProducts(), []);
  row.publishedAt = new Date(Date.now() - 1000); row.version++; row.updatedAt = new Date();
  assert.equal((await publishedProducts()).length, 1); assert.equal(payloadReads, 2);
});

test("revision/update time keys, tag invalidation and live aliases prevent stale published payload", async () => {
  reset(); await publishedProducts();
  row.translations.id.title = "Updated title"; row.version++; row.updatedAt = new Date();
  assert.equal((await publishedProducts())[0].translations.id.title, "Updated title");
  row.translations.id.title = "External update"; row.updatedAt = new Date(+row.updatedAt + 1);
  assert.equal((await publishedProducts())[0].translations.id.title, "External update");
  const alias = await resolvePublishedProduct("old-example"); assert.equal(alias.redirect, true); assert.equal(alias.canonicalSlug, row.slug);
  const before = payloadReads; updateTag("products-public"); await publishedProducts(); assert.equal(payloadReads, before + 1);
});

test("a warm cache never substitutes for a failed live eligibility query", async () => {
  reset(); await publishedProducts(); const many = db.contentEntry.findMany;
  db.contentEntry.findMany = async () => { throw new Error("Synthetic database outage"); };
  try { await assert.rejects(publishedProducts, /Synthetic database outage/); }
  finally { db.contentEntry.findMany = many; }
});

test("a revision changing between guard and payload lookup fails closed", async () => {
  reset(); const many = db.contentEntry.findMany;
  db.contentEntry.findMany = async args => {
    if (!args.select) { row.version++; row.updatedAt = new Date(); }
    return many(args);
  };
  try {
    assert.deepEqual(await publishedProducts(), []);
    assert.equal(await resolvePublishedProduct("old-example"), null);
  } finally { db.contentEntry.findMany = many; }
});

test("product shell streams before a delayed database query and later includes cards/schema", async () => {
  reset(); const many = db.contentEntry.findMany;
  let release; const blocked = new Promise(resolve => { release = resolve; });
  db.contentEntry.findMany = async args => { await blocked; return many(args); };
  const element = await Products({ params: Promise.resolve({ locale: "id" }) });
  let output = ""; const stream = new PassThrough(); stream.on("data", chunk => { output += chunk; });
  const done = new Promise((resolve, reject) => { stream.on("end", resolve); stream.on("error", reject); });
  let rendering;
  try {
    await new Promise((resolve, reject) => {
      rendering = renderToPipeableStream(createElement("div", null, element), {
        onShellReady() { rendering.pipe(stream); resolve(); }, onShellError: reject,
      });
    });
    await new Promise(resolve => setImmediate(resolve));
    assert.match(output, /Produk untuk kebutuhan/); assert.match(output, /Memuat produk/); assert.ok(!output.includes("Cache example"));
    release(); await done;
    assert.match(output, /Cache example/); assert.match(output, /application\/ld\+json/); assert.match(output, /\/id\/products\/cache-example/);
  } finally { release(); rendering?.abort(); db.contentEntry.findMany = many; }
});
