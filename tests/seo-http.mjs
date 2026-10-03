import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { randomUUID, createHash } from "node:crypto";
import { PrismaClient } from "@prisma/client";

// This acceptance suite writes fixtures: never point it at the user's database.
const database = new URL(process.env.DATABASE_URL || "postgresql://invalid");
assert.equal(database.hostname, "127.0.0.1");
assert.equal(database.port, "55439");
assert.equal(database.username, "lunabiner_test");
const db = new PrismaClient();
const base = "http://127.0.0.1:55445";
const ids = [];
let app;
const decode = value => value.replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&#x27;/g, "'").replace(/&lt;/g, "<").replace(/&gt;/g, ">");
function attributes(tag) {
  return Object.fromEntries([...tag.matchAll(/([\w:-]+)="([^"]*)"/g)].map(match => [match[1], decode(match[2])]));
}
function metadata(html) {
  const tags = [...html.matchAll(/<meta\b[^>]*>/g)].map(match => attributes(match[0]));
  const values = Object.fromEntries(tags.map(tag => [tag.name || tag.property, tag.content]));
  const canonical = [...html.matchAll(/<link\b[^>]*>/g)].map(match => attributes(match[0])).find(tag => tag.rel === "canonical")?.href;
  const schema = [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)].flatMap(match => JSON.parse(match[1])["@graph"]);
  return { values, canonical, schema, title: decode(html.match(/<title>([^<]*)<\/title>/)?.[1] || "") };
}
const get = path => fetch(base + path, { headers: { "User-Agent": "Twitterbot" } });

