import "./server-loader.mjs";
import test from "node:test";
import assert from "node:assert/strict";
import { randomUUID, createHash } from "node:crypto";

const target = new URL(process.env.DATABASE_URL ?? "postgresql://invalid");
assert.equal(target.hostname, "127.0.0.1"); assert.equal(target.port, "55441");
assert.equal(target.username, "portfolio_test"); assert.equal(target.pathname, "/lunabiner_portfolio_test");
const { db } = await import("../src/lib/db.ts");
const { saveProduct, changeProductLifecycle, resolvePublishedProduct, presentProduct } = await import("../src/features/products/service.ts");
const { saveContent } = await import("../src/features/cms/service.ts");
const { seedProductExamples, productExamples } = await import("../src/features/products/seed.ts");
const { plainTextToRichDocument } = await import("../src/features/cms/rich-text.ts");
const translation = { title: "Isolated product concept", excerpt: "Synthetic test description", richBody: plainTextToRichDocument("A synthetic concept used only in isolated tests, never a real product claim.") };
const input = (slug = "product-" + randomUUID(), status = "DRAFT", details = {}) => ({ kind: "PRODUCT", slug, status, translations: { id: translation, en: translation }, details });
const errorCode = code => error => error.code === code;

test("product foundation: permissions, routes, lifecycle, optimistic concurrency and seed", async t => {
  assert.equal((await db.$queryRaw`SELECT current_database() AS name`)[0].name, "lunabiner_portfolio_test");
  const userIds = [], ids = [], tokens = {};
  try {
    for (const role of ["ADMIN", "CONTENT_EDITOR", "SALES"]) {
      const token = randomUUID();
      const user = await db.user.create({ data: { name: "Product test", email: token + "@example.test", passwordHash: "synthetic-test-only", role } });
      userIds.push(user.id); tokens[role] = token;
      await db.session.create({ data: { userId: user.id, tokenHash: createHash("sha256").update(token).digest("hex"), expiresAt: new Date(Date.now() + 600000) } });
    }
    await t.test("direct publishing, private LIVE draft and publisher permission", async () => {
      globalThis.__phase2TestCookie = tokens.SALES;
      await assert.rejects(() => saveProduct(input()), /Unauthorized/);
      globalThis.__phase2TestCookie = tokens.CONTENT_EDITOR;
      let row = await saveProduct(input(undefined, "DRAFT", { productStatus: "LIVE" })); ids.push(row.id);
      assert.match(row.id, /^[0-9a-f-]{36}$/);
      assert.equal(await resolvePublishedProduct(row.id), null);
      assert.equal(await resolvePublishedProduct(row.slug), null);
      await assert.rejects(() => saveProduct({ ...input(row.slug, "PUBLISHED"), id: row.id, version: row.version }), errorCode("PERMISSION"));
      await assert.rejects(() => changeProductLifecycle({ id: row.id, version: row.version, operation: "archive" }), /Unauthorized/);
      globalThis.__phase2TestCookie = tokens.ADMIN;
      row = await saveProduct({ ...input(row.slug, "PUBLISHED", { productStatus: "COMING_SOON" }), id: row.id, version: row.version });
      assert.ok(row.publishedAt <= new Date());
      assert.equal((await resolvePublishedProduct(row.slug)).redirect, false);
      assert.equal((await resolvePublishedProduct(row.id)).redirect, true);
      assert.equal(presentProduct(row).details.productCta.path, "/consultation");
      globalThis.__phase2TestCookie = tokens.CONTENT_EDITOR;
      await assert.rejects(() => saveProduct({ ...input(row.slug), id: row.id, version: row.version }), errorCode("PERMISSION"));
      globalThis.__phase2TestCookie = tokens.ADMIN;
      const before = row, oldSlug = row.slug;
      row = await saveProduct({ ...input(undefined, "PUBLISHED", { productStatus: "BETA", productCta: { type: "external", url: "https://demo.example.test" } }), id: row.id, version: row.version });
      assert.equal(row.publishedAt.toISOString(), before.publishedAt.toISOString());
      assert.equal((await resolvePublishedProduct(oldSlug)).canonicalSlug, row.slug);
      await assert.rejects(() => saveProduct(input(oldSlug)));
      await assert.rejects(() => db.productRoute.update({ where: { value: oldSlug }, data: { value: "stolen-route" } }));
      await assert.rejects(() => db.contentEntry.update({ where: { id: row.id }, data: { kind: "ARTICLE" } }));
      await assert.rejects(() => saveProduct({ ...input(row.slug), id: row.id, version: before.version }), errorCode("VERSION"));
      await assert.rejects(() => changeProductLifecycle({ id: row.id, version: before.version, operation: "archive" }), errorCode("VERSION"));
      const dataBefore = { translations: row.translations, details: row.details };
      row = await changeProductLifecycle({ id: row.id, version: row.version, operation: "archive" });
      assert.ok(row.deletedAt); assert.equal(row.status, "ARCHIVED");
      assert.equal(await resolvePublishedProduct(oldSlug), null);
      await assert.rejects(() => saveProduct({ ...input(row.slug), id: row.id, version: row.version }), errorCode("ARCHIVED"));
      await assert.rejects(() => saveProduct(input(oldSlug)));
      row = await changeProductLifecycle({ id: row.id, version: row.version, operation: "restore" });
      assert.equal(row.status, "DRAFT"); assert.equal(row.publishedAt, null); assert.equal(row.deletedAt, null);
      assert.deepEqual({ translations: row.translations, details: row.details }, dataBefore);
      assert.equal(await resolvePublishedProduct(row.id), null);
      assert.equal(await db.auditEvent.count({ where: { recordId: row.id } }), 5);
    });
    await t.test("schedule due checks, UTC validation and soft-delete guards", async () => {
      await assert.rejects(() => saveProduct({ ...input(undefined, "SCHEDULED"), publishedAt: new Date(Date.now() - 60000).toISOString() }), errorCode("SCHEDULE"));
      let row = await saveProduct({ ...input(undefined, "SCHEDULED"), publishedAt: new Date(Date.now() + 60000).toISOString() }); ids.push(row.id);
      assert.equal(await resolvePublishedProduct(row.id), null);
      row = await db.contentEntry.update({ where: { id: row.id }, data: { publishedAt: new Date(Date.now() - 60000) } });
      assert.ok(await resolvePublishedProduct(row.id));
      await db.contentEntry.update({ where: { id: row.id }, data: { status: "PUBLISHED", deletedAt: new Date() } });
      assert.equal(await resolvePublishedProduct(row.id), null);
      assert.equal(await resolvePublishedProduct("unknown-product"), null);
    });
    await t.test("all three direct status transitions remain separate from readiness", async () => {
      for (const from of ["DRAFT", "PUBLISHED", "SCHEDULED"]) {
        const data = { productStatus: "LIVE" };
        let row = await saveProduct({ ...input(undefined, from, data), publishedAt: from === "SCHEDULED" ? new Date(Date.now() + 60000).toISOString() : null }); ids.push(row.id);
        for (const to of ["DRAFT", "PUBLISHED", "SCHEDULED"]) {
          row = await saveProduct({ ...input(row.slug, to, data), id: row.id, version: row.version, publishedAt: to === "SCHEDULED" ? new Date(Date.now() + 60000).toISOString() : null });
          assert.equal(row.status, to); assert.equal(presentProduct(row).details.productStatus, "LIVE");
          assert.equal(Boolean(await resolvePublishedProduct(row.id)), to === "PUBLISHED");
        }
      }
    });
    await t.test("concurrent slug writes/versioned updates and separate portfolio namespace", async () => {
      const slug = "race-" + randomUUID();
      const race = await Promise.allSettled([saveProduct(input(slug)), saveProduct(input(slug))]);
      const winners = race.filter(result => result.status === "fulfilled"); assert.equal(winners.length, 1);
      const row = winners[0].value; ids.push(row.id);
      const versions = await Promise.allSettled([saveProduct({ ...input(slug), id: row.id, version: row.version }), saveProduct({ ...input(slug), id: row.id, version: row.version })]);
      assert.equal(versions.filter(result => result.status === "fulfilled").length, 1);
      const portfolio = await db.contentEntry.create({ data: { kind: "CASE_STUDY", slug, translations: input().translations, details: {} } }); ids.push(portfolio.id);
      await assert.rejects(() => db.productRoute.create({ data: { value: "not-product-" + randomUUID(), contentId: portfolio.id } }));
      await assert.rejects(() => db.contentEntry.delete({ where: { id: row.id } }));
    });
    await t.test("legacy generic compatibility converts once, rich/CTA preserved against old form", async () => {
      const plain = { title: translation.title, excerpt: translation.excerpt, body: "Original legacy body content with enough detail for publishing." };
      let row = await db.contentEntry.create({ data: { kind: "PRODUCT", slug: "legacy-" + randomUUID(), translations: { id: plain, en: plain }, details: { ctaPath: "/en/contact", features: ["Legacy feature"], productStatus: "BETA" } } }); ids.push(row.id);
      const normalized = presentProduct(row);
      assert.equal(normalized.details.productCta.path, "/contact");
      row = await saveContent({ ...input(row.slug, "PUBLISHED", normalized.details), translations: { id: plain, en: plain }, id: row.id, version: row.version });
      assert.equal(row.translations.id.body, plain.body);
      assert.equal(presentProduct(row).details.productStatus, "BETA");
      assert.deepEqual(presentProduct(row).details.features, ["Legacy feature"]);
      await assert.rejects(() => saveContent({ ...input(row.slug), translations: { id: plain, en: plain }, id: row.id, version: row.version }), errorCode("RICH_CONTENT"));
      row = await saveProduct({ ...input(row.slug), id: row.id, version: row.version, details: { productCta: { type: "external", url: "https://example.test" } } });
      row = await saveContent({ ...input(row.slug), id: row.id, version: row.version });
      assert.equal(presentProduct(row).details.productCta.url, "https://example.test");
    });
    await t.test("seed transaction, stable UUIDs, repeat and edited/archived examples preserved", async () => {
      const blocker = await db.contentEntry.create({ data: { id: productExamples[1].id, kind: "ARTICLE", slug: "seed-blocker", translations: input().translations, details: {} } }); ids.push(blocker.id);
      await assert.rejects(() => seedProductExamples(db));
      assert.equal(await db.contentEntry.count({ where: { id: productExamples[0].id } }), 0);
      await db.contentEntry.delete({ where: { id: blocker.id } });
      assert.deepEqual(await seedProductExamples(db), { created: 2, skipped: 0 });
      ids.push(...productExamples.map(example => example.id));
      const seed = await db.contentEntry.findUniqueOrThrow({ where: { id: productExamples[0].id } });
      assert.equal(seed.details.productStatus, "COMING_SOON"); assert.equal(seed.status, "PUBLISHED");
      const edited = await saveProduct({ ...input("admin-renamed-concept", "PUBLISHED", seed.details), translations: seed.translations, id: seed.id, version: seed.version });
      const archived = await changeProductLifecycle({ id: edited.id, version: edited.version, operation: "archive" });
      assert.deepEqual(await seedProductExamples(db), { created: 0, skipped: 2 });
      assert.deepEqual(await db.contentEntry.findUniqueOrThrow({ where: { id: seed.id } }), archived);
      assert.equal(await resolvePublishedProduct(productExamples[0].slug), null);
      await db.productRoute.deleteMany({ where: { contentId: seed.id } });
      await db.contentEntry.delete({ where: { id: seed.id } });
      const existing = await saveProduct(input(productExamples[0].slug)); ids.push(existing.id);
      assert.deepEqual(await seedProductExamples(db), { created: 0, skipped: 2 });
      assert.equal(await db.contentEntry.count({ where: { id: seed.id } }), 0);
    });
  } finally {
    globalThis.__phase2TestCookie = undefined;
    await db.auditEvent.deleteMany({ where: { recordId: { in: ids } } });
    await db.productRoute.deleteMany({ where: { contentId: { in: ids } } });
    await db.portfolioRoute.deleteMany({ where: { contentId: { in: ids } } });
    await db.contentEntry.deleteMany({ where: { id: { in: ids } } });
    await db.user.deleteMany({ where: { id: { in: userIds } } });
    await db.$disconnect();
  }
});
