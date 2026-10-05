import assert from "node:assert/strict";
import { mkdtemp } from "node:fs/promises";
import { createHash, randomUUID } from "node:crypto";
import { spawn } from "node:child_process";
import { PrismaClient } from "@prisma/client";
// The guarded migration tests exercise real apply/restore; browser covers editing
// already-cleaned summary storage and preventing legacy key resurrection.

const target = new URL(process.env.DATABASE_URL ?? "postgresql://invalid");
assert.equal(target.hostname, "127.0.0.1"); assert.equal(target.port, "55441");
assert.equal(target.username, "portfolio_test"); assert.equal(target.pathname, "/lunabiner_portfolio_test");
const origin = "http://127.0.0.1:3010";
const directory = await mkdtemp("/private/tmp/lunabiner-products-admin-qa-");
const db = new PrismaClient(), users = [], ids = [], contexts = [], errors = [];
const server = spawn(process.execPath, ["node_modules/next/dist/bin/next", "start", "-H", "127.0.0.1", "-p", "3010"], { env: { ...process.env, NODE_ENV: "production" }, stdio: "ignore" });
let browser;
async function poll(check) { for (let i = 0; i < 100; i++) { if (await check()) return; await new Promise(resolve => setTimeout(resolve, 150)); } throw new Error("Product browser condition timed out."); }
async function pageFor(role, width = 1440) {
  const token = randomUUID(); const user = await db.user.create({ data: { name: "Product browser QA", email: token + "@example.test", passwordHash: "synthetic-only", role } }); users.push(user.id);
  await db.session.create({ data: { userId: user.id, tokenHash: createHash("sha256").update(token).digest("hex"), expiresAt: new Date(Date.now() + 600000) } });
  const context = await browser.newContext({ viewport: { width, height: width === 390 ? 844 : 1000 } }); contexts.push(context);
  await context.addCookies([{ name: "session", value: token, url: origin, httpOnly: true, sameSite: "Lax" }]);
  const page = await context.newPage(); page.on("pageerror", error => errors.push(error.message)); return page;
}
try {
  assert.equal((await db.$queryRaw`SELECT current_database() AS name`)[0].name, "lunabiner_portfolio_test");
  await poll(async () => { try { return (await fetch(origin + "/login")).ok; } catch { return false; } });
  const { chromium } = await import(process.env.PLAYWRIGHT_MODULE ?? "playwright");
  browser = await chromium.launch({ headless: true, ...(process.env.PLAYWRIGHT_EXECUTABLE ? { executablePath: process.env.PLAYWRIGHT_EXECUTABLE } : {}) });
  const guest = await browser.newPage(); await guest.goto(origin + "/dashboard/products"); assert.match(guest.url(), /\/login/); await guest.close();
  const admin = await pageFor("ADMIN"); await admin.goto(origin + "/dashboard/products/new");
  assert.equal(await admin.locator("[contenteditable=true]").count(), 0);
  assert.deepEqual(await admin.locator('[name="status"] option').evaluateAll(options => options.map(option => option.value)), ["DRAFT", "PUBLISHED", "SCHEDULED"]);
  assert.equal(await admin.locator('[type="file"], [name="image"]').count(), 0); // Task 4, not prematurely added.
  const slug = "browser-product-" + randomUUID(), title = "Product browser example";
  const description = "Platform komunikasi privat untuk organisasi yang membutuhkan kontrol, keamanan, dan fleksibilitas deployment.";
  for (const locale of ["id", "en"]) {
    await admin.locator(`[name="${locale}.title"]`).fill(title);
    await admin.locator(`[name="${locale}.excerpt"]`).fill(description);
    assert.equal(await admin.locator(`[name="${locale}.body"]`).count(), 0);
    assert.equal(await admin.locator(`[name="${locale}.excerpt"]`).getAttribute("maxlength"), "150");
    await admin.getByRole("button", { name: `Tambah fitur ${locale.toUpperCase()}`, exact: true }).click();
    await admin.locator(`[name="${locale}.feature"]`).fill(locale === "id" ? "Chat privat" : "Private chat");
  }
  await admin.locator('[name="slug"]').fill(slug);
  const body = admin.locator('[name="id.excerpt"]'); await body.fill("x".repeat(150)); await body.press("End"); await body.press("x"); assert.equal((await body.inputValue()).length, 150);
  await body.evaluate(element => element.removeAttribute("maxlength")); await body.fill("x".repeat(151));
  await admin.getByRole("button", { name: "Simpan produk", exact: true }).click();
  await admin.locator('[id="id.excerpt-error"]').waitFor(); assert.match(await admin.locator('[id="id.excerpt-error"]').innerText(), /maksimal 150/);
  assert.equal((await body.inputValue()).length, 151); assert.equal(await admin.locator('[name="slug"]').inputValue(), slug);
  assert.equal(await db.contentEntry.count({ where: { kind: "PRODUCT", slug } }), 0);
  await body.fill(description); await body.evaluate(element => element.setAttribute("maxlength", "150"));
  await admin.locator('[name="status"]').selectOption("PUBLISHED"); await admin.locator('[name="en.excerpt"]').fill("");
  await admin.getByRole("button", { name: "Simpan produk", exact: true }).click(); await admin.locator('[id="en.excerpt-error"]').waitFor();
  assert.match(await admin.locator('[id="en.excerpt-error"]').innerText(), /Bahasa Inggris minimal 10/); assert.equal(await body.inputValue(), description);
  await admin.locator('[name="en.excerpt"]').fill(description); await admin.getByRole("button", { name: "Simpan produk", exact: true }).click();
  let row; await poll(async () => { row = await db.contentEntry.findUnique({ where: { kind_slug: { kind: "PRODUCT", slug } } }); return Boolean(row); }); ids.push(row.id);
  await admin.waitForURL(`**/dashboard/products/${row.id}`); await admin.reload();
  assert.equal(row.status, "PUBLISHED"); assert.equal(row.details.productStatus, "COMING_SOON");
  assert.equal(row.translations.id.body, undefined); assert.equal(row.translations.id.richBody, undefined);
  assert.equal(row.details.features, undefined);
  assert.deepEqual(row.details.productFeatures, { id: ["Chat privat"], en: ["Private chat"] });
  const publicPage = await admin.context().newPage();
  await publicPage.goto(origin + "/id/products"); await publicPage.getByText("Chat privat", { exact: true }).waitFor();
  assert.equal(await publicPage.getByText("Private chat", { exact: true }).count(), 0);
  await publicPage.goto(origin + "/en/products"); await publicPage.getByText("Private chat", { exact: true }).waitFor(); await publicPage.close();
  await admin.getByRole("button", { name: "Hapus fitur ID 1", exact: true }).click();
  await admin.getByRole("button", { name: "Tambah fitur EN", exact: true }).click();
  const extra = admin.locator('[name="en.feature"]').nth(1); await extra.fill("x".repeat(100)); await extra.press("End"); await extra.press("x"); assert.equal((await extra.inputValue()).length, 100);
  await extra.evaluate(element => element.removeAttribute("maxlength")); await extra.fill("x".repeat(101));
  await admin.getByRole("button", { name: "Simpan produk", exact: true }).click(); await admin.locator('[id="en.features.1-error"]').waitFor();
  assert.equal(await admin.locator('[name="id.feature"]').count(), 0); assert.equal((await extra.inputValue()).length, 101);
  await admin.getByRole("button", { name: "Hapus fitur EN 2", exact: true }).click();
  assert.equal(await body.inputValue(), description);
  await admin.locator('[name="productStatus"]').selectOption("LIVE"); await admin.locator('[name="status"]').selectOption("SCHEDULED");
  await admin.locator('[name="publishedAt"]').fill("2030-01-01T09:30"); await admin.locator('[name="ctaType"]').selectOption("external");
  await admin.locator('[name="ctaUrl"]').fill("https://demo.example.test");
  await admin.getByRole("button", { name: "Simpan produk", exact: true }).click();
  await poll(async () => (await db.contentEntry.findUniqueOrThrow({ where: { id: row.id } })).status === "SCHEDULED"); await admin.reload();
  row = await db.contentEntry.findUniqueOrThrow({ where: { id: row.id } }); assert.equal(row.publishedAt.toISOString(), "2030-01-01T09:30:00.000Z"); assert.equal(row.details.productStatus, "LIVE"); assert.equal(row.details.productCta.url, "https://demo.example.test");
  assert.equal(row.details.features, undefined); assert.equal(row.translations.id.body, undefined); assert.equal(row.translations.id.richBody, undefined);
  await admin.screenshot({ path: directory + "/desktop-editor.png", fullPage: true });
  const editor = await pageFor("CONTENT_EDITOR", 390); await editor.goto(`${origin}/dashboard/products/${row.id}`);
  assert.equal(await editor.getByRole("button", { name: "Simpan produk", exact: true }).isDisabled(), true); assert.equal(await editor.getByRole("button", { name: "Arsipkan", exact: true }).count(), 0);
  const sales = await pageFor("SALES"); await sales.goto(origin + "/dashboard/products"); assert.match(sales.url(), /error=forbidden/); assert.equal(await sales.getByRole("link", { name: "Produk", exact: true }).count(), 0);
  const generic = await admin.context().newPage(); await generic.goto(origin + "/dashboard/content/new");
  assert.deepEqual(await generic.locator('[name="kind"] option').evaluateAll(options => options.map(option => option.value)), ["ARTICLE"]);
  await generic.goto(`${origin}/dashboard/content/${row.id}`); await generic.waitForURL(`**/dashboard/products/${row.id}`); await generic.close();
  const invalidPage = await admin.context().newPage(); assert.equal((await invalidPage.goto(origin + "/dashboard/products/1")).status(), 404); await invalidPage.close();
  await admin.getByRole("button", { name: "Arsipkan", exact: true }).click(); await admin.getByRole("button", { name: "Batal", exact: true }).click();
  assert.equal((await db.contentEntry.findUniqueOrThrow({ where: { id: row.id } })).deletedAt, null);
  await admin.getByRole("button", { name: "Arsipkan", exact: true }).click(); await admin.getByRole("button", { name: "Ya, arsipkan", exact: true }).click();
  await admin.waitForURL("**/dashboard/products?view=archived"); await admin.getByRole("link", { name: title, exact: true }).waitFor();
  await admin.getByRole("button", { name: "Pulihkan", exact: true }).click(); await admin.getByRole("button", { name: "Ya, pulihkan", exact: true }).click();
  await admin.waitForURL(`**/dashboard/products/${row.id}`); await admin.locator('[name="id.excerpt"]').waitFor();
  row = await db.contentEntry.findUniqueOrThrow({ where: { id: row.id } }); assert.equal(row.status, "DRAFT"); assert.equal(row.details.productStatus, "LIVE"); assert.equal(row.details.productCta.url, "https://demo.example.test");
  await editor.goto(`${origin}/dashboard/products/${row.id}`); assert.equal(await editor.getByRole("button", { name: "Simpan produk", exact: true }).isEnabled(), true);
  await editor.locator('[name="id.excerpt"]').waitFor(); assert.deepEqual(await editor.locator('[name="status"] option').evaluateAll(options => options.map(option => option.value)), ["DRAFT"]);
  await admin.setViewportSize({ width: 390, height: 844 }); assert.equal(await admin.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
  await admin.screenshot({ path: directory + "/mobile-editor.png", fullPage: true });
  await admin.goto(origin + "/dashboard/products"); assert.equal(await admin.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
  await admin.screenshot({ path: directory + "/mobile-list.png", fullPage: true });
  const rich = { type: "doc", content: [{ type: "heading", attrs: { level: 2 }, content: [{ type: "text", text: "a".repeat(180) }] }] };
  const translation = { title: "Legacy browser example", excerpt: "Legacy short excerpt", body: "a".repeat(180), richBody: rich };
  let legacy = await db.contentEntry.create({ data: { kind: "PRODUCT", slug: "browser-legacy-" + randomUUID(), translations: { id: translation, en: translation }, details: { productStatus: "BETA", image: "/images/lunabiner-logo.png", features: ["Legacy feature"] } } }); ids.push(legacy.id);
  await admin.goto(`${origin}/dashboard/products/${legacy.id}`); assert.equal(await admin.locator('[name="id.body"]').count(), 0); assert.equal(await admin.locator('[name="id.feature"]').inputValue(), "Legacy feature");
  await admin.locator('[name="category"]').fill("Metadata only"); await admin.getByRole("button", { name: "Simpan produk", exact: true }).click();
  await poll(async () => (await db.contentEntry.findUniqueOrThrow({ where: { id: legacy.id } })).version > legacy.version);
  legacy = await db.contentEntry.findUniqueOrThrow({ where: { id: legacy.id } }); assert.deepEqual(legacy.translations.id.richBody, rich); assert.deepEqual(legacy.details.features, ["Legacy feature"]);
  assert.deepEqual(errors, []);
  console.log("PASS: native/server 150-char limit, counters, retained failed form, direct publish/schedule UTC, readiness/CTA, RBAC, slug/UUID routes, archive/cancel/restore, generic redirect, legacy rich metadata save and mobile overflow.");
  console.log("Browser screenshots: " + directory);
} finally {
  for (const context of contexts) await context.close(); await browser?.close(); server.kill("SIGTERM");
  const owned = await db.contentEntry.findMany({ where: { authorId: { in: users } }, select: { id: true } });
  const records = [...new Set([...ids, ...owned.map(row => row.id)])];
  await db.auditEvent.deleteMany({ where: { recordId: { in: records } } }); await db.productRoute.deleteMany({ where: { contentId: { in: records } } });
  await db.contentEntry.deleteMany({ where: { id: { in: records } } }); await db.user.deleteMany({ where: { id: { in: users } } }); await db.$disconnect();
}
