import "./server-loader.mjs";
import test from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { readFile, stat, unlink } from "node:fs/promises";
if (!process.env.DATABASE_URL || new URL(process.env.DATABASE_URL).pathname !== "/lunabiner_portfolio_test") throw new Error("Use the dedicated disposable portfolio database.");
const { db } = await import("../src/lib/db.ts");
const { migratePortfolioContent, restorePortfolioContent, portfolioBackupSchema } = await import("../src/features/portfolio/content-migration.ts");
const { convertLegacyPortfolioContent, legacyPortfolioKeys } = await import("../src/features/portfolio/legacy-content.ts");
const target = { host: "127.0.0.1", port: 55441, database: "lunabiner_portfolio_test" };
const text = { title: "Migration fixture", excerpt: "An isolated bilingual portfolio example.", body: "Admin introduction that must be preserved.", seoTitle: "Admin SEO" };

test("content migration is atomic, backed up, idempotent, limited to cases and safely recoverable", async t => {
  const ids = [];
  async function create(kind = "CASE_STUDY", extra = {}) {
    const row = await db.contentEntry.create({ data: { kind, slug: "migration-" + randomUUID(), translations: { id: text, en: text },
      details: { industry: { id: "Distribusi", en: "Distribution" }, capabilities: ["Automation"], category: "Operations", verifiedProject: false }, ...extra } });
    ids.push(row.id); return row;
  }
  try {
    const rows = [await create(), await create("CASE_STUDY", { status: "ARCHIVED", deletedAt: new Date() }),
      await create("CASE_STUDY", { status: "SCHEDULED", publishedAt: new Date("2030-01-01") })];
    const article = await create("ARTICLE"), product = await create("PRODUCT");
    const routesBefore = await db.portfolioRoute.findMany({ where: { contentId: { in: ids } }, orderBy: { id: "asc" } });
    await t.test("backup failures and invalid rows produce no partial mutation", async () => {
      await assert.rejects(() => migratePortfolioContent(db, target, async () => { throw new Error("Backup unavailable"); }), /Backup unavailable/);
      assert.deepEqual(await db.contentEntry.findUnique({ where: { id: rows[0].id } }), rows[0]);
      const invalid = await create("CASE_STUDY", { translations: { id: text, en: { ...text, richBody: { type: "doc", content: [{ type: "image" }] } } } });
      let backedUp = false;
      await assert.rejects(() => migratePortfolioContent(db, target, async () => { backedUp = true; })); assert.equal(backedUp, false);
      assert.deepEqual(await db.contentEntry.findUnique({ where: { id: rows[1].id } }), rows[1]);
      await db.portfolioRoute.deleteMany({ where: { contentId: invalid.id } }); await db.contentEntry.delete({ where: { id: invalid.id } });
    });
    await t.test("concurrent admin edits abort migration without erasing the edit", async () => {
      await assert.rejects(() => migratePortfolioContent(db, target, async () => {
        await db.contentEntry.update({ where: { id: rows[0].id }, data: { version: { increment: 1 }, details: { ...rows[0].details, category: "Concurrent admin category" } } });
      }));
      rows[0] = await db.contentEntry.findUniqueOrThrow({ where: { id: rows[0].id } });
      assert.equal(rows[0].details.category, "Concurrent admin category"); assert.ok(Object.hasOwn(rows[0].details, "industry"));
      assert.deepEqual(await db.contentEntry.findUnique({ where: { id: rows[1].id } }), rows[1]);
    });
    let backup;
    const result = await migratePortfolioContent(db, target, async data => { backup = structuredClone(data); });
    assert.equal(result.migrated, 3); assert.equal(backup.rows.length, 3);
    for (const previous of rows) {
      const current = await db.contentEntry.findUniqueOrThrow({ where: { id: previous.id } });
      assert.equal(current.version, previous.version + 1); assert.match(current.translations.id.body, /Distribusi/); assert.match(current.translations.en.body, /Distribution/);
      for (const key of legacyPortfolioKeys) assert.equal(Object.hasOwn(current.details, key), false);
      for (const key of ["id", "slug", "status", "publishedAt", "deletedAt", "authorId", "createdAt"]) assert.deepEqual(current[key], previous[key]);
      assert.equal(convertLegacyPortfolioContent(current).changed, false); // JSONB key order must not cause repeat writes.
    }
    assert.equal((await migratePortfolioContent(db, target, async () => { assert.fail("No second backup needed"); })).migrated, 0);
    assert.deepEqual(await db.contentEntry.findUnique({ where: { id: article.id } }), article);
    assert.deepEqual(await db.contentEntry.findUnique({ where: { id: product.id } }), product);
    assert.deepEqual(await db.portfolioRoute.findMany({ where: { contentId: { in: ids } }, orderBy: { id: "asc" } }), routesBefore);
    assert.equal(await db.auditEvent.count({ where: { recordId: { in: rows.map(row => row.id) }, action: "portfolio.content.migrate" } }), 3);
    const tampered = structuredClone(backup); tampered.rows[0].after.details.category = "Tampered";
    assert.equal(portfolioBackupSchema.safeParse(tampered).success, false);
    await assert.rejects(() => restorePortfolioContent(db, { ...target, port: 55442 }, backup), /target mismatch/);
    await db.contentEntry.update({ where: { id: rows[2].id }, data: { version: { increment: 1 } } });
    const beforeConflict = await db.contentEntry.findMany({ where: { id: { in: ids } }, orderBy: { id: "asc" } });
    await assert.rejects(() => restorePortfolioContent(db, target, backup), /newer or unmatched/);
    assert.deepEqual(await db.contentEntry.findMany({ where: { id: { in: ids } }, orderBy: { id: "asc" } }), beforeConflict);
    // Reset only this synthetic fixture's version to exercise recovery; never
    // rewind a real record or offer a forced restore operational option.
    await db.contentEntry.update({ where: { id: rows[2].id }, data: { version: rows[2].version + 1 } });
    assert.equal((await restorePortfolioContent(db, target, backup)).restored, 3);
    for (const previous of rows) {
      const restored = await db.contentEntry.findUniqueOrThrow({ where: { id: previous.id } });
      assert.deepEqual(restored.translations, previous.translations); assert.deepEqual(restored.details, previous.details); assert.equal(restored.version, previous.version + 2);
    }
    assert.equal((await migratePortfolioContent(db, target, async () => {})).migrated, 3);
    await t.test("operational CLI writes a private verified backup and restores it", async () => {
      const cliRow = await create(), run = promisify(execFile);
      const args = ["--import", "./scripts/typescript-loader.mjs", "scripts/migrate-portfolio-content.mjs"];
      let backupPath;
      try {
        const applied = await run(process.execPath, [...args, "--apply", "--database", target.database], { env: process.env, timeout: 10000 });
        assert.match(applied.stdout, /1 migrated/); backupPath = applied.stdout.match(/Private backup: (.+)/)?.[1]; assert.ok(backupPath);
        assert.equal((await stat(backupPath)).mode & 0o777, 0o600);
        const saved = portfolioBackupSchema.parse(JSON.parse(await readFile(backupPath, "utf8"))); assert.equal(saved.rows.length, 1);
        assert.equal(saved.rows[0].id, cliRow.id);
        const restored = await run(process.execPath, [...args, "--restore", backupPath, "--database", target.database], { env: process.env, timeout: 10000 });
        assert.match(restored.stdout, /1 restored/);
        assert.deepEqual((await db.contentEntry.findUniqueOrThrow({ where: { id: cliRow.id } })).details, cliRow.details);
      } finally { if (backupPath) await unlink(backupPath); }
    });
  } finally {
    await db.auditEvent.deleteMany({ where: { recordId: { in: ids } } }); await db.portfolioRoute.deleteMany({ where: { contentId: { in: ids } } });
    await db.productRoute.deleteMany({ where: { contentId: { in: ids } } });
    await db.contentEntry.deleteMany({ where: { id: { in: ids } } }); await db.$disconnect();
  }
});
