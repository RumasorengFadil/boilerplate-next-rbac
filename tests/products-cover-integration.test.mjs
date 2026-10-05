import "./server-loader.mjs";
import test from "node:test";
import assert from "node:assert/strict";
import { createHash, randomUUID } from "node:crypto";
import { mkdtemp, readdir, rm } from "node:fs/promises";
import sharp from "sharp";
const target = new URL(process.env.DATABASE_URL ?? "postgresql://invalid");
assert.equal(target.hostname, "127.0.0.1"); assert.equal(target.port, "55441");
assert.equal(target.username, "portfolio_test"); assert.equal(target.pathname, "/lunabiner_portfolio_test");
const { db } = await import("../src/lib/db.ts");
const { saveProductAction, productLifecycleAction } = await import("../src/features/products/actions.ts");
const { saveProduct } = await import("../src/features/products/service.ts");
const { parseProductCoverPath } = await import("../src/features/products/cover-schema.ts");
const { GET } = await import("../src/app/media/products/[contentId]/[assetId]/route.ts");
const image = await sharp({ create: { width: 80, height: 40, channels: 3, background: "#08747a" } }).png().toBuffer();
function form(row, operation = "keep") {
  const result = new FormData();
  result.set("ctaType", "internal"); result.set("ctaInternalPath", "/consultation");
  for (const [key, value] of Object.entries({ ...(row ? { id: row.id } : {}), version: row?.version ?? 1, slug: row?.slug ?? "product-cover-" + randomUUID(), status: row?.status === "ARCHIVED" ? "DRAFT" : row?.status ?? "DRAFT", coverOperation: operation, productStatus: "COMING_SOON" })) result.set(key, String(value));
  for (const locale of ["id", "en"]) { result.set(locale + ".title", "Product cover example"); result.set(locale + ".excerpt", "An isolated product cover example."); }
  if (operation === "replace") result.set("coverFile", new File([image], "../../unsafe.png", { type: "image/png" }));
  return result;
}
const response = path => GET(new Request("http://localhost" + path), { params: Promise.resolve(parseProductCoverPath(path)) });
test("product covers enforce eligibility, ownership, cleanup, lifecycle and audit", async () => {
  const directory = await mkdtemp("/private/tmp/lunabiner-product-cover-integration-");
  process.env.PRODUCT_UPLOAD_DIR = directory;
  const users = [], ids = [], tokens = {};
  try {
    for (const role of ["ADMIN", "CONTENT_EDITOR", "SALES"]) {
      const token = randomUUID(), user = await db.user.create({ data: { name: "Product cover fixture", email: token + "@example.test", role, passwordHash: "synthetic" } });
      users.push(user.id); tokens[role] = token;
      await db.session.create({ data: { userId: user.id, tokenHash: createHash("sha256").update(token).digest("hex"), expiresAt: new Date(Date.now() + 600000) } });
    }
    globalThis.__phase2TestCookie = tokens.SALES;
    await assert.rejects(() => saveProductAction({ message: "" }, form(null, "replace")), /Unauthorized/);
    assert.equal((await readdir(directory)).length, 0);
    globalThis.__phase2TestCookie = tokens.ADMIN;
    const saved = await saveProductAction({ message: "" }, form(null, "replace")); assert.equal(saved.success, true, saved.message); ids.push(saved.id);
    let row = await db.contentEntry.findUniqueOrThrow({ where: { id: saved.id } }); const original = row.details.image;
    assert.equal(parseProductCoverPath(original).contentId, row.id);
    assert.equal((await response(original)).status, 200);
    globalThis.__phase2TestCookie = undefined; assert.equal((await response(original)).status, 404);
    globalThis.__phase2TestCookie = tokens.SALES; assert.equal((await response(original)).status, 404);
    globalThis.__phase2TestCookie = tokens.ADMIN;
    const keep = form(row); keep.set("image", "/images/forged.png"); assert.equal((await saveProductAction({ message: "" }, keep)).success, true);
    row = await db.contentEntry.findUniqueOrThrow({ where: { id: row.id } }); assert.equal(row.details.image, original);
    const filesBefore = await readdir(`${directory}/${row.id}`);
    assert.equal((await saveProductAction({ message: "" }, form({ ...row, version: row.version - 1 }, "replace"))).success, undefined);
    assert.deepEqual(await readdir(`${directory}/${row.id}`), filesBefore);
    const collision = form(null, "replace"); collision.set("slug", row.slug);
    assert.equal((await saveProductAction({ message: "" }, collision)).success, undefined);
    for (const child of await readdir(directory)) if (child !== row.id) assert.equal((await readdir(`${directory}/${child}`)).length, 0);
    const bad = form(row, "replace"); bad.set("coverFile", new File(["fake"], "fake.png", { type: "image/png" }));
    assert.match((await saveProductAction({ message: "" }, bad)).fieldErrors.coverFile, /Gambar tidak valid/);
    const invalid = form(row); invalid.set("coverOperation", "invalid"); assert.ok((await saveProductAction({ message: "" }, invalid)).fieldErrors.coverFile);
    assert.equal((await saveProductAction({ message: "" }, form(row, "replace"))).success, true);
    row = await db.contentEntry.findUniqueOrThrow({ where: { id: row.id } }); const current = row.details.image; assert.notEqual(current, original);
    assert.equal((await response(original)).status, 404); assert.equal((await readdir(`${directory}/${row.id}`)).length, 2);
    const schedule = form(row); schedule.set("status", "SCHEDULED"); schedule.set("publishedAt", "2030-01-01T09:30");
    assert.equal((await saveProductAction({ message: "" }, schedule)).success, true);
    globalThis.__phase2TestCookie = undefined; assert.equal((await response(current)).status, 404);
    await db.contentEntry.update({ where: { id: row.id }, data: { publishedAt: new Date(Date.now() - 1000) } });
    assert.equal((await response(current)).status, 200);
    globalThis.__phase2TestCookie = tokens.ADMIN; row = await db.contentEntry.findUniqueOrThrow({ where: { id: row.id } });
    const publish = form(row); publish.set("status", "PUBLISHED"); assert.equal((await saveProductAction({ message: "" }, publish)).success, true);
    row = await db.contentEntry.findUniqueOrThrow({ where: { id: row.id } });
    globalThis.__phase2TestCookie = undefined;
    const publicImage = await response(current); assert.equal(publicImage.status, 200);
    for (const [name, value] of Object.entries({ "content-type": "image/webp", "cache-control": "private, no-store", "x-content-type-options": "nosniff", "x-robots-tag": "noindex" })) assert.equal(publicImage.headers.get(name), value);
    globalThis.__phase2TestCookie = tokens.CONTENT_EDITOR;
    assert.equal((await saveProductAction({ message: "" }, form(row, "replace"))).success, undefined);
    assert.equal((await readdir(`${directory}/${row.id}`)).length, 2);
    globalThis.__phase2TestCookie = tokens.ADMIN;
    const other = await saveProductAction({ message: "" }, form(null)); assert.equal(other.success, true); ids.push(other.id);
    const otherRow = await db.contentEntry.findUniqueOrThrow({ where: { id: other.id } });
    await assert.rejects(() => saveProduct({ id: other.id, version: otherRow.version, kind: "PRODUCT", slug: otherRow.slug, status: "DRAFT", translations: otherRow.translations, details: otherRow.details }, { summary: true, productCover: { operation: "replace", path: current } }), /Cover tidak dimiliki/);
    const lifecycle = new FormData(); lifecycle.set("id", row.id); lifecycle.set("version", String(row.version)); lifecycle.set("operation", "archive");
    assert.equal((await productLifecycleAction({ message: "" }, lifecycle)).success, true);
    globalThis.__phase2TestCookie = undefined; assert.equal((await response(current)).status, 404);
    globalThis.__phase2TestCookie = tokens.ADMIN; assert.equal((await response(current)).status, 200);
    row = await db.contentEntry.findUniqueOrThrow({ where: { id: row.id } }); lifecycle.set("version", String(row.version)); lifecycle.set("operation", "restore");
    assert.equal((await productLifecycleAction({ message: "" }, lifecycle)).success, true);
    row = await db.contentEntry.findUniqueOrThrow({ where: { id: row.id } }); assert.equal(row.status, "DRAFT"); assert.equal(row.details.image, current);
    assert.equal((await saveProductAction({ message: "" }, form(row, "remove"))).success, true);
    assert.equal((await response(current)).status, 404); assert.equal((await readdir(`${directory}/${row.id}`)).length, 2);
    const audits = await db.auditEvent.findMany({ where: { recordId: row.id, action: "product.update" } }); assert.ok(audits.some(item => item.before.image && item.after.image === ""));
    assert.equal((await GET(new Request("http://localhost"), { params: Promise.resolve({ contentId: "1", assetId: "2" }) })).status, 404);
  } finally {
    globalThis.__phase2TestCookie = undefined; delete process.env.PRODUCT_UPLOAD_DIR;
    const owned = await db.contentEntry.findMany({ where: { authorId: { in: users } }, select: { id: true } });
    const records = [...new Set([...ids, ...owned.map(item => item.id)])];
    await db.auditEvent.deleteMany({ where: { recordId: { in: records } } }); await db.productRoute.deleteMany({ where: { contentId: { in: records } } });
    await db.contentEntry.deleteMany({ where: { id: { in: records } } }); await db.user.deleteMany({ where: { id: { in: users } } }); await db.$disconnect();
    assert.ok(directory.startsWith("/private/tmp/lunabiner-product-cover-integration-")); await rm(directory, { recursive: true });
  }
});
