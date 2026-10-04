import "./server-loader.mjs";
import test from "node:test";
import assert from "node:assert/strict";
import { PassThrough } from "node:stream";
import { createElement } from "react";
import { renderToPipeableStream } from "react-dom/server";
const { db } = await import("../src/lib/db.ts");
const { publishedPortfolioContent } = await import("../src/features/portfolio/public-data.ts");
const { resolvePublishedPortfolio } = await import("../src/features/portfolio/service.ts");
const { updateTag } = await import("next/cache");
const { default: Work } = await import("../src/app/(public)/[locale]/work/page.tsx");

const id = "970966c0-4538-4a30-adf9-e0172b17d736";
let row, payloadReads, guardReads;
function reset() {
  const translation = { title: "Cache example", excerpt: "Illustrative portfolio example.", body: "A complete illustrative portfolio narrative for testing." };
  row = { id, slug: "cache-example", kind: "CASE_STUDY", status: "PUBLISHED", version: 1,
    publishedAt: new Date("2026-01-01"), createdAt: new Date("2026-01-01"), updatedAt: new Date("2026-01-01"), deletedAt: null, authorId: null,
    translations: { id: translation, en: translation }, details: {} };
  payloadReads = 0; guardReads = 0; globalThis.__portfolioCache = new Map();
}
function eligible(where) {
  return row.deletedAt === null && where.status.in.includes(row.status) && row.publishedAt && row.publishedAt <= where.publishedAt.lte;
}
const originalMany = db.contentEntry.findMany, originalFirst = db.contentEntry.findFirst, originalRoute = db.portfolioRoute.findUnique;
db.contentEntry.findMany = async ({ where, select }) => {
  if (select) guardReads++; else payloadReads++;
  if (!eligible(where)) return [];
  if (where.OR && !where.OR.some(key => key.id === id && key.version === row.version && +key.updatedAt === +row.updatedAt)) return [];
  return [structuredClone(select ? { id, version: row.version, updatedAt: row.updatedAt } : row)];
};
db.contentEntry.findFirst = async ({ where }) => eligible(where) ? { id, version: row.version, updatedAt: row.updatedAt } : null;
db.portfolioRoute.findUnique = async ({ where }) => ["cache-example", "old-example"].includes(where.value) ? { contentId: id } : null;
test.after(async () => { db.contentEntry.findMany = originalMany; db.contentEntry.findFirst = originalFirst; db.portfolioRoute.findUnique = originalRoute; delete globalThis.__portfolioCache; await db.$disconnect(); });

test("payload cache reuses revisions but live eligibility withdraws draft/archive/future content", async () => {
  reset();
  const first = await publishedPortfolioContent(); const second = await publishedPortfolioContent();
  assert.equal(payloadReads, 1); assert.equal(guardReads, 2); assert.equal(first[0].id, second[0].id);
  assert.ok(second[0].updatedAt instanceof Date); assert.ok(second[0].publishedAt instanceof Date);
  for (const status of ["DRAFT", "REVIEW", "ARCHIVED"]) {
    row.status = status; assert.deepEqual(await publishedPortfolioContent(), []);
    assert.equal(await resolvePublishedPortfolio("old-example"), null);
  }
  row.status = "PUBLISHED"; row.deletedAt = new Date(); assert.deepEqual(await publishedPortfolioContent(), []);
  row.deletedAt = null; row.status = "SCHEDULED"; row.publishedAt = new Date(Date.now() + 60000);
  assert.deepEqual(await publishedPortfolioContent(), []);
  row.publishedAt = new Date(Date.now() - 1000); row.version++; row.updatedAt = new Date();
  assert.equal((await publishedPortfolioContent()).length, 1); assert.equal(payloadReads, 2);
});

test("revision/update time keys, tag invalidation and live aliases prevent stale published payload", async () => {
  reset(); await publishedPortfolioContent();
  row.translations.id.title = "Updated title"; row.version++; row.updatedAt = new Date();
  assert.equal((await publishedPortfolioContent())[0].translations.id.title, "Updated title");
  row.translations.id.title = "External update"; row.updatedAt = new Date(+row.updatedAt + 1);
  assert.equal((await publishedPortfolioContent())[0].translations.id.title, "External update");
  const alias = await resolvePublishedPortfolio("old-example"); assert.equal(alias.redirect, true); assert.equal(alias.canonicalSlug, row.slug);
  const before = payloadReads; updateTag("portfolio-public"); await publishedPortfolioContent(); assert.equal(payloadReads, before + 1);
});

test("a warm cache never substitutes for a failed live eligibility query", async () => {
  reset(); await publishedPortfolioContent(); const many = db.contentEntry.findMany;
  db.contentEntry.findMany = async () => { throw new Error("Synthetic database outage"); };
  try { await assert.rejects(publishedPortfolioContent, /Synthetic database outage/); }
  finally { db.contentEntry.findMany = many; }
});

test("work shell streams before a delayed database query and later includes cards/schema", async () => {
  reset(); const many = db.contentEntry.findMany;
  let release; const blocked = new Promise(resolve => { release = resolve; });
  db.contentEntry.findMany = async args => { await blocked; return many(args); };
  const element = await Work({ params: Promise.resolve({ locale: "id" }) });
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
    assert.match(output, /Solusi yang dibuat/); assert.match(output, /Memuat portfolio/); assert.ok(!output.includes("Cache example"));
    release(); await done;
    assert.match(output, /Cache example/); assert.match(output, /application\/ld\+json/); assert.match(output, /\/id\/work\/cache-example/);
  } finally { release(); rendering?.abort(); db.contentEntry.findMany = many; }
});
