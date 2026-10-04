import "./server-loader.mjs";
import test from "node:test";
import assert from "node:assert/strict";
import { createHash, randomUUID } from "node:crypto";

// Destructive fixture cleanup is permitted only on this dedicated disposable database.
if (!process.env.DATABASE_URL || new URL(process.env.DATABASE_URL).pathname !== "/lunabiner_portfolio_test")
  throw new Error("Use the dedicated lunabiner_portfolio_test database, never the application database.");
const { db } = await import("../src/lib/db.ts");
const { savePortfolio, changePortfolioLifecycle, resolvePublishedPortfolio } = await import("../src/features/portfolio/service.ts");
const { saveContent, publishedContent } = await import("../src/features/cms/service.ts");
const { seedPortfolioExamples, portfolioExamples } = await import("../src/features/portfolio/seed.ts");
const { legacyPortfolioKeys } = await import("../src/features/portfolio/legacy-content.ts");
const { getCaseStudySeoContent } = await import("../src/features/website/seo/content.ts");
const { buildPublicSitemap } = await import("../src/features/website/seo/sitemap.ts");
const translation = { title: "Isolated illustration", excerpt: "A test-only business workflow example.", body: "This is isolated test content, not a real company portfolio." };
const richTranslation = { ...translation, richBody: { type: "doc", content: [{ type: "paragraph", content: [{ type: "text", text: translation.body }] }] } };
const input = slug => ({ kind: "CASE_STUDY", slug, status: "DRAFT", translations: { id: richTranslation, en: richTranslation }, details: {} });

