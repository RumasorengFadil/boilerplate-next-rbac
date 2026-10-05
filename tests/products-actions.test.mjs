import "./server-loader.mjs";
import test from "node:test";
import assert from "node:assert/strict";
import { createHash, randomUUID } from "node:crypto";
const target = new URL(process.env.DATABASE_URL ?? "postgresql://invalid");
assert.equal(target.hostname, "127.0.0.1"); assert.equal(target.port, "55441");
assert.equal(target.username, "portfolio_test"); assert.equal(target.pathname, "/lunabiner_portfolio_test");
const { db } = await import("../src/lib/db.ts");
const { saveProductAction, productLifecycleAction } = await import("../src/features/products/actions.ts");
const { saveProduct } = await import("../src/features/products/service.ts");
const { seedProductExamples, productExamples } = await import("../src/features/products/seed.ts");

function form(row, changes = {}) {
  const fields = { slug: row?.slug ?? "textarea-" + randomUUID(), status: "DRAFT", productStatus: "COMING_SOON", ctaType: "internal", ctaInternalPath: "/consultation", category: "Product QA", tags: "Software, AI", authorName: "QA author",
    "ctaLabel.id": "Diskusikan produk", "ctaLabel.en": "Discuss product", ...changes };
  const data = new FormData();
  if (row) { data.set("id", row.id); data.set("version", String(row.version)); }
  for (const locale of ["id", "en"]) for (const [key, value] of Object.entries(row?.translations[locale] ?? { title: "Textarea product QA", excerpt: "A short product concept.", body: "Private communication for teams needing security and deployment flexibility." }))
    if (key !== "richBody") data.set(`${locale}.${key}`, String(value));
  for (const [key, value] of Object.entries(fields)) data.set(key, value);
  for (const locale of ["id", "en"]) for (const feature of row?.details.productFeatures?.[locale] ?? row?.details.features ?? []) data.append(`${locale}.feature`, feature);
  return data;
}
const lifecycle = (row, operation) => { const data = new FormData(); data.set("id", row.id); data.set("version", String(row.version)); data.set("operation", operation); return data; };

