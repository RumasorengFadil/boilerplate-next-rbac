import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { randomUUID } from "node:crypto";
import { PrismaClient } from "@prisma/client";

// Fixture mutation/cleanup must never target the user's application database.
const target = new URL(process.env.DATABASE_URL || "postgresql://invalid");
assert.equal(target.hostname, "127.0.0.1");
assert.equal(target.port, "55441");
assert.equal(target.username, "portfolio_test");
assert.equal(target.pathname, "/lunabiner_portfolio_test");
const db = new PrismaClient(), ids = [];
const origin = "http://127.0.0.1:3008";
let app;
const agents = ["Twitterbot", "Googlebot", "Mozilla/5.0"];
const get = (path, agent = agents[0]) => fetch(origin + path, { redirect: "manual", headers: { "User-Agent": agent } });
const text = { title: "Routing illustration", excerpt: "A database-only portfolio routing acceptance example.", body: "RICH ROUTING BODY" };
const translations = { id: text, en: { ...text, title: "English routing illustration" } };
const create = async (slug, extra = {}) => {
  const row = await db.contentEntry.create({ data: { kind: "CASE_STUDY", slug, status: "PUBLISHED", publishedAt: new Date("2026-01-01"), translations, details: {}, ...extra } });
  ids.push(row.id); return row;
};
try {
  assert.equal(await db.contentEntry.count(), 0, "Run after fixture regression cleanup on an empty disposable DB.");
  app = spawn(process.execPath, ["node_modules/next/dist/bin/next", "start", "--hostname", "127.0.0.1", "--port", "3008"], {
    env: { ...process.env, AI_ASSISTANT_ENABLED: "false" }, stdio: "ignore",
  });
  let ready = false;
  for (let i = 0; i < 60; i++) {
    try { if ((await get("/id/about")).status === 200) { ready = true; break; } } catch {}
    await new Promise(resolve => setTimeout(resolve, 250));
  }
  assert.ok(ready);
  for (const locale of ["id", "en"]) {
    for (const path of [`/${locale}/work`, `/${locale}`]) {
      const response = await get(path); assert.equal(response.status, 200);
      const html = await response.text();
      assert.ok(html.includes(locale === "id" ? "Belum ada portfolio yang dipublikasikan." : "No portfolio has been published yet."));
      assert.ok(!/href="\/(?:id|en)\/work\//.test(html), "Empty DB must not render hardcoded portfolio links.");
      if (path.endsWith("/work")) {
        const graph = [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)].flatMap(match => JSON.parse(match[1])["@graph"]);
        assert.ok(!graph.some(node => node["@type"] === "ItemList"), "Empty work must not advertise static schema entries.");
      }
    }
    assert.equal((await get(`/${locale}/work/1`)).status, 404);
  }
  const slug = "routing-" + randomUUID();
  const entry = await create(slug);
  await db.portfolioRoute.create({ data: { value: "999", contentId: entry.id } });
  await db.contentEntry.update({ where: { id: entry.id }, data: { slug: slug + "-renamed" } });
  const related = await create("related-" + randomUUID());
  const hidden = await create("hidden-" + randomUUID(), { status: "DRAFT" });
  await db.contentEntry.update({ where: { id: entry.id }, data: { details: { relatedCaseStudies: [related.id, hidden.id, entry.id] } } });
  for (const locale of ["id", "en"]) {
    const canonical = `/${locale}/work/${slug}-renamed`;
    for (const agent of agents) for (const alias of [entry.id, "999", slug]) {
      const response = await get(`/${locale}/work/${alias}`, agent);
      assert.equal(response.status, 308, `${agent} ${alias}`);
      assert.equal(new URL(response.headers.get("location"), origin).pathname, canonical);
      const image = await get(`/${locale}/work/${alias}/opengraph-image/main`, agent);
      assert.equal(image.status, 308);
      assert.equal(new URL(image.headers.get("location"), origin).pathname, canonical + "/opengraph-image/main");
    }
    const response = await get(canonical); assert.equal(response.status, 200);
    const html = await response.text();
    assert.equal((html.match(/<h1\b/g) || []).length, 1); assert.ok(html.includes("RICH ROUTING BODY"));
    const canonicalUrl = html.match(/<link rel="canonical" href="([^"]+)"/)?.[1];
    assert.equal(new URL(canonicalUrl).pathname, canonical);
    assert.ok(html.includes(`href="/${locale}/work/${related.slug}"`));
    assert.ok(!html.includes(hidden.slug)); assert.ok(!html.includes(`href="/${locale}/work/${entry.id}"`));
    const graph = [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)].flatMap(match => JSON.parse(match[1])["@graph"]);
    assert.ok(graph.some(node => node["@type"] === "CreativeWork" && node.url === canonicalUrl));
    const image = await get(canonical + "/opengraph-image/main"); assert.equal(image.status, 200);
    const bytes = Buffer.from(await image.arrayBuffer()); assert.equal(bytes.readUInt32BE(16), 1200); assert.equal(bytes.readUInt32BE(20), 630);
    for (const path of [`/${locale}/work`, `/${locale}`]) {
      const body = await (await get(path)).text(); assert.ok(body.includes(`href="${canonical}"`)); assert.ok(!body.includes(hidden.slug));
    }
  }
  const sitemap = await (await get("/sitemap.xml")).text();
  const locs = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map(match => new URL(match[1]).pathname);
  for (const locale of ["id", "en"]) {
    assert.ok(locs.includes(`/${locale}/work/${slug}-renamed`));
    assert.ok(!locs.includes(`/${locale}/work/${entry.id}`)); assert.ok(!locs.includes(`/${locale}/work/${slug}`));
    assert.ok(!locs.some(path => /\/work\/\d+$/.test(path))); assert.ok(!locs.includes(`/${locale}/work/${hidden.slug}`));
  }
  for (const mutation of [{ status: "DRAFT" }, { status: "REVIEW" }, { status: "ARCHIVED" },
    { status: "SCHEDULED", publishedAt: new Date(Date.now() + 86400000) }, { status: "PUBLISHED", deletedAt: new Date() }]) {
    await db.contentEntry.update({ where: { id: entry.id }, data: mutation });
    for (const agent of agents) for (const route of [entry.id, "999", slug, slug + "-renamed"]) {
      const response = await get(`/id/work/${route}`, agent);
      assert.equal(response.status, 404, `Nonpublic ${route} ${agent}`); assert.equal(response.headers.get("location"), null);
      const html = await response.text(); assert.ok(!html.includes(text.title)); assert.ok(!html.includes("RICH ROUTING BODY"));
      assert.equal((await get(`/id/work/${route}/opengraph-image/main`)).status, 404);
    }
    assert.ok(!(await (await get("/sitemap.xml")).text()).includes(slug + "-renamed"));
  }
  await db.contentEntry.update({ where: { id: entry.id }, data: { status: "SCHEDULED", deletedAt: null, publishedAt: new Date(Date.now() - 60000) } });
  assert.equal((await get(`/en/work/${slug}-renamed`)).status, 200);
  assert.equal((await get(`/en/work/${entry.id}`)).status, 308);
  for (const route of ["missing-slug", randomUUID(), "01", "bad%3Fslug"]) assert.equal((await get("/id/work/" + route)).status, 404);
  console.log("PASS: production ID/EN database-only empty/list/home/detail/related links, canonical SEO/OG/sitemap, numeric/UUID/history 308 for bots and browsers; every nonpublic state is 404 without redirect or disclosure; due schedules visible.");
} finally {
  if (app && app.exitCode === null) await new Promise(resolve => { app.once("exit", resolve); app.kill("SIGTERM"); });
  await db.portfolioRoute.deleteMany({ where: { contentId: { in: ids } } });
  await db.contentEntry.deleteMany({ where: { id: { in: ids } } });
  await db.$disconnect();
}