test("portfolio persistence, route reservations, lifecycle, permissions and seeding", async t => {
  const contentIds = [], userIds = [], tokens = {};
  try {
    for (const role of ["ADMIN", "CONTENT_EDITOR", "SALES"]) {
      const token = randomUUID();
      const user = await db.user.create({ data: { name: "Portfolio test", email: `${token}@example.test`, passwordHash: "synthetic-test-only", role } });
      userIds.push(user.id); tokens[role] = token;
      await db.session.create({ data: { userId: user.id, tokenHash: createHash("sha256").update(token).digest("hex"), expiresAt: new Date(Date.now() + 600000) } });
    }
    globalThis.__phase2TestCookie = tokens.SALES;
    await assert.rejects(() => savePortfolio(input("forbidden-example")), /Unauthorized/);
    globalThis.__phase2TestCookie = tokens.CONTENT_EDITOR;
    let entry = await savePortfolio(input("test-" + randomUUID())); contentIds.push(entry.id);
    assert.match(entry.id, /^[a-f0-9-]{36}$/);
    assert.equal(await resolvePublishedPortfolio(entry.slug), null);
    assert.equal(await resolvePublishedPortfolio(entry.id), null);
    await assert.rejects(() => changePortfolioLifecycle({ id: entry.id, version: entry.version, operation: "archive" }), /Unauthorized/);
    entry = await savePortfolio({ ...input(entry.slug), id: entry.id, version: entry.version, status: "REVIEW" });
    await assert.rejects(() => savePortfolio({ ...input(entry.slug), id: entry.id, version: entry.version, status: "PUBLISHED" }), /permission/);
    globalThis.__phase2TestCookie = tokens.ADMIN;
    entry = await savePortfolio({ ...input(entry.slug), id: entry.id, version: entry.version, status: "PUBLISHED" });
    assert.equal((await resolvePublishedPortfolio(entry.slug)).redirect, false);
    assert.equal((await resolvePublishedPortfolio(entry.id)).redirect, true);
    const oldSlug = entry.slug;
    entry = await savePortfolio({ ...input("renamed-" + randomUUID()), id: entry.id, version: entry.version, status: "PUBLISHED" });
    assert.equal((await resolvePublishedPortfolio(oldSlug)).canonicalSlug, entry.slug);
    await assert.rejects(() => savePortfolio(input(oldSlug)));
    await assert.rejects(() => db.portfolioRoute.update({ where: { value: oldSlug }, data: { value: "stolen-route" } }));
    await assert.rejects(() => changePortfolioLifecycle({ id: entry.id, version: entry.version - 1, operation: "archive" }), /changed/);
    entry = await changePortfolioLifecycle({ id: entry.id, version: entry.version, operation: "archive" });
    assert.equal(entry.status, "ARCHIVED"); assert.ok(entry.deletedAt);
    assert.equal(await resolvePublishedPortfolio(oldSlug), null);
    assert.ok(!(await publishedContent("CASE_STUDY")).some(item => item.id === entry.id));
    await assert.rejects(() => savePortfolio({ ...input(entry.slug), id: entry.id, version: entry.version }), /Restore/);
    await assert.rejects(() => savePortfolio(input(oldSlug)));
    entry = await changePortfolioLifecycle({ id: entry.id, version: entry.version, operation: "restore" });
    assert.equal(entry.status, "DRAFT"); assert.equal(entry.deletedAt, null); assert.equal(entry.publishedAt, null);
    assert.equal(await resolvePublishedPortfolio(entry.id), null);
    assert.equal(await db.auditEvent.count({ where: { recordId: entry.id } }), 6);

    await t.test("concurrent slug claims commit only one record", async () => {
      const slug = "race-" + randomUUID();
      const outcomes = await Promise.allSettled([savePortfolio(input(slug)), savePortfolio(input(slug))]);
      const winners = outcomes.filter(item => item.status === "fulfilled");
      assert.equal(winners.length, 1); contentIds.push(winners[0].value.id);
      assert.equal(await db.contentEntry.count({ where: { kind: "CASE_STUDY", slug } }), 1);
    });
    await t.test("rich body is preserved by refusing old plain-text editor writes", async () => {
      const richBody = { type: "doc", content: [{ type: "paragraph", content: [{ type: "text", text: translation.body }] }] };
      const rich = await savePortfolio({ ...input("rich-" + randomUUID()), translations: { id: { ...translation, richBody }, en: { ...translation, richBody } } });
      contentIds.push(rich.id);
      await assert.rejects(() => saveContent({ ...input(rich.slug), translations: { id: translation, en: translation }, id: rich.id, version: rich.version }), /portfolio editor/);
      assert.deepEqual((await db.contentEntry.findUniqueOrThrow({ where: { id: rich.id } })).translations.id.richBody, richBody);
    });
    await t.test("scheduled and even manually soft-deleted published rows stay nonpublic", async () => {
      const scheduled = await db.contentEntry.create({ data: { kind: "CASE_STUDY", slug: "schedule-" + randomUUID(), status: "SCHEDULED",
        translations: { id: translation, en: translation }, details: {}, publishedAt: new Date(Date.now() + 60000) } });
      contentIds.push(scheduled.id);
      assert.equal(await resolvePublishedPortfolio(scheduled.slug), null);
      await db.contentEntry.update({ where: { id: scheduled.id }, data: { publishedAt: new Date(Date.now() - 60000) } });
      assert.ok(await resolvePublishedPortfolio(scheduled.slug));
      await db.contentEntry.update({ where: { id: scheduled.id }, data: { status: "PUBLISHED", deletedAt: new Date() } });
      assert.equal(await resolvePublishedPortfolio(scheduled.slug), null);
    });
    await t.test("seed repeat preserves renamed, edited and deleted examples", async () => {
      const blocker = await savePortfolio(input("legacy-blocker-" + randomUUID())); contentIds.push(blocker.id);
      const reserved = await db.portfolioRoute.create({ data: { value: "3", contentId: blocker.id } });
      await assert.rejects(() => seedPortfolioExamples(db));
      assert.equal(await db.contentEntry.count({ where: { id: { in: portfolioExamples.map(item => item.id) } } }), 0);
      await db.portfolioRoute.delete({ where: { id: reserved.id } });
      assert.deepEqual(await seedPortfolioExamples(db), { created: 3, skipped: 0 });
      assert.equal((await getCaseStudySeoContent("id", "1")).entry.id, portfolioExamples[0].id);
      assert.ok((await getCaseStudySeoContent("en", "1")).entry.translations.en.richBody);
      const seededSitemap = await buildPublicSitemap();
      assert.ok(!seededSitemap.some(item => /\/work\/[123]$/.test(item.url)));
      assert.ok(seededSitemap.some(item => item.url.endsWith("/work/" + portfolioExamples[0].id)));
      const sample = portfolioExamples[0];
      const seed = await db.contentEntry.findUniqueOrThrow({ where: { id: sample.id } });
      for (const key of legacyPortfolioKeys) assert.equal(Object.hasOwn(seed.details, key), false);
      assert.match(seed.translations.id.body, /Industri/); assert.match(seed.translations.en.body, /Capabilities/);
      const edited = await db.contentEntry.update({ where: { id: sample.id }, data: { slug: "admin-renamed-example", version: { increment: 1 },
        translations: { ...seed.translations, id: { ...seed.translations.id, title: "Admin edited title" } } } });
      await changePortfolioLifecycle({ id: sample.id, version: edited.version, operation: "archive" });
      const before = await db.contentEntry.findUniqueOrThrow({ where: { id: sample.id } });
      assert.deepEqual(await seedPortfolioExamples(db), { created: 0, skipped: 3 });
      assert.deepEqual(await db.contentEntry.findUniqueOrThrow({ where: { id: sample.id } }), before);
      assert.equal(await resolvePublishedPortfolio("1"), null);
      assert.equal(await getCaseStudySeoContent("id", "1"), null);
      const archivedSitemap = await buildPublicSitemap();
      assert.ok(!archivedSitemap.some(item => item.url.endsWith("/work/1") || item.url.endsWith("/work/" + sample.id)));
      const restored = await changePortfolioLifecycle({ id: sample.id, version: before.version, operation: "restore" });
      const review = await savePortfolio({ translations: restored.translations, details: restored.details,
        id: restored.id, version: restored.version, kind: "CASE_STUDY", slug: restored.slug, status: "REVIEW", publishedAt: null });
      await savePortfolio({ translations: review.translations, details: review.details,
        id: review.id, version: review.version, kind: "CASE_STUDY", slug: review.slug, status: "PUBLISHED", publishedAt: null });
      assert.equal((await resolvePublishedPortfolio("1")).canonicalSlug, "admin-renamed-example");
      assert.equal((await resolvePublishedPortfolio(sample.slug)).canonicalSlug, "admin-renamed-example");
    });
  } finally {
    globalThis.__phase2TestCookie = undefined;
    const ids = [...contentIds, ...portfolioExamples.map(item => item.id)];
    await db.auditEvent.deleteMany({ where: { recordId: { in: ids } } });
    await db.portfolioRoute.deleteMany({ where: { contentId: { in: ids } } });
    await db.contentEntry.deleteMany({ where: { id: { in: ids } } });
    await db.user.deleteMany({ where: { id: { in: userIds } } });
    await db.$disconnect();
  }
});