try {
  const slug = "seo-http-" + randomUUID();
  const text = { title: "Published SEO HTTP fixture", excerpt: "Published business context for isolated SEO acceptance.", body: "PUBLIC SEO BODY", seoTitle: "Contextual SEO HTTP title", seoDescription: "Contextual description supplied by the CMS editor." };
  const article = await db.contentEntry.create({ data: { kind: "ARTICLE", slug, status: "PUBLISHED", publishedAt: new Date("2026-01-01"), translations: { id: text, en: text }, details: { category: "Integration", tags: ["Business"], authorName: "Editorial fixture" } } });
  ids.push(article.id);
  const project = await db.contentEntry.create({ data: { kind: "CASE_STUDY", slug: slug + "-case", status: "PUBLISHED", publishedAt: new Date("2026-01-01"), translations: { id: text, en: text }, details: { verifiedProject: false } } });
  ids.push(project.id);
  const draft = await db.contentEntry.create({ data: { kind: "ARTICLE", slug: slug + "-draft", status: "DRAFT", translations: { id: { ...text, title: "PRIVATE SEO DRAFT" }, en: text }, details: {} } });
  ids.push(draft.id);
  app = spawn(process.execPath, ["node_modules/next/dist/bin/next", "start", "--hostname", "127.0.0.1", "--port", "55445"], { env: { ...process.env, AI_ASSISTANT_ENABLED: "false" }, stdio: "ignore" });
  let ready = false;
  for (let attempt = 0; attempt < 60; attempt++) {
    try { const response = await get("/id/about"); if (response.status === 200) { ready = true; break; } } catch {}
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  assert.ok(ready, "Production test server must start.");
  const paths = ["", "/solutions", "/work", "/products", "/insights", "/about", "/contact", "/consultation", "/insights/" + slug, "/work/" + project.id, "/insights/ai-untuk-operasi-bisnis", "/work/1"];
  let checked = 0;
  for (const locale of ["id", "en"]) {
    const fixedTitles = [], fixedDescriptions = [], fixedImages = [];
    for (const path of paths) {
      const route = "/" + locale + path;
      const response = await get(route);
      assert.equal(response.status, 200, route);
      const html = await response.text();
      const seo = metadata(html);
      assert.ok(seo.title.includes("LunaBiner"), route);
      assert.ok(!seo.title.includes("LunaBiner | LunaBiner"));
      assert.equal(new URL(seo.canonical).pathname, route);
      for (const key of ["description", "keywords", "category", "robots", "og:title", "og:description", "og:url", "og:site_name", "og:type", "og:image", "og:image:width", "og:image:height", "og:image:alt", "twitter:card", "twitter:title", "twitter:description", "twitter:image"]) assert.ok(seo.values[key], route + " " + key);
      assert.equal(seo.values["og:title"], seo.title);
      assert.equal(seo.values["twitter:title"], seo.title);
      assert.equal(seo.values["og:description"], seo.values.description);
      assert.equal(seo.values["twitter:description"], seo.values.description);
      assert.equal(seo.values["og:url"], seo.canonical);
      assert.equal(seo.values["og:site_name"], "LunaBiner");
      assert.equal(seo.values["twitter:card"], "summary_large_image");
      assert.equal(seo.values["twitter:image"], seo.values["og:image"]);
      assert.match(seo.values.robots, /index.*follow/);
      assert.equal(new URL(seo.values["og:image"]).pathname, route + "/opengraph-image/main");
      assert.equal(seo.schema.filter(node => node["@type"] === "Organization").length, 1);
      assert.equal(seo.schema.filter(node => node["@type"] === "WebSite").length, 1);
      const page = seo.schema.find(node => node["@id"] === seo.canonical + "#webpage");
      assert.equal(page.name, seo.title); assert.equal(page.description, seo.values.description);
      assert.equal(page.inLanguage, locale);
      const image = await get(new URL(seo.values["og:image"]).pathname);
      assert.equal(image.status, 200); assert.match(image.headers.get("content-type"), /image\/png/);
      assert.equal(image.headers.get("cache-control"), "no-store");
      const bytes = Buffer.from(await image.arrayBuffer());
      assert.equal(bytes.readUInt32BE(16), 1200); assert.equal(bytes.readUInt32BE(20), 630);
      if (paths.indexOf(path) < 8) {
        fixedTitles.push(seo.title); fixedDescriptions.push(seo.values.description);
        fixedImages.push(createHash("sha256").update(bytes).digest("hex"));
      }
      if (path.startsWith("/insights/")) {
        assert.equal(seo.values["og:type"], "article");
        assert.ok(seo.schema.some(node => node["@type"] === "Article"));
      }
      if (path === "/insights/" + slug) {
        assert.ok(seo.title.startsWith(text.seoTitle));
        assert.equal(seo.values.description, text.seoDescription);
        assert.ok(html.includes("PUBLIC SEO BODY"));
      }
      if (path === "/insights") {
        assert.ok(seo.schema.some(node => node["@type"] === "Blog"));
        assert.ok(!html.includes("PRIVATE SEO DRAFT"));
      }
      if (path.startsWith("/work/")) {
        assert.ok(seo.schema.some(node => node["@type"] === "CreativeWork" && node.genre));
      }
      checked++;
    }
    for (const list of [fixedTitles, fixedDescriptions, fixedImages]) assert.equal(new Set(list).size, 8);
    for (const path of ["/insights/" + draft.slug, "/insights/does-not-exist", "/work/" + randomUUID()]) {
      assert.equal((await get("/" + locale + path)).status, 404);
      assert.equal((await get("/" + locale + path + "/opengraph-image/main")).status, 404);
    }
  }
  assert.equal((await get("/fr/about/opengraph-image/main")).status, 404);
  console.log("PASS: " + checked + " public ID/EN pages with complete metadata, canonical, JSON-LD and distinct 1200x630 PNGs; CMS/static detail and private/missing 404s.");
} finally {
  if (app && app.exitCode === null) {
    await new Promise(resolve => { app.once("exit", resolve); app.kill("SIGTERM"); });
  }
  await db.contentEntry.deleteMany({ where: { id: { in: ids } } });
  await db.$disconnect();
}
