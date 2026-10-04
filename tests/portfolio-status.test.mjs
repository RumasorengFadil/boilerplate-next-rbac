import "./server-loader.mjs";
import test from "node:test";
import assert from "node:assert/strict";
import { createHash, randomUUID } from "node:crypto";

const target = new URL(process.env.DATABASE_URL || "postgresql://invalid");
assert.equal(target.hostname, "127.0.0.1"); assert.equal(target.port, "55441");
assert.equal(target.username, "portfolio_test"); assert.equal(target.pathname, "/lunabiner_portfolio_test");
const { db } = await import("../src/lib/db.ts");
const { savePortfolio, changePortfolioLifecycle, resolvePublishedPortfolio } = await import("../src/features/portfolio/service.ts");
const { saveContent } = await import("../src/features/cms/service.ts");
const { buildPublicSitemap } = await import("../src/features/website/seo/sitemap.ts");
const { portfolioInputSchema } = await import("../src/features/portfolio/schema.ts");
const text = { title: "Direct status fixture", excerpt: "Illustrative business workflow.", richBody: { type: "doc", content: [{ type: "paragraph", content: [{ type: "text", text: "Complete illustrative business context for direct portfolio status QA." }] }] } };
const payload = (status, row) => ({ kind: "CASE_STUDY", slug: row?.slug ?? "direct-status-" + randomUUID(), status,
  ...(row ? { id: row.id, version: row.version } : {}), publishedAt: status === "SCHEDULED" ? new Date(Date.now() + 600000).toISOString() : null,
  translations: { id: text, en: text }, details: {} });

test("portfolio direct statuses preserve publication, permissions, version and separate archive behavior", async () => {
  const ids = [], users = [], tokens = {};
  try {
    for (const role of ["ADMIN", "CONTENT_EDITOR"]) {
      const token = randomUUID(); const user = await db.user.create({ data: { email: token + "@example.test", name: "Status fixture", role, passwordHash: "synthetic" } }); users.push(user.id); tokens[role] = token;
      await db.session.create({ data: { userId: user.id, tokenHash: createHash("sha256").update(token).digest("hex"), expiresAt: new Date(Date.now() + 600000) } });
    }
    globalThis.__phase2TestCookie = tokens.ADMIN;
    for (const from of ["DRAFT", "REVIEW", "PUBLISHED", "SCHEDULED"]) {
      let row = await savePortfolio(payload(from)); ids.push(row.id);
      for (const to of ["DRAFT", "REVIEW", "PUBLISHED", "SCHEDULED"]) {
        if (row.status !== from) row = await savePortfolio(payload(from, row));
        row = await savePortfolio(payload(to, row)); assert.equal(row.status, to);
        assert.equal(row.deletedAt, null);
        assert.equal(Boolean(await resolvePublishedPortfolio(row.slug)), to === "PUBLISHED");
        const listed = (await buildPublicSitemap()).some(item => item.url.endsWith("/work/" + row.slug));
        assert.equal(listed, to === "PUBLISHED");
        if (["DRAFT", "REVIEW"].includes(to)) assert.equal(row.publishedAt, null);
        if (to === "SCHEDULED") assert.ok(row.publishedAt > new Date());
      }
    }
    let row = await savePortfolio(payload("DRAFT")); ids.push(row.id);
    assert.equal(portfolioInputSchema.safeParse(payload("ARCHIVED", row)).success, false);
    await assert.rejects(() => saveContent(payload("ARCHIVED", row)), /archive action/);
    assert.equal((await db.contentEntry.findUniqueOrThrow({ where: { id: row.id } })).deletedAt, null);
    globalThis.__phase2TestCookie = tokens.CONTENT_EDITOR;
    for (const status of ["PUBLISHED", "SCHEDULED"]) await assert.rejects(() => savePortfolio(payload(status, row)), /permission/);
    globalThis.__phase2TestCookie = tokens.ADMIN;
    const stale = payload("PUBLISHED", row); row = await savePortfolio(payload("PUBLISHED", row));
    await assert.rejects(() => savePortfolio(stale), /changed/);
    row = await changePortfolioLifecycle({ id: row.id, version: row.version, operation: "archive" });
    assert.equal(row.status, "ARCHIVED"); assert.ok(row.deletedAt);
    assert.equal(await db.contentEntry.count({ where: { id: row.id, deletedAt: null } }), 0);
    assert.equal(await db.contentEntry.count({ where: { id: row.id, deletedAt: { not: null } } }), 1);
    assert.equal(await resolvePublishedPortfolio(row.slug), null);
    await assert.rejects(() => savePortfolio(payload("PUBLISHED", row)), /Restore/);
    row = await changePortfolioLifecycle({ id: row.id, version: row.version, operation: "restore" });
    assert.equal(row.status, "DRAFT"); assert.equal(row.deletedAt, null);
    row = await savePortfolio(payload("SCHEDULED", row));
    await assert.rejects(() => savePortfolio({ ...payload("SCHEDULED", row), publishedAt: new Date(Date.now() - 60000).toISOString() }), /future/);
    await db.contentEntry.update({ where: { id: row.id }, data: { publishedAt: new Date(Date.now() - 60000) } });
    assert.ok(await resolvePublishedPortfolio(row.slug));
    assert.ok((await buildPublicSitemap()).some(item => item.url.endsWith("/work/" + row.slug)));
    row = await savePortfolio(payload("PUBLISHED", row)); assert.ok(await resolvePublishedPortfolio(row.slug));
    for (const kind of ["ARTICLE", "PRODUCT"]) {
      const translations = { id: { title: text.title, excerpt: text.excerpt, body: "Complete generic editorial context with sufficient publication text." }, en: { title: text.title, excerpt: text.excerpt, body: "Complete generic editorial context with sufficient publication text." } };
      await assert.rejects(() => saveContent({ ...payload("PUBLISHED"), kind, translations }), /review first/);
    }
  } finally {
    globalThis.__phase2TestCookie = undefined;
    await db.auditEvent.deleteMany({ where: { recordId: { in: ids } } }); await db.portfolioRoute.deleteMany({ where: { contentId: { in: ids } } });
    await db.contentEntry.deleteMany({ where: { id: { in: ids } } }); await db.user.deleteMany({ where: { id: { in: users } } }); await db.$disconnect();
  }
});