test("textarea Server Actions: validation, preserved fields/format, permissions, slug and archive", async t => {
  const users = [], ids = [], tokens = {};
  try {
    assert.equal((await db.$queryRaw`SELECT current_database() AS name`)[0].name, "lunabiner_portfolio_test");
    for (const role of ["ADMIN", "CONTENT_EDITOR", "SALES"]) {
      const token = randomUUID(); const user = await db.user.create({ data: { name: "Product action QA", email: token + "@example.test", passwordHash: "synthetic-only", role } }); users.push(user.id); tokens[role] = token;
      await db.session.create({ data: { userId: user.id, tokenHash: createHash("sha256").update(token).digest("hex"), expiresAt: new Date(Date.now() + 600000) } });
    }
    globalThis.__phase2TestCookie = tokens.SALES;
    await assert.rejects(() => saveProductAction({ message: "" }, form()), /Unauthorized/);
    globalThis.__phase2TestCookie = tokens.CONTENT_EDITOR;
    const over = form(); over.set("en.excerpt", "x".repeat(151));
    const invalid = await saveProductAction({ message: "" }, over); assert.equal(invalid.success, undefined); assert.match(invalid.fieldErrors["en.excerpt"], /maksimal 150/);
    const created = await saveProductAction({ message: "" }, form()); assert.equal(created.success, true); ids.push(created.id);
    let row = await db.contentEntry.findUniqueOrThrow({ where: { id: created.id } });
    assert.equal(row.translations.id.richBody, undefined); assert.equal(row.translations.id.body, undefined);
    assert.equal(row.details.features, undefined);
    const features = form(row); features.append("id.feature", "Chat privat"); features.append("en.feature", "Private chat");
    assert.equal((await saveProductAction({ message: "" }, features)).success, true);
    row = await db.contentEntry.findUniqueOrThrow({ where: { id: row.id } }); assert.deepEqual(row.details.productFeatures, { id: ["Chat privat"], en: ["Private chat"] });
    assert.equal(row.details.features, undefined);
    const badFeature = form(row); badFeature.set("en.feature", "x".repeat(101));
    assert.match((await saveProductAction({ message: "" }, badFeature)).fieldErrors["en.features.0"], /100 karakter/);
    const count = form(row); for (let index = 0; index < 12; index++) count.append("id.feature", "Extra");
    assert.match((await saveProductAction({ message: "" }, count)).fieldErrors["id.features"], /12 poin/);
    assert.equal((await saveProductAction({ message: "" }, form(row, { status: "PUBLISHED" }))).success, undefined);
    await assert.rejects(() => productLifecycleAction({ message: "" }, lifecycle(row, "archive")), /Unauthorized/);
    globalThis.__phase2TestCookie = tokens.ADMIN;
    const unsafe = await saveProductAction({ message: "" }, form(row, { ctaType: "external", ctaUrl: "javascript:alert(1)" })); assert.equal(unsafe.success, undefined); assert.match(unsafe.fieldErrors.productCta, /HTTPS/);
    const published = await saveProductAction({ message: "" }, form(row, { status: "PUBLISHED", productStatus: "BETA", ctaType: "external", ctaUrl: "https://demo.example.test" })); assert.equal(published.success, true);
    row = await db.contentEntry.findUniqueOrThrow({ where: { id: row.id } }); assert.equal(row.details.productCta.url, "https://demo.example.test");
    const stale = await saveProductAction({ message: "" }, form({ ...row, version: row.version - 1 })); assert.equal(stale.success, undefined); assert.match(stale.message, /versi terbaru/);
    const collision = await saveProductAction({ message: "" }, form(undefined, { slug: row.slug })); assert.equal(collision.success, undefined); assert.match(collision.fieldErrors.slug, /dicadangkan|digunakan/);
    const past = await saveProductAction({ message: "" }, form(row, { status: "SCHEDULED", publishedAt: "2000-01-01T00:00" })); assert.equal(past.success, undefined); assert.match(past.fieldErrors.publishedAt, /masa depan/);
    const archive = await productLifecycleAction({ message: "" }, lifecycle(row, "archive")); assert.equal(archive.success, true);
    row = await db.contentEntry.findUniqueOrThrow({ where: { id: row.id } });
    const restore = await productLifecycleAction({ message: "" }, lifecycle(row, "restore")); assert.equal(restore.success, true);
    row = await db.contentEntry.findUniqueOrThrow({ where: { id: row.id } }); assert.equal(row.status, "DRAFT"); assert.equal(row.details.productStatus, "BETA");

    await t.test("summary edits preserve legacy rich/cover while localized features can be removed", async () => {
      const rich = { type: "doc", content: [{ type: "heading", attrs: { level: 2 }, content: [{ type: "text", text: "a".repeat(180) }] }] };
      let legacy = await db.contentEntry.create({ data: { kind: "PRODUCT", slug: "rich-legacy-" + randomUUID(), status: "DRAFT",
        translations: { id: { title: "Legacy product", excerpt: "Legacy excerpt", body: "a".repeat(180), richBody: rich }, en: { title: "Legacy product", excerpt: "Legacy excerpt", body: "a".repeat(180), richBody: rich } },
        details: { image: "/images/lunabiner-logo.png", features: ["Keep feature"], ctaPath: "/en/contact", productStatus: "LIVE" } } }); ids.push(legacy.id);
      const forged = form(legacy, { ctaInternalPath: "/contact", productStatus: "LIVE" }); forged.set("image", "/images/replacement.png"); forged.set("features", "Drop original"); forged.set("id.richBody", "{injected}");
      assert.equal((await saveProductAction({ message: "" }, forged)).success, true);
      legacy = await db.contentEntry.findUniqueOrThrow({ where: { id: legacy.id } });
      assert.deepEqual(legacy.translations.id.richBody, rich); assert.equal(legacy.details.image, "/images/lunabiner-logo.png"); assert.deepEqual(legacy.details.features, ["Keep feature"]);
      const longEdit = form(legacy); longEdit.set("en.excerpt", "b".repeat(151));
      assert.equal((await saveProductAction({ message: "" }, longEdit)).success, undefined);
      const shortEdit = form(legacy); shortEdit.set("id.excerpt", "New short description updates summary only."); shortEdit.delete("id.feature");
      assert.equal((await saveProductAction({ message: "" }, shortEdit)).success, true);
      legacy = await db.contentEntry.findUniqueOrThrow({ where: { id: legacy.id } }); assert.match(legacy.translations.id.excerpt, /New short/); assert.deepEqual(legacy.translations.id.richBody, rich); assert.deepEqual(legacy.translations.en.richBody, rich); assert.deepEqual(legacy.details.productFeatures.id, []);
      await assert.rejects(() => saveProduct({ id: legacy.id, version: legacy.version, kind: "PRODUCT", slug: legacy.slug, status: "DRAFT", translations: { id: { title: "Legacy product", excerpt: "Legacy excerpt", body: legacy.translations.id.body }, en: { title: "Legacy product", excerpt: "Legacy excerpt", body: legacy.translations.en.body } }, details: {} }), /editor produk/);
    });
    await t.test("legacy ARCHIVED status can be explicitly restored without automatic publish", async () => {
      const legacy = await db.contentEntry.create({ data: { kind: "PRODUCT", slug: "archive-legacy-" + randomUUID(), status: "ARCHIVED", translations: row.translations, details: row.details } }); ids.push(legacy.id);
      const blocked = await saveProductAction({ message: "" }, form(legacy));
      assert.equal(blocked.success, undefined); assert.match(blocked.message, /Pulihkan produk/);
      assert.equal((await productLifecycleAction({ message: "" }, lifecycle(legacy, "restore"))).success, true);
      assert.equal((await db.contentEntry.findUniqueOrThrow({ where: { id: legacy.id } })).status, "DRAFT");
    });
    await t.test("new seed descriptions fit the textarea; repeat preserves records", async () => {
      assert.deepEqual(await seedProductExamples(db), { created: 2, skipped: 0 }); ids.push(...productExamples.map(item => item.id));
      for (const id of productExamples.map(item => item.id)) {
        const seed = await db.contentEntry.findUniqueOrThrow({ where: { id } });
        for (const locale of ["id", "en"]) { assert.equal(seed.translations[locale].body, undefined); assert.equal(seed.translations[locale].richBody, undefined); assert.ok(seed.translations[locale].excerpt.length <= 150); }
        assert.equal(seed.details.features, undefined); assert.ok(seed.details.productFeatures.id.length > 0);
      }
      assert.deepEqual(await seedProductExamples(db), { created: 0, skipped: 2 });
    });
  } finally {
    globalThis.__phase2TestCookie = undefined;
    await db.auditEvent.deleteMany({ where: { recordId: { in: ids } } }); await db.productRoute.deleteMany({ where: { contentId: { in: ids } } });
    await db.contentEntry.deleteMany({ where: { id: { in: ids } } }); await db.user.deleteMany({ where: { id: { in: users } } }); await db.$disconnect();
  }
});
