import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { createHash, randomUUID } from "node:crypto";
import { open, stat } from "node:fs/promises";
import { PrismaClient } from "@prisma/client";

// No fallback to .env: fixture writes and SQL observation require the disposable target.
const target = new URL(process.env.DATABASE_URL || "postgresql://invalid");
assert.equal(target.hostname, "127.0.0.1"); assert.equal(target.port, "55441");
assert.equal(target.username, "portfolio_test"); assert.equal(target.pathname, "/lunabiner_portfolio_test");
const queryLog = process.env.PRODUCTS_QUERY_LOG;
assert.match(queryLog || "", /^\/private\/tmp\/lunabiner-portfolio-db\.[A-Za-z0-9]+\/server\.log$/);
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || "playwright");
const db = new PrismaClient(), ids = [], users = [], errors = [];
const origin = "http://127.0.0.1:3012", agents = ["Mozilla/5.0", "Googlebot", "Twitterbot"];
let app, browser, context;
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
async function poll(check) { for (let i = 0; i < 100; i++) { if (await check()) return; await sleep(100); } throw new Error("Condition timed out"); }
const get = (path, agent = agents[0]) => fetch(origin + path, { redirect: "manual", headers: { "User-Agent": agent }, signal: AbortSignal.timeout(15000) });
async function html(path) { const response = await get(path); assert.equal(response.status, 200); return response.text(); }
async function measured(path) {
  const offset = (await stat(queryLog)).size;
  await html(path); await sleep(30);
  const length = (await stat(queryLog)).size - offset, file = await open(queryLog, "r");
  let text;
  try { const buffer = Buffer.alloc(length); await file.read(buffer, 0, length, offset); text = buffer.toString(); }
  finally { await file.close(); }
  // Extended protocol logs parse/bind/execute separately; count execution only.
  // Exclude admin refresh/poll reads: only public eligibility/payload predicates count.
  const queries = text.split("\n").filter(line => /execute [^:]+: SELECT .*FROM "public"\."ContentEntry"/.test(line)
    && line.includes('"deletedAt" IS NULL') && line.includes('"publishedAt" <='));
  return { payload: queries.filter(line => line.includes('"translations"')).length,
    guards: queries.filter(line => !line.includes('"translations"')).length };
}
async function create(slug, label) {
  const translation = { title: label, excerpt: label + " illustrative business product." };
  const row = await db.contentEntry.create({ data: { kind: "PRODUCT", slug, status: "PUBLISHED", publishedAt: new Date("2026-01-01"),
    translations: { id: translation, en: translation }, details: { productStatus: "COMING_SOON", productFeatures: { id: ["Fitur contoh"], en: ["Example feature"] } } } });
  ids.push(row.id); return row;
}
try {
  assert.equal(await db.contentEntry.count(), 0, "Disposable DB must be empty before fixtures.");
  const logging = await db.$queryRawUnsafe("SHOW log_min_duration_statement");
  assert.equal(logging[0].log_min_duration_statement, "0", "Start disposable PostgreSQL with query duration logging enabled.");
  const parameters = await db.$queryRawUnsafe("SHOW log_parameter_max_length");
  assert.equal(parameters[0].log_parameter_max_length, "0", "Do not log SQL parameter values for this observer.");
  app = spawn(process.execPath, ["node_modules/next/dist/bin/next", "start", "--hostname", "127.0.0.1", "--port", "3012"], {
    env: { ...process.env, AI_ASSISTANT_ENABLED: "false" }, stdio: ["ignore", "ignore", "pipe"],
  });
  let serverErrors = ""; app.stderr.on("data", chunk => { serverErrors += chunk; });
  await poll(async () => { try { return (await get("/id/about")).status === 200; } catch { return false; } });
  const primary = await create("cache-prod-" + randomUUID(), "Primary cache illustration");
  const canary = await create("canary-prod-" + randomUUID(), "Unchanged cache canary");
  const canaryPath = "/id/products/" + canary.slug;
  const cold = await measured(canaryPath), warm = await measured(canaryPath);
  assert.equal(cold.payload, 1); assert.equal(warm.payload, 0); assert.ok(cold.guards >= 1 && warm.guards >= 1);
  const listCold = await measured("/id/products"), listWarm = await measured("/id/products");
  assert.equal(listCold.payload, 1); assert.equal(listWarm.payload, 0); assert.ok(listWarm.guards >= 1);
  console.log("PASS cache SQL proof: detail/list cold=1 payload query, warm=0; eligibility queries remain live.");

  // Lock only a disposable table in a bounded transaction. The shell must arrive before unlock.
  let release, locked; const gate = new Promise(resolve => { release = resolve; });
  const ready = new Promise(resolve => { locked = resolve; });
  const transaction = db.$transaction(async tx => { await tx.$executeRawUnsafe('LOCK TABLE "ContentEntry" IN ACCESS EXCLUSIVE MODE'); locked(); await gate; }, { timeout: 15000 });
  try {
    await ready;
    const response = await fetch(origin + "/id/products", { headers: { "User-Agent": agents[0] }, signal: AbortSignal.timeout(7000) });
    const reader = response.body.getReader(); let output = "";
    while (!output.includes("Memuat produk")) {
      const chunk = await reader.read(); assert.equal(chunk.done, false, "Shell must stream while DB is locked");
      output += new TextDecoder().decode(chunk.value);
    }
    assert.match(output, /Produk untuk kebutuhan/); assert.ok(!output.includes(primary.translations.id.title));
    release(); await transaction;
    for (;;) { const chunk = await reader.read(); if (chunk.done) break; output += new TextDecoder().decode(chunk.value); }
    assert.ok(output.includes(primary.translations.id.title)); assert.match(output, /application\/ld\+json/);
    console.log("PASS production HTTP streaming: intro/loading received while product query locked; cards/schema after unlock.");
  } finally { release(); await transaction; }

  browser = await chromium.launch({ headless: true, ...(process.env.PLAYWRIGHT_EXECUTABLE ? { executablePath: process.env.PLAYWRIGHT_EXECUTABLE } : {}) });
  const token = randomUUID(), user = await db.user.create({ data: { name: "Cache regression admin", email: token + "@example.test", role: "ADMIN", passwordHash: "synthetic" } });
  users.push(user.id); await db.session.create({ data: { userId: user.id, tokenHash: createHash("sha256").update(token).digest("hex"), expiresAt: new Date(Date.now() + 600000) } });
  context = await browser.newContext(); await context.addCookies([{ name: "session", value: token, url: origin, httpOnly: true, sameSite: "Lax" }]);
  await context.addInitScript(() => localStorage.setItem("lunabiner-analytics-consent", "declined"));
  const admin = await context.newPage(); admin.on("pageerror", error => errors.push(error.message));
  await admin.goto(origin + "/dashboard/products/" + primary.id);
  await admin.locator('[name="id.excerpt"]').waitFor();
  let currentSlug = primary.slug;
  async function save(status, title, slug = currentSlug, schedule) {
    const previous = await db.contentEntry.findUniqueOrThrow({ where: { id: primary.id } });
    await admin.reload(); await admin.locator('[name="id.excerpt"]').waitFor();
    for (const locale of ["id", "en"]) if (title) {
      await admin.locator(`[name="${locale}.title"]`).fill(title + " " + locale.toUpperCase());
      await admin.locator(`[name="${locale}.excerpt"]`).fill(title + " localized illustrative workflow excerpt.");
    }
    await admin.locator('[name="slug"]').fill(slug); await admin.locator('[name="status"]').selectOption(status);
    if (schedule) await admin.locator('[name="publishedAt"]').fill(schedule);
    const actionResponse = admin.waitForResponse(response => response.request().method() === "POST" && response.url().includes("/dashboard/products/"));
    await admin.getByRole("button", { name: "Simpan produk", exact: true }).click();
    await poll(async () => (await db.contentEntry.findUniqueOrThrow({ where: { id: primary.id } })).version > previous.version);
    const response = await actionResponse;
    assert.equal(response.status(), 200); currentSlug = slug;
  }
  await save("PUBLISHED", "Fresh cache revision", primary.slug + "-updated");
  // Canary's UUID/version/date are unchanged: a miss proves actual tag expiry, not revision-key turnover.
  const refreshed = await measured(canaryPath), refreshedWarm = await measured(canaryPath);
  assert.equal(refreshed.payload, 1); assert.equal(refreshedWarm.payload, 0);
  console.log("PASS production Server Action updateTag: unchanged canary payload refetched once, next request cache hit.");
  for (const locale of ["id", "en"]) {
    const detail = await html(`/${locale}/products/${currentSlug}`);
    assert.ok(detail.includes("Fresh cache revision " + locale.toUpperCase())); assert.ok(!detail.includes("Primary cache illustration"));
    assert.ok(detail.includes(`lang="${locale}"`)); assert.match(detail, /property="og:title"/); assert.match(detail, /name="twitter:card"/);
    assert.ok(detail.includes(`/products/${currentSlug}`)); assert.match(detail, /CreativeWork/);
    assert.ok((await html(`/${locale}/products`)).includes(`/products/${currentSlug}`));
    for (const agent of agents) assert.equal((await get(`/${locale}/products/${primary.slug}`, agent)).status, 308);
  }
  async function hidden() {
    assert.equal((await context.request.get(origin + "/id/products/" + currentSlug)).status(), 404, "Admin cookies must not make a public route expose drafts");
    for (const locale of ["id", "en"]) {
      for (const agent of agents) for (const route of [currentSlug, primary.slug, primary.id]) {
        const response = await get(`/${locale}/products/${route}`, agent); assert.equal(response.status, 404); assert.equal(response.headers.get("location"), null);
        assert.ok(!(await response.text()).includes("Fresh cache revision"));
      }
      assert.equal((await get(`/${locale}/products/${currentSlug}/opengraph-image/main`)).status, 404);
      assert.ok(!(await html(`/${locale}/products`)).includes("Fresh cache revision"));
    }
    assert.ok(!(await html("/sitemap.xml")).includes(currentSlug));
  }
  await save("DRAFT"); await hidden(); console.log("PASS warm-cache draft withdrawal.");
  // Legacy REVIEW remains private although it is no longer an editor option.
  await db.contentEntry.update({ where: { id: primary.id }, data: { status: "REVIEW", version: { increment: 1 } } }); await hidden();
  // Real clock transition, no SQL status change; leave >=20s for future-status assertions.
  const dueAt = Math.ceil((Date.now() + 20000) / 60000) * 60000;
  await save("SCHEDULED", undefined, currentSlug, new Date(dueAt).toISOString().slice(0, 16)); await hidden();
  console.log("PASS future schedule privacy; waiting for actual due time.");
  while (Date.now() <= dueAt + 100) await sleep(Math.min(1000, dueAt + 101 - Date.now()));
  assert.equal((await get("/id/products/" + currentSlug)).status, 200);
  assert.ok((await html("/en/products")).includes(currentSlug)); assert.ok((await html("/sitemap.xml")).includes(currentSlug));
  assert.equal((await db.contentEntry.findUniqueOrThrow({ where: { id: primary.id } })).status, "SCHEDULED");
  console.log("PASS real-clock scheduled publication without status job or TTL delay.");
  await save("PUBLISHED"); await html("/id/products/" + currentSlug);
  await admin.reload(); await admin.getByRole("button", { name: "Arsipkan", exact: true }).click();
  await admin.getByRole("button", { name: "Ya, arsipkan", exact: true }).click();
  await poll(async () => Boolean((await db.contentEntry.findUniqueOrThrow({ where: { id: primary.id } })).deletedAt));
  await admin.waitForLoadState("networkidle");
  assert.equal((await measured(canaryPath)).payload, 1, "Archive must expire unchanged product payloads");
  assert.equal((await measured(canaryPath)).payload, 0);
  await hidden();
  await admin.goto(origin + "/dashboard/products?view=archived");
  await admin.getByRole("button", { name: "Pulihkan", exact: true }).click(); await admin.getByRole("button", { name: "Ya, pulihkan", exact: true }).click();
  await poll(async () => (await db.contentEntry.findUniqueOrThrow({ where: { id: primary.id } })).deletedAt === null);
  await admin.waitForLoadState("networkidle");
  assert.equal((await measured(canaryPath)).payload, 1, "Restore must expire unchanged product payloads");
  assert.equal((await measured(canaryPath)).payload, 0);
  await hidden();
  assert.equal((await db.contentEntry.findUniqueOrThrow({ where: { id: primary.id } })).status, "DRAFT");
  assert.deepEqual(errors, []); assert.ok(!/Failed to (?:set|revalidate)|Error:|PrismaClient/i.test(serverErrors), "Production server must not report cache/runtime failures");
  console.log("PASS warm-cache privacy/lifecycle: ID/EN edit+slug, draft/review/future/due schedule, archive/restore, metadata/OG/schema/sitemap and bot/browser 404/308; no runtime page errors.");
} finally {
  await context?.close(); await browser?.close();
  if (app && app.exitCode === null) await new Promise(resolve => { app.once("exit", resolve); app.kill("SIGTERM"); });
  await db.auditEvent.deleteMany({ where: { recordId: { in: ids } } });
  await db.productRoute.deleteMany({ where: { contentId: { in: ids } } }); await db.contentEntry.deleteMany({ where: { id: { in: ids } } });
  await db.user.deleteMany({ where: { id: { in: users } } }); await db.$disconnect();
}
