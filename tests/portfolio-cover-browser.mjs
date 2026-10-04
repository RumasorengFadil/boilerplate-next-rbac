import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { createHash, randomBytes, randomUUID } from "node:crypto";
import { mkdtemp, readdir, rm } from "node:fs/promises";
import sharp from "sharp";
import { PrismaClient } from "@prisma/client";

const target = new URL(process.env.DATABASE_URL || "postgresql://invalid");
assert.equal(target.hostname, "127.0.0.1"); assert.equal(target.port, "55441"); assert.equal(target.username, "portfolio_test"); assert.equal(target.pathname, "/lunabiner_portfolio_test");
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE ?? "playwright");
const db = new PrismaClient(), ids = [], users = [], contexts = [], errors = [];
const storage = await mkdtemp("/private/tmp/lunabiner-cover-browser-storage-");
const screenshots = await mkdtemp("/private/tmp/lunabiner-cover-browser-qa-");
const origin = "http://127.0.0.1:3008";
let app, browser;
const largePng = await sharp(randomBytes(900 * 700 * 3), { raw: { width: 900, height: 700, channels: 3 } }).png().toBuffer();
assert.ok(largePng.length > 1024 * 1024 && largePng.length < 5 * 1024 * 1024);
const cleanPng = await sharp({ create: { width: 800, height: 450, channels: 3, background: "#08747a" } }).png().toBuffer();
async function poll(check) { for (let i = 0; i < 100; i++) { if (await check()) return; await new Promise(resolve => setTimeout(resolve, 150)); } throw new Error("Condition timed out."); }
async function context(role) {
  const token = randomUUID(), user = await db.user.create({ data: { name: "Cover browser", email: token + "@example.test", role, passwordHash: "synthetic" } }); users.push(user.id);
  await db.session.create({ data: { userId: user.id, tokenHash: createHash("sha256").update(token).digest("hex"), expiresAt: new Date(Date.now() + 600000) } });
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 1000 } }); contexts.push(ctx);
  await ctx.addCookies([{ name: "session", value: token, url: origin, httpOnly: true, sameSite: "Lax" }]);
  await ctx.addInitScript(() => localStorage.setItem("lunabiner-analytics-consent", "declined"));
  const page = await ctx.newPage(); page.on("pageerror", error => errors.push(error.message)); return page;
}
try {
  app = spawn(process.execPath, ["node_modules/next/dist/bin/next", "start", "--hostname", "127.0.0.1", "--port", "3008"], { env: { ...process.env, PORTFOLIO_UPLOAD_DIR: storage, AI_ASSISTANT_ENABLED: "false" }, stdio: "ignore" });
  await poll(async () => { try { return (await fetch(origin + "/id/about")).status === 200; } catch { return false; } });
  browser = await chromium.launch({ headless: true, ...(process.env.PLAYWRIGHT_EXECUTABLE ? { executablePath: process.env.PLAYWRIGHT_EXECUTABLE } : {}) });
  const admin = await context("ADMIN"); await admin.goto(origin + "/dashboard/portfolio/new");
  await admin.getByRole("textbox", { name: "Konten detail (ID)", exact: true }).waitFor();
  assert.equal(await admin.locator('[name="image"]').count(), 0); assert.equal(await admin.locator('[name="coverFile"]').getAttribute("type"), "file");
  assert.deepEqual(await admin.locator('[name="status"] option').allTextContents(), ["DRAFT", "REVIEW", "SCHEDULED", "PUBLISHED"]);
  const slug = "cover-browser-" + randomUUID();
  await admin.locator('[name="slug"]').fill(slug);
  for (const locale of ["id", "en"]) await admin.locator(`[name="${locale}.title"]`).fill("Cover workflow illustration");
  await admin.locator('[name="status"]').selectOption("PUBLISHED");
  await admin.getByRole("button", { name: "Simpan portfolio", exact: true }).click();
  await admin.getByRole("status").filter({ hasText: "Portfolio belum tersimpan" }).waitFor();
  for (const locale of ["id", "en"]) {
    const language = locale === "id" ? "Bahasa Indonesia" : "Bahasa Inggris";
    assert.equal(await admin.locator(`[name="${locale}.excerpt"]`).getAttribute("aria-invalid"), "true");
    assert.equal(await admin.getByRole("textbox", { name: `Konten detail (${locale.toUpperCase()})`, exact: true }).getAttribute("aria-describedby"), `error-${locale}.richBody`);
    assert.equal(await admin.locator(`[id="error-${locale}.excerpt"]`).textContent(), `Ringkasan ${language} minimal 10 karakter untuk publikasi.`);
    assert.equal(await admin.locator(`[id="error-${locale}.richBody"]`).textContent(), `Konten detail ${language} minimal 30 karakter teks untuk publikasi.`);
    assert.equal(await admin.locator(`[name="${locale}.title"]`).inputValue(), "Cover workflow illustration");
  }
  assert.doesNotMatch(await admin.getByRole("status").filter({ hasText: "Portfolio belum tersimpan" }).textContent(), /translations\./);
  await admin.locator("section").filter({ has: admin.locator('[name="id.excerpt"]') }).last().screenshot({ path: screenshots + "/publication-field-errors.png" });
  assert.equal(await db.contentEntry.count({ where: { kind: "CASE_STUDY", slug } }), 0);
  await admin.locator('[name="status"]').selectOption("DRAFT");
  for (const locale of ["id", "en"]) {
    await admin.locator(`[name="${locale}.title"]`).fill("Cover workflow illustration");
    await admin.locator(`[name="${locale}.excerpt"]`).fill("An illustrative business workflow with an uploaded cover.");
    await admin.getByRole("textbox", { name: `Konten detail (${locale.toUpperCase()})`, exact: true }).fill("This illustrated workflow is synthetic content for isolated cover upload QA.");
  }
  const picker = admin.locator('[name="coverFile"]');
  await picker.setInputFiles({ name: "evil.svg", mimeType: "image/svg+xml", buffer: Buffer.from("<svg/>") });
  await admin.getByRole("alert").filter({ hasText: "Gunakan JPG" }).waitFor(); assert.equal(await admin.locator('[name="coverOperation"]').inputValue(), "keep");
  await picker.setInputFiles({ name: "fake.png", mimeType: "image/png", buffer: Buffer.from("not an actual png") });
  await admin.getByRole("button", { name: "Simpan portfolio", exact: true }).click();
  await admin.getByRole("status").filter({ hasText: "Gambar tidak valid" }).waitFor();
  assert.equal(await admin.locator('[name="id.title"]').inputValue(), "Cover workflow illustration", "Failed upload must preserve text fields.");
  assert.equal(await admin.locator('[name="coverOperation"]').inputValue(), "replace");
  await picker.setInputFiles({ name: "from-device.png", mimeType: "image/png", buffer: largePng });
  await admin.getByRole("img", { name: "Preview cover portfolio" }).waitFor();
  await admin.getByRole("button", { name: "Simpan portfolio", exact: true }).click();
  let row;
  await poll(async () => { row = await db.contentEntry.findUnique({ where: { kind_slug: { kind: "CASE_STUDY", slug } } }); return Boolean(row); }); ids.push(row.id);
  await admin.waitForURL(`**/dashboard/portfolio/${row.id}`); await admin.reload();
  assert.equal(await admin.locator('[aria-invalid="true"]').count(), 0);
  const original = row.details.image;
  assert.match(original, new RegExp("^/media/portfolio/" + row.id + "/[a-f0-9-]{36}$"));
  assert.equal((await fetch(origin + original, { redirect: "manual" })).status, 404);
  assert.equal((await admin.request.get(origin + original)).status(), 200);
  const optimizer = await fetch(origin + "/_next/image?url=" + encodeURIComponent(original) + "&w=640&q=75"); assert.equal(optimizer.status, 400);
  await admin.getByRole("button", { name: "Hapus cover", exact: true }).click();
  assert.equal(await admin.locator('[name="coverOperation"]').inputValue(), "remove");
  await admin.getByRole("button", { name: "Batal ganti/hapus", exact: true }).click();
  await admin.getByRole("button", { name: "Simpan portfolio", exact: true }).click();
  await poll(async () => (await db.contentEntry.findUnique({ where: { id: row.id } })).version > row.version);
  row = await db.contentEntry.findUniqueOrThrow({ where: { id: row.id } }); assert.equal(row.details.image, original); await admin.reload();
  await picker.setInputFiles({ name: "replacement.png", mimeType: "image/png", buffer: cleanPng });
  await admin.getByRole("button", { name: "Simpan portfolio", exact: true }).click();
  await poll(async () => (await db.contentEntry.findUnique({ where: { id: row.id } })).details.image !== original);
  row = await db.contentEntry.findUniqueOrThrow({ where: { id: row.id } }); const current = row.details.image;
  await admin.reload(); assert.equal((await admin.request.get(origin + original)).status(), 404);
  for (const status of ["PUBLISHED"]) {
    await admin.getByRole("textbox", { name: "Konten detail (ID)", exact: true }).waitFor();
    await admin.locator('[name="status"]').selectOption(status); await admin.getByRole("button", { name: "Simpan portfolio", exact: true }).click();
    try { await poll(async () => (await db.contentEntry.findUnique({ where: { id: row.id } })).status === status); }
    catch { throw new Error(`Workflow ${status} failed: ${await admin.getByRole("status").allTextContents()}`); }
    await admin.reload();
  }
  const publicPage = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  await publicPage.context().addInitScript(() => localStorage.setItem("lunabiner-analytics-consent", "declined"));
  for (const route of ["/id/work", "/en/work", "/id", `/id/work/${slug}`]) {
    await publicPage.goto(origin + route); const img = publicPage.locator(`img[src="${current}"]`); await img.waitFor(); await img.scrollIntoViewIfNeeded();
    await poll(async () => img.evaluate(element => element.complete && element.naturalWidth > 0));
    assert.equal(await publicPage.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), true);
  }
  const publicImage = await fetch(origin + current); assert.equal(publicImage.status, 200); assert.equal(publicImage.headers.get("cache-control"), "private, no-store");
  await publicPage.goto(origin + "/id/work"); await publicPage.screenshot({ path: screenshots + "/desktop-work.png", fullPage: true });
  await publicPage.setViewportSize({ width: 390, height: 844 }); await publicPage.screenshot({ path: screenshots + "/mobile-work.png" });
  assert.equal(await publicPage.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), true);
  await admin.locator('[name="coverFile"]').scrollIntoViewIfNeeded(); await admin.screenshot({ path: screenshots + "/desktop-editor.png" });
  await admin.setViewportSize({ width: 390, height: 844 }); assert.equal(await admin.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), true);
  await admin.locator('[name="coverFile"]').scrollIntoViewIfNeeded(); await admin.screenshot({ path: screenshots + "/mobile-editor.png" });
  const editor = await context("CONTENT_EDITOR"); await editor.goto(`${origin}/dashboard/portfolio/${row.id}`); assert.equal(await editor.locator('[name="coverFile"]').isDisabled(), true);
  await admin.getByRole("button", { name: "Hapus cover", exact: true }).click(); await admin.getByRole("button", { name: "Simpan portfolio", exact: true }).click();
  await poll(async () => (await db.contentEntry.findUnique({ where: { id: row.id } })).details.image === "");
  assert.equal((await fetch(origin + current)).status, 404); assert.equal((await readdir(storage + "/" + row.id)).length, 2);
  for (const status of ["DRAFT", "SCHEDULED", "PUBLISHED"]) {
    await admin.reload(); await admin.getByRole("textbox", { name: "Konten detail (ID)", exact: true }).waitFor();
    await admin.locator('[name="status"]').selectOption(status);
    if (status === "SCHEDULED") await admin.locator('[name="publishedAt"]').fill(new Date(Date.now() + 600000).toISOString().slice(0, 16));
    await admin.getByRole("button", { name: "Simpan portfolio", exact: true }).click();
    await poll(async () => (await db.contentEntry.findUnique({ where: { id: row.id } })).status === status);
    assert.equal((await fetch(`${origin}/id/work/${slug}`, { headers: { "User-Agent": "Twitterbot" } })).status, status === "PUBLISHED" ? 200 : 404);
    assert.equal((await (await fetch(origin + "/sitemap.xml")).text()).includes("/work/" + slug), status === "PUBLISHED");
  }
  await admin.reload();
  await admin.getByRole("button", { name: "Arsipkan", exact: true }).click();
  await admin.getByRole("button", { name: "Ya, arsipkan", exact: true }).click();
  await poll(async () => Boolean((await db.contentEntry.findUnique({ where: { id: row.id } })).deletedAt));
  await admin.goto(origin + "/dashboard/portfolio");
  assert.equal(await admin.getByRole("link", { name: "Cover workflow illustration", exact: true }).count(), 0);
  await admin.goto(origin + "/dashboard/portfolio?view=archived");
  await admin.getByRole("link", { name: "Cover workflow illustration", exact: true }).waitFor();
  await admin.getByRole("button", { name: "Pulihkan", exact: true }).click();
  await admin.getByRole("button", { name: "Ya, pulihkan", exact: true }).click();
  await poll(async () => (await db.contentEntry.findUnique({ where: { id: row.id } })).deletedAt === null);
  assert.equal((await db.contentEntry.findUniqueOrThrow({ where: { id: row.id } })).status, "DRAFT");
  await admin.goto(origin + "/dashboard/portfolio");
  await admin.getByRole("link", { name: "Cover workflow illustration", exact: true }).waitFor();
  assert.equal((await fetch(`${origin}/id/work/${slug}`, { headers: { "User-Agent": "Twitterbot" } })).status, 404);
  assert.deepEqual(errors, []); await publicPage.close();
  console.log("PASS: direct portfolio publish/schedule/withdrawal and sitemap; no ARCHIVED option, existing active/archive/restore DRAFT lifecycle; friendly publication feedback, accessible inline errors, retained text; multipart >1MB upload, preview/keep/cancel/replace/remove, UUID ownership/private media, optimizer deny, thumbnails/detail, permissions and desktop/mobile.");
  console.log("Cover visual QA artifacts: " + screenshots);
} finally {
  for (const ctx of contexts) await ctx.close(); await browser?.close();
  if (app && app.exitCode === null) await new Promise(resolve => { app.once("exit", resolve); app.kill("SIGTERM"); });
  await db.auditEvent.deleteMany({ where: { recordId: { in: ids } } }); await db.portfolioRoute.deleteMany({ where: { contentId: { in: ids } } }); await db.contentEntry.deleteMany({ where: { id: { in: ids } } });
  await db.user.deleteMany({ where: { id: { in: users } } }); await db.$disconnect();
  assert.ok(storage.startsWith("/private/tmp/lunabiner-cover-browser-storage-")); await rm(storage, { recursive: true });
}
