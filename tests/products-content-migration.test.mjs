import "./server-loader.mjs";
import test from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { readFile, stat, unlink } from "node:fs/promises";
const url = new URL(process.env.DATABASE_URL ?? "postgresql://invalid");
assert.equal(url.hostname, "127.0.0.1"); assert.equal(url.port, "55441"); assert.equal(url.username, "portfolio_test"); assert.equal(url.pathname, "/lunabiner_portfolio_test");
const { db } = await import("../src/lib/db.ts");
const { migrateProductSummary, restoreProductSummary, productBackupSchema, convertProductSummary, previewProducts } = await import("../src/features/products/content-migration.ts");
const { productExamples, seedProductExamples } = await import("../src/features/products/seed.ts");
const { plainTextToRichDocument } = await import("../src/features/cms/rich-text.ts");
const target = { host: "127.0.0.1", port: 55441, database: "lunabiner_portfolio_test", schema: "public" };
const text = "Private communications for organizations that need control and security.";
const translation = { title: "Migration product", excerpt: text, body: text, richBody: plainTextToRichDocument(text), seoTitle: "Keep SEO" };

test("product cleanup is atomic, backed up, nonmutating to workflow, idempotent and recoverable", async t => {
  const ids = [];
  const create = async (extra = {}) => { const row = await db.contentEntry.create({ data: { kind: "PRODUCT", slug: "summary-migrate-" + randomUUID(), translations: { id: translation, en: translation }, details: { features: ["Custom preserved feature"], image: "/images/lunabiner-logo.png", productStatus: "LIVE", ctaPath: "/en/contact" }, ...extra } }); ids.push(row.id); return row; };
  const remove = async id => { await db.productRoute.deleteMany({ where: { contentId: id } }); await db.contentEntry.delete({ where: { id } }); };
  try {
    const known = await create({ id: productExamples[0].id, status: "PUBLISHED", publishedAt: new Date("2026-01-01"), details: { features: [...productExamples[0].features.en], productStatus: "COMING_SOON" } });
    const configured = await create({ status: "ARCHIVED", deletedAt: new Date(), details: { features: ["Stale legacy"], productFeatures: { id: [], en: ["Admin configured"] }, productStatus: "BETA" } });
    let scheduled = await create({ status: "SCHEDULED", publishedAt: new Date("2030-01-01") });
    const article = await create({ kind: "ARTICLE" }), caseStudy = await create({ kind: "CASE_STUDY" });
    const routes = await db.productRoute.findMany({ where: { contentId: { in: ids } }, orderBy: { id: "asc" } });
    await t.test("backup failure and conflicting narrative produce zero partial writes", async () => {
      await assert.rejects(() => migrateProductSummary(db, target, async () => { throw new Error("Backup unavailable"); }), /Backup unavailable/);
      assert.deepEqual(await db.contentEntry.findUniqueOrThrow({ where: { id: known.id } }), known);
      const conflict = await create({ translations: { id: { ...translation, body: "Distinct body", richBody: undefined }, en: translation } });
      assert.ok((await previewProducts(db)).find(row => row.id === conflict.id).conflict);
      let backup = false; await assert.rejects(() => migrateProductSummary(db, target, async () => { backup = true; })); assert.equal(backup, false);
      assert.deepEqual(await db.contentEntry.findUniqueOrThrow({ where: { id: known.id } }), known); await remove(conflict.id);
    });
    await t.test("concurrent admin changes abort transaction, preserving admin edits", async () => {
      await assert.rejects(() => migrateProductSummary(db, target, async () => {
        await db.contentEntry.update({ where: { id: scheduled.id }, data: { version: { increment: 1 }, details: { ...scheduled.details, category: "Concurrent edit" } } });
      }));
      assert.equal((await db.contentEntry.findUniqueOrThrow({ where: { id: scheduled.id } })).details.category, "Concurrent edit");
      assert.deepEqual(await db.contentEntry.findUniqueOrThrow({ where: { id: known.id } }), known);
      scheduled = await db.contentEntry.findUniqueOrThrow({ where: { id: scheduled.id } });
    });
    let backup;
    assert.equal((await migrateProductSummary(db, target, async data => { backup = structuredClone(data); })).migrated, 3);
    for (const previous of [known, configured, scheduled]) {
      const current = await db.contentEntry.findUniqueOrThrow({ where: { id: previous.id } });
      assert.equal(current.version, previous.version + 1);
      for (const locale of ["id", "en"]) { assert.equal(current.translations[locale].body, undefined); assert.equal(current.translations[locale].richBody, undefined); assert.equal(current.translations[locale].excerpt, text); }
      assert.equal(current.details.features, undefined);
      for (const field of ["id", "slug", "status", "publishedAt", "deletedAt", "authorId", "createdAt"]) assert.deepEqual(current[field], previous[field]);
      assert.equal(convertProductSummary(current).changed, false);
    }
    assert.deepEqual((await db.contentEntry.findUniqueOrThrow({ where: { id: known.id } })).details.productFeatures, productExamples[0].features);
    assert.deepEqual((await db.contentEntry.findUniqueOrThrow({ where: { id: configured.id } })).details.productFeatures, configured.details.productFeatures);
    const custom = await db.contentEntry.findUniqueOrThrow({ where: { id: scheduled.id } }); assert.deepEqual(custom.details.productFeatures, { id: scheduled.details.features, en: scheduled.details.features }); assert.equal(custom.details.image, scheduled.details.image); assert.equal(custom.details.ctaPath, scheduled.details.ctaPath);
    assert.deepEqual(await db.contentEntry.findUniqueOrThrow({ where: { id: article.id } }), article); assert.deepEqual(await db.contentEntry.findUniqueOrThrow({ where: { id: caseStudy.id } }), caseStudy);
    assert.deepEqual(await db.productRoute.findMany({ where: { contentId: { in: ids } }, orderBy: { id: "asc" } }), routes);
    assert.equal((await migrateProductSummary(db, target, async () => assert.fail("No duplicate backup"))).migrated, 0);
    const tampered = structuredClone(backup); tampered.rows[0].after.details.category = "Tampered backup category"; assert.equal(productBackupSchema.safeParse(tampered).success, false);
    await assert.rejects(() => restoreProductSummary(db, { ...target, port: 55442 }, backup), /target mismatch/);
    await db.contentEntry.update({ where: { id: scheduled.id }, data: { version: { increment: 1 } } });
    await assert.rejects(() => restoreProductSummary(db, target, backup), /newer or unmatched/);
    // Rewind only synthetic fixture to test restore; not an operational override.
    await db.contentEntry.update({ where: { id: scheduled.id }, data: { version: scheduled.version + 1 } });
    assert.equal((await restoreProductSummary(db, target, backup)).restored, 3);
    for (const previous of [known, configured, scheduled]) { const restored = await db.contentEntry.findUniqueOrThrow({ where: { id: previous.id } }); assert.deepEqual(restored.translations, previous.translations); assert.deepEqual(restored.details, previous.details); assert.equal(restored.version, previous.version + 2); }
    await migrateProductSummary(db, target, async () => {});
    await t.test("CLI writes verified private backup and restores without workflow changes", async () => {
      const row = await create(), run = promisify(execFile), args = ["--import", "./scripts/typescript-loader.mjs", "scripts/migrate-product-summary.mjs"];
      let backupPath;
      try {
        const result = await run(process.execPath, [...args, "--apply", "--database", target.database], { env: process.env });
        assert.match(result.stdout, /1 migrated/); backupPath = result.stdout.match(/Private backup: (.+)/)[1];
        assert.equal((await stat(backupPath)).mode & 0o777, 0o600); const saved = productBackupSchema.parse(JSON.parse(await readFile(backupPath, "utf8"))); assert.equal(saved.rows[0].id, row.id);
        const result2 = await run(process.execPath, [...args, "--restore", backupPath, "--database", target.database], { env: process.env }); assert.match(result2.stdout, /1 restored/);
        assert.deepEqual((await db.contentEntry.findUniqueOrThrow({ where: { id: row.id } })).translations, row.translations);
      } finally { if (backupPath) await unlink(backupPath); }
    });
    // Repeat seed must preserve converted examples, not overwrite or resurrect.
    const before = await db.contentEntry.findUniqueOrThrow({ where: { id: known.id } });
    const seeded = await seedProductExamples(db); assert.equal(seeded.skipped, 1); ids.push(productExamples[1].id);
    assert.deepEqual(await db.contentEntry.findUniqueOrThrow({ where: { id: known.id } }), before);
  } finally {
    await db.auditEvent.deleteMany({ where: { recordId: { in: ids } } }); await db.productRoute.deleteMany({ where: { contentId: { in: ids } } }); await db.portfolioRoute.deleteMany({ where: { contentId: { in: ids } } }); await db.contentEntry.deleteMany({ where: { id: { in: ids } } }); await db.$disconnect();
  }
});
