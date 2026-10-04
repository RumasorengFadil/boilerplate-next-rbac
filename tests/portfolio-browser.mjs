import assert from "node:assert/strict";
import { mkdtemp } from "node:fs/promises";
import { createHash, randomUUID } from "node:crypto";
import { PrismaClient } from "@prisma/client";

if (!process.env.DATABASE_URL || new URL(process.env.DATABASE_URL).pathname !== "/lunabiner_portfolio_test") throw new Error("Use the dedicated lunabiner_portfolio_test database.");
const origin = process.env.PORTFOLIO_TEST_ORIGIN ?? "http://127.0.0.1:3008";
if (!/^http:\/\/(127\.0\.0\.1|localhost):\d+$/.test(origin)) throw new Error("Use a loopback test server.");
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE ?? "playwright");
const db = new PrismaClient();
const browser = await chromium.launch({ headless: true, ...(process.env.PLAYWRIGHT_EXECUTABLE ? { executablePath: process.env.PLAYWRIGHT_EXECUTABLE } : {}) });
const users = [], entries = [], contexts = [], consoleErrors = [];
const directory = await mkdtemp("/private/tmp/lunabiner-portfolio-admin-qa-");
async function poll(check) {
  for (let i = 0; i < 60; i++) { if (await check()) return; await new Promise(resolve => setTimeout(resolve, 200)); }
  throw new Error("Browser/DB condition timed out.");
}
async function contextFor(role, width = 1440) {
  const token = randomUUID();
  const user = await db.user.create({ data: { email: `${token}@example.test`, name: "Portfolio browser fixture", role, passwordHash: "synthetic-test-only" } }); users.push(user.id);
  await db.session.create({ data: { userId: user.id, tokenHash: createHash("sha256").update(token).digest("hex"), expiresAt: new Date(Date.now() + 600000) } });
  const context = await browser.newContext({ viewport: { width, height: 1000 } }); contexts.push(context);
  await context.addCookies([{ name: "session", value: token, url: origin, httpOnly: true, sameSite: "Lax" }]);
  const page = await context.newPage();
  page.on("pageerror", error => consoleErrors.push(error.message));
  return page;
}
try {
  const guest = await browser.newPage(); await guest.goto(origin + "/dashboard/portfolio"); assert.match(guest.url(), /\/login/); await guest.close();
  const admin = await contextFor("ADMIN"); await admin.goto(origin + "/dashboard/portfolio/new");
  await admin.getByRole("textbox", { name: "Konten detail (ID)", exact: true }).waitFor();
  assert.equal(await admin.getByText("Detail studi kasus", { exact: true }).count(), 0);
  assert.equal(await admin.locator('[name="client"], [name="industry.id"], [name="technology"], [name="verifiedProject"]').count(), 0);
  const generic = await admin.context().newPage(); await generic.goto(origin + "/dashboard/content/new");
  assert.equal(await generic.getByText("Detail produk dan relasi", { exact: true }).count(), 1); await generic.close();
  const slug = "browser-" + randomUUID(), title = "Portfolio browser illustration";
  for (const locale of ["id", "en"]) {
    await admin.locator(`[name="${locale}.title"]`).fill(title);
    await admin.locator(`[name="${locale}.excerpt"]`).fill("Illustrative workflow for isolated browser QA.");
    await admin.getByRole("textbox", { name: `Konten detail (${locale.toUpperCase()})`, exact: true }).fill("A complete business workflow illustration edited through Tiptap.");
  }
  await admin.locator('[name="slug"]').fill(slug);
  await admin.getByRole("group", { name: "Format Konten detail (ID)", exact: true }).getByRole("button", { name: "H2", exact: true }).click();
  await admin.getByRole("button", { name: "Simpan portfolio", exact: true }).click();
  let row;
  await poll(async () => { row = await db.contentEntry.findUnique({ where: { kind_slug: { kind: "CASE_STUDY", slug } } }); return Boolean(row); }); entries.push(row.id);
  await admin.waitForURL(`**/dashboard/portfolio/${row.id}`); await admin.reload();
  assert.equal(row.translations.id.richBody.content[0].type, "heading");
  assert.equal(row.translations.id.richBody.content[0].attrs.level, 2);
  await admin.getByRole("textbox", { name: "Konten detail (EN)", exact: true }).fill("Updated bilingual content is retained after save and reload through the admin editor.");
  await admin.getByRole("textbox", { name: "Konten detail (EN)", exact: true }).press(process.platform === "darwin" ? "Meta+A" : "Control+A");
  const englishToolbar = admin.getByRole("group", { name: "Format Konten detail (EN)", exact: true });
  await englishToolbar.getByRole("button", { name: "Nomor", exact: true }).click();
  await englishToolbar.getByRole("button", { name: "Tautan", exact: true }).click();
  await admin.getByLabel("URL tautan", { exact: true }).fill("javascript:alert(1)");
  await admin.getByRole("button", { name: "Terapkan tautan", exact: true }).click();
  await admin.getByRole("alert").filter({ hasText: "Gunakan tautan internal" }).waitFor();
  await admin.getByLabel("URL tautan", { exact: true }).fill("/en/contact");
  await admin.getByRole("button", { name: "Terapkan tautan", exact: true }).click();
  await admin.getByRole("button", { name: "Simpan portfolio", exact: true }).click();
  await poll(async () => (await db.contentEntry.findUnique({ where: { id: row.id } })).version > row.version);
  await admin.reload();
  assert.match(await admin.getByRole("textbox", { name: "Konten detail (EN)", exact: true }).innerText(), /Updated bilingual/);
  const updatedRow = await db.contentEntry.findUniqueOrThrow({ where: { id: row.id } });
  assert.equal(updatedRow.translations.en.richBody.content[0].type, "orderedList");
  assert.match(JSON.stringify(updatedRow.translations.en.richBody), /\/en\/contact/);
  for (const status of ["REVIEW", "PUBLISHED"]) {
    await admin.locator('[name="status"]').selectOption(status); await admin.getByRole("button", { name: "Simpan portfolio", exact: true }).click();
    await poll(async () => (await db.contentEntry.findUnique({ where: { id: row.id } })).status === status); await admin.reload();
  }
  await admin.getByRole("textbox", { name: "Konten detail (ID)", exact: true }).scrollIntoViewIfNeeded();
  await admin.screenshot({ path: directory + "/desktop-editor.png" });
  const editor = await contextFor("CONTENT_EDITOR", 390); await editor.goto(`${origin}/dashboard/portfolio/${row.id}`);
  assert.equal(await editor.getByRole("button", { name: "Simpan portfolio", exact: true }).isDisabled(), true);
  assert.equal(await editor.getByRole("button", { name: "Arsipkan", exact: true }).count(), 0);
  const sales = await contextFor("SALES"); await sales.goto(origin + "/dashboard/portfolio"); assert.match(sales.url(), /error=forbidden/);
  assert.equal(await sales.getByRole("link", { name: "Portfolio", exact: true }).count(), 0);
  await admin.getByRole("button", { name: "Arsipkan", exact: true }).click();
  await admin.getByRole("button", { name: "Ya, arsipkan", exact: true }).click();
  await poll(async () => Boolean((await db.contentEntry.findUnique({ where: { id: row.id } })).deletedAt));
  await admin.goto(origin + "/dashboard/portfolio?view=archived");
  await admin.getByRole("link", { name: title, exact: true }).waitFor();
  await admin.getByRole("button", { name: "Pulihkan", exact: true }).click(); await admin.getByRole("button", { name: "Ya, pulihkan", exact: true }).click();
  await poll(async () => (await db.contentEntry.findUnique({ where: { id: row.id } })).status === "DRAFT");
  await admin.goto(`${origin}/dashboard/content/${row.id}`); await admin.waitForURL(`**/dashboard/portfolio/${row.id}`);
  await admin.setViewportSize({ width: 390, height: 844 });
  await admin.getByRole("textbox", { name: "Konten detail (ID)", exact: true }).waitFor();
  assert.equal(await admin.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), true);
  await admin.screenshot({ path: directory + "/mobile-editor.png", fullPage: true });
  await admin.getByRole("textbox", { name: "Konten detail (ID)", exact: true }).scrollIntoViewIfNeeded();
  await admin.screenshot({ path: directory + "/mobile-toolbar.png" });
  await admin.goto(origin + "/dashboard/portfolio"); assert.equal(await admin.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), true);
  await admin.screenshot({ path: directory + "/mobile-list.png" });
  assert.deepEqual(consoleErrors, []);
  console.log("PASS: create/edit/reload, rich heading/list/link, unsafe link rejection, REVIEW/PUBLISHED, archive/restore DRAFT, legacy admin redirect, RBAC and mobile overflow.");
  console.log("Browser screenshots: " + directory);
} finally {
  for (const context of contexts) await context.close(); await browser.close();
  const owned = await db.contentEntry.findMany({ where: { authorId: { in: users } }, select: { id: true } });
  const ids = [...new Set([...entries, ...owned.map(entry => entry.id)])];
  await db.auditEvent.deleteMany({ where: { recordId: { in: ids } } }); await db.portfolioRoute.deleteMany({ where: { contentId: { in: ids } } });
  await db.contentEntry.deleteMany({ where: { id: { in: ids } } }); await db.user.deleteMany({ where: { id: { in: users } } }); await db.$disconnect();
}
