import "./server-loader.mjs";
import test from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { renderToStaticMarkup } from "react-dom/server";
import { createElement } from "react";
const target = new URL(process.env.DATABASE_URL ?? "postgresql://invalid");
assert.equal(target.hostname, "127.0.0.1"); assert.equal(target.port, "55441");
assert.equal(target.username, "portfolio_test"); assert.equal(target.pathname, "/lunabiner_portfolio_test");
const { db } = await import("../src/lib/db.ts");
const { publishedProducts } = await import("../src/features/products/public-data.ts");
const { ProductGrid, ProductDetail } = await import("../src/features/products/public.tsx");
const { getProductSeoContent, seoFromPublishedEntry } = await import("../src/features/website/seo/content.ts");
const { getPublicPageSeo } = await import("../src/features/website/seo/routes.ts");
const { buildSeo } = await import("../src/features/website/seo/index.ts");
const { buildPublicSitemap } = await import("../src/features/website/seo/sitemap.ts");
const { default: Products } = await import("../src/app/(public)/[locale]/products/page.tsx");
test("DB-only products share eligible localized detail/SEO/schema/sitemap and safe CTA rendering", async () => {
  const ids = [];
  const translations = { id: { title: "Produk QA <script>unsafe</script>", excerpt: "Ringkasan produk bisnis untuk pengujian.", seoTitle: "Judul SEO produk QA", seoDescription: "Deskripsi SEO produk bisnis khusus untuk pengujian." },
    en: { title: "QA Business Product", excerpt: "A business product description for testing.", seoTitle: "QA Product SEO Title", seoDescription: "An English product SEO description for testing." } };
  try {
    assert.equal((await publishedProducts()).length, 0);
    const empty = renderToStaticMarkup(await Products({ params: Promise.resolve({ locale: "id" }) }));
    assert.match(empty, /Belum ada produk/); assert.doesNotMatch(empty, /Enterprise Chat|AI Cashflow/);
    assert.ok(!(await getPublicPageSeo("products", "id")).schema["@graph"].some(node => node["@type"] === "ItemList"));
    for (const [status, due, deletedAt] of [["DRAFT", true, null], ["REVIEW", true, null], ["ARCHIVED", true, null], ["SCHEDULED", false, null], ["PUBLISHED", true, new Date()], ["SCHEDULED", true, null], ["PUBLISHED", true, null]]) {
      const row = await db.contentEntry.create({ data: { kind: "PRODUCT", slug: "public-product-" + randomUUID(), status, deletedAt,
        publishedAt: new Date(Date.now() + (due ? -10000 : 600000)), translations,
        details: { productStatus: "COMING_SOON", productFeatures: { id: ["Fitur privat"], en: ["Private feature"] }, productCta: { type: "external", url: "https://demo.example.test" }, ctaLabel: { id: "Demo produk", en: "Product demo" } } } }); ids.push(row.id);
      const eligible = !deletedAt && (status === "PUBLISHED" || status === "SCHEDULED" && due);
      const result = await getProductSeoContent("id", row.slug);
      assert.equal(Boolean(result), eligible); assert.equal(Boolean(await getProductSeoContent("id", row.id)), eligible);
      const sitemap = await buildPublicSitemap();
      assert.equal(sitemap.some(item => item.url.endsWith("/products/" + row.slug)), eligible);
      assert.ok(!sitemap.some(item => item.url.endsWith("/products/" + row.id)));
      if (!eligible) continue;
      const fallback = seoFromPublishedEntry({ ...result.entry, translations: { ...result.entry.translations,
        id: { ...result.entry.translations.id, seoTitle: "", seoDescription: "" } } }, "id");
      assert.equal(fallback.title, "Produk QA unsafe"); assert.equal(fallback.description, translations.id.excerpt);
      for (const locale of ["id", "en"]) {
        const content = await getProductSeoContent(locale, row.slug), seo = buildSeo(content.seo);
        assert.equal(seo.metadata.description, translations[locale].seoDescription);
        assert.equal(seo.metadata.title.absolute, translations[locale].seoTitle + " | LunaBiner");
        assert.ok(seo.metadata.alternates.canonical.endsWith(`/${locale}/products/${row.slug}`));
        assert.equal(seo.metadata.openGraph.url, seo.metadata.alternates.canonical);
        assert.equal(seo.metadata.twitter.images[0].url, seo.metadata.openGraph.images[0].url);
        const entity = seo.schema["@graph"].find(node => node["@type"] === "CreativeWork");
        assert.equal(entity.creativeWorkStatus, "Concept"); assert.equal(entity.datePublished, row.publishedAt.toISOString());
        assert.ok(!JSON.stringify(seo.schema).includes('"offers"')); assert.ok(!JSON.stringify(seo.schema).includes('"aggregateRating"'));
        const detail = renderToStaticMarkup(createElement(ProductDetail, { entry: content.entry, locale }));
        assert.match(detail, /target="_blank" rel="noopener noreferrer"/); assert.match(detail, /https:\/\/demo.example.test/);
        assert.match(detail, locale === "id" ? /Fitur privat/ : /Private feature/);
        assert.doesNotMatch(detail, /<script>unsafe<\/script>/);
      }
      const grid = renderToStaticMarkup(createElement(ProductGrid, { entries: [result.entry], locale: "id" }));
      assert.match(grid, new RegExp("/id/products/" + row.slug)); assert.match(grid, /Segera hadir/);
      await db.contentEntry.update({ where: { id: row.id }, data: { slug: row.slug + "-new", version: { increment: 1 } } });
      const alias = await getProductSeoContent("id", row.slug); assert.equal(alias.redirect, true); assert.equal(alias.canonicalSlug, row.slug + "-new");
      const renamedSitemap = await buildPublicSitemap(); assert.ok(!renamedSitemap.some(item => item.url.endsWith("/products/" + row.slug)));
      for (const productStatus of ["BETA", "LIVE"]) {
        const changed = await db.contentEntry.update({ where: { id: row.id }, data: { details: { ...row.details, productStatus, productCta: { type: "internal", path: "/consultation" } } } });
        const changedContent = await getProductSeoContent("en", changed.slug);
        assert.equal(changedContent.seo.creativeWorkStatus, productStatus === "LIVE" ? "Released" : "Beta");
        assert.match(renderToStaticMarkup(createElement(ProductDetail, { entry: changedContent.entry, locale: "en" })), /href="\/en\/consultation"/);
      }
      const withdrawn = await db.contentEntry.update({ where: { id: row.id }, data: { status: "DRAFT" } });
      assert.equal(await getProductSeoContent("id", row.slug), null);
      assert.throws(() => seoFromPublishedEntry({ ...result.entry, deletedAt: new Date() }, "id"), /published/);
      assert.throws(() => seoFromPublishedEntry({ ...result.entry, status: withdrawn.status }, "id"), /published/);
    }
    for (const route of ["../private", "x?query", randomUUID(), "1"]) assert.equal(await getProductSeoContent("id", route), null);
    const original = db.contentEntry.findMany;
    try {
      db.contentEntry.findMany = async () => { throw new Error("Synthetic database failure"); };
      const failed = renderToStaticMarkup(await Products({ params: Promise.resolve({ locale: "en" }) }));
      assert.match(failed, /Products could not be loaded/); assert.doesNotMatch(failed, /Enterprise Chat|AI Cashflow|Synthetic database failure/);
    } finally { db.contentEntry.findMany = original; }
  } finally {
    await db.productRoute.deleteMany({ where: { contentId: { in: ids } } }); await db.contentEntry.deleteMany({ where: { id: { in: ids } } }); await db.$disconnect();
  }
});
