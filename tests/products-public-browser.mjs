import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { randomUUID, createHash } from "node:crypto";
import { mkdtemp, mkdir, writeFile, rm } from "node:fs/promises";
import sharp from "sharp";
import { PrismaClient } from "@prisma/client";
const target = new URL(process.env.DATABASE_URL ?? "postgresql://invalid");
assert.equal(target.hostname, "127.0.0.1"); assert.equal(target.port, "55441");
assert.equal(target.username, "portfolio_test"); assert.equal(target.pathname, "/lunabiner_portfolio_test");
const origin = "http://127.0.0.1:3011", db = new PrismaClient(), ids = [], errors = [];
const storage = await mkdtemp("/private/tmp/lunabiner-products-public-uploads-");
const screenshots = await mkdtemp("/private/tmp/lunabiner-products-public-qa-");
const server = spawn(process.execPath, ["node_modules/next/dist/bin/next", "start", "-H", "127.0.0.1", "-p", "3011"], { env: { ...process.env, PRODUCT_UPLOAD_DIR: storage, AI_ASSISTANT_ENABLED: "false" }, stdio: "ignore" });
let browser;
async function poll(check) { for (let i = 0; i < 100; i++) { if (await check()) return; await new Promise(resolve => setTimeout(resolve, 150)); } throw new Error("Product public QA condition timed out"); }
async function request(path, agent = "Twitterbot") { return fetch(origin + path, { redirect: "manual", headers: { "user-agent": agent } }); }
async function screenshot(page, name) {
  const images = page.locator('img[src^="/media/products/"]');
  for (let index = 0; index < await images.count(); index++) {
    const image = images.nth(index); await image.scrollIntoViewIfNeeded();
    await poll(() => image.evaluate(img => img.complete && img.naturalWidth > 0));
  }
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({ path: screenshots + "/" + name + ".png", fullPage: true });
}
try {
  assert.equal((await db.contentEntry.count()), 0);
  await poll(async () => { try { return (await request("/id/products")).ok; } catch { return false; } });
  const empty = await (await request("/id/products")).text(); assert.match(empty, /Belum ada produk/); assert.doesNotMatch(empty, /Enterprise Chat|AI Cashflow/);
  const rows = [];
  for (const [index, readiness] of ["COMING_SOON", "BETA", "LIVE"].entries()) {
    const row = await db.contentEntry.create({ data: { kind: "PRODUCT", slug: "public-browser-" + randomUUID(), status: "PUBLISHED", publishedAt: new Date(Date.now() - 10000),
      translations: { id: { title: `Produk bisnis ${index}`, excerpt: "Ringkasan singkat produk untuk kebutuhan bisnis.", seoTitle: `Produk ${index} SEO ID`, seoDescription: `Deskripsi SEO Indonesia khusus produk bisnis ${index}.` },
        en: { title: `Business product ${index}`, excerpt: "A short product summary for business needs.", seoTitle: `Product ${index} SEO EN`, seoDescription: `English SEO description for business product ${index}.` } },
      details: { productStatus: readiness, productFeatures: { id: ["Fitur bisnis privat"], en: ["Private business feature"] }, productCta: index === 1 ? { type: "external", url: "https://demo.example.test" } : { type: "internal", path: "/consultation" }, ctaLabel: { id: "Diskusikan produk", en: "Discuss product" } } } });
    ids.push(row.id); rows.push(row);
  }
  let row = rows[0]; const assetId = randomUUID(), cover = `/media/products/${row.id}/${assetId}`;
  await mkdir(`${storage}/${row.id}`, { mode: 0o700 });
  await writeFile(`${storage}/${row.id}/${assetId}.webp`, await sharp({ create: { width: 800, height: 450, channels: 3, background: "#08747A" } }).webp().toBuffer(), { mode: 0o600, flag: "wx" });
  row = await db.contentEntry.update({ where: { id: row.id }, data: { details: { ...row.details, image: cover } } }); rows[0] = row;
  const { chromium } = await import(process.env.PLAYWRIGHT_MODULE ?? "playwright");
  browser = await chromium.launch({ headless: true, ...(process.env.PLAYWRIGHT_EXECUTABLE ? { executablePath: process.env.PLAYWRIGHT_EXECUTABLE } : {}) });
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  await context.addInitScript(() => localStorage.setItem("lunabiner-analytics-consent", "declined"));
  const page = await context.newPage(); page.on("pageerror", error => errors.push(error.message));
  const externalRequests = []; page.on("request", req => { if (req.url().startsWith("https://demo.example.test")) externalRequests.push(req.url()); });
  const hashes = [];
  for (const locale of ["id", "en"]) {
    const list = await request(`/${locale}/products`); assert.equal(list.status, 200);
    const listHtml = await list.text(); assert.match(listHtml, new RegExp(`/${locale}/products/${row.slug}`));
    const scripts = [...listHtml.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)].map(match => JSON.parse(match[1]));
    const listSchema = scripts.flatMap(script => script["@graph"] ?? []).find(node => node["@type"] === "ItemList"); assert.equal(listSchema.numberOfItems, 3);
    for (const entry of rows) {
      const path = `/${locale}/products/${entry.slug}`, response = await request(path); assert.equal(response.status, 200);
      const html = await response.text(); assert.match(html, new RegExp(entry.translations[locale].seoTitle));
      assert.match(html, new RegExp(entry.translations[locale].seoDescription));
      assert.match(html, new RegExp(`rel="canonical" href="[^"]+${path}"`));
      assert.match(html, /property="og:type" content="website"/); assert.match(html, /name="twitter:card" content="summary_large_image"/);
      assert.match(html, new RegExp(`${path}/opengraph-image/main`));
      assert.equal((html.match(/rel="canonical"/g) ?? []).length, 1);
      const graphs = [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)].map(match => JSON.parse(match[1]));
      const entity = graphs.flatMap(script => script["@graph"] ?? []).find(node => node["@type"] === "CreativeWork");
      assert.equal(entity.creativeWorkStatus, ({ COMING_SOON: "Concept", BETA: "Beta", LIVE: "Released" })[entry.details.productStatus]);
      assert.equal(entity.offers, undefined); assert.equal(entity.aggregateRating, undefined);
      const image = await request(path + "/opengraph-image/main"); assert.equal(image.status, 200); assert.equal(image.headers.get("cache-control"), "no-store");
      const bytes = Buffer.from(await image.arrayBuffer()), meta = await sharp(bytes).metadata();
      assert.equal(meta.width, 1200); assert.equal(meta.height, 630); assert.equal(meta.format, "png"); hashes.push(createHash("sha256").update(bytes).digest("hex"));
      if (locale === "id" && entry.id === row.id) await writeFile(screenshots + "/product-og.png", bytes);
      await page.goto(origin + path); assert.equal(await page.locator("h1").count(), 1);
      assert.equal(await page.locator("h1").innerText(), entry.translations[locale].title);
      if (entry.details.productCta.type === "external") {
        const cta = page.getByRole("link", { name: /Diskusikan produk|Discuss product/ });
        assert.equal(await cta.getAttribute("href"), "https://demo.example.test"); assert.equal(await cta.getAttribute("rel"), "noopener noreferrer");
      } else assert.ok(await page.locator(`a[href="/${locale}/consultation"]`).count() > 0);
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
    }
    await page.goto(origin + `/${locale}/products`); await page.locator(`a[href="/${locale}/products/${row.slug}"]`).first().click();
    await page.waitForURL(`**/${locale}/products/${row.slug}`); const image = page.locator(`img[src="${cover}"]`); await image.waitFor();
    await poll(() => image.evaluate(img => img.complete && img.naturalWidth > 0));
  }
  assert.equal(new Set(hashes).size, 6); assert.deepEqual(externalRequests, []);
  await page.goto(origin + "/id/products"); await screenshot(page, "desktop-list");
  await page.goto(origin + "/id/products/" + row.slug); await screenshot(page, "desktop-detail");
  await page.setViewportSize({ width: 390, height: 844 });
  for (const [name, path] of [["mobile-list", "/id/products"], ["mobile-detail", "/en/products/" + row.slug]]) {
    await page.goto(origin + path); assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
    await screenshot(page, name);
  }
  const oldSlug = row.slug; row = await db.contentEntry.update({ where: { id: row.id }, data: { slug: oldSlug + "-new", version: { increment: 1 } } });
  for (const alias of [oldSlug, row.id]) for (const suffix of ["", "/opengraph-image/main"]) {
    const response = await request(`/id/products/${alias}${suffix}`); assert.equal(response.status, 308); assert.ok(response.headers.get("location").endsWith(`/id/products/${row.slug}${suffix}`));
  }
  const sitemap = await (await request("/sitemap.xml")).text(); assert.match(sitemap, new RegExp("/products/" + row.slug + "</loc>"));
  assert.doesNotMatch(sitemap, new RegExp("/products/" + oldSlug + "</loc>")); assert.doesNotMatch(sitemap, new RegExp("/products/" + row.id));
  for (const update of [{ status: "DRAFT" }, { status: "REVIEW" }, { status: "SCHEDULED", publishedAt: new Date(Date.now() + 600000) }, { status: "PUBLISHED", deletedAt: new Date(), publishedAt: new Date(Date.now() - 10000) }, { status: "ARCHIVED", deletedAt: null }]) {
    await db.contentEntry.update({ where: { id: row.id }, data: update });
    for (const route of [row.slug, oldSlug, row.id]) for (const suffix of ["", "/opengraph-image/main"]) {
      const response = await request(`/id/products/${route}${suffix}`); assert.equal(response.status, 404);
      assert.equal(response.headers.get("location"), null); assert.ok(!(await response.text()).includes(row.translations.id.title));
    }
    assert.equal((await request(cover)).status, 404);
    for (const agent of ["Mozilla/5.0", "Googlebot"]) {
      const response = await request(`/id/products/${row.slug}`, agent); assert.equal(response.status, 404);
      assert.ok(!(await response.text()).includes(row.translations.id.title));
    }
    assert.ok(!(await (await request("/sitemap.xml")).text()).includes(`/products/${row.slug}`));
  }
  await db.contentEntry.update({ where: { id: row.id }, data: { status: "SCHEDULED", deletedAt: null, publishedAt: new Date(Date.now() - 1000) } });
  assert.equal((await request("/id/products/" + row.slug)).status, 200); assert.equal((await request(cover)).status, 200);
  for (const path of ["/id/products/1", "/id/products/" + randomUUID(), "/fr/products/" + row.slug]) assert.equal((await request(path)).status, 404);
  assert.deepEqual(errors, []);
  console.log("PASS: DB-only empty/catalog, detail ID/EN/CTA/cover/readiness, complete unique SEO/OG1200x630/schema, actual404/308, aliases/private withdrawal/due schedule, sitemap canonical, no external demo fetch, desktop/mobile.");
  console.log("Product public QA artifacts: " + screenshots);
} finally {
  await browser?.close(); server.kill("SIGTERM");
  await db.productRoute.deleteMany({ where: { contentId: { in: ids } } }); await db.contentEntry.deleteMany({ where: { id: { in: ids } } }); await db.$disconnect();
  assert.ok(storage.startsWith("/private/tmp/lunabiner-products-public-uploads-")); await rm(storage, { recursive: true });
}
