import "./server-loader.mjs";
import test, { after } from "node:test";
import assert from "node:assert/strict";
import { randomUUID, createHash } from "node:crypto";
import { mkdtemp, writeFile } from "node:fs/promises";

const { seoPageKeys, seoDocumentSchema } = await import("../src/features/website/seo/contracts.ts");
const { getPageSeo } = await import("../src/features/website/seo/registry.ts");
const { buildMetadata, pageUrl } = await import("../src/features/website/seo/metadata.ts");
const { buildSiteSchema, buildPageSchema, serializeJsonLd } = await import("../src/features/website/seo/schema.ts");
const { seoFromPublishedEntry, getArticleSeoContent, getCaseStudySeoContent } = await import("../src/features/website/seo/content.ts");
const { renderOgImage } = await import("../src/features/website/seo/og-image.tsx");
const { db } = await import("../src/lib/db.ts");
after(async () => db.$disconnect());

test("all fixed public pages have distinct localized titles, descriptions, canonicals and OG URLs", () => {
  for (const locale of ["id", "en"]) {
    const documents = seoPageKeys.map(key => getPageSeo(key, locale));
    for (const field of ["title", "description", "path"]) assert.equal(new Set(documents.map(item=>item[field])).size, documents.length);
    const urls = [];
    for (const document of documents) {
      const metadata = buildMetadata(document);
      assert.ok(metadata.title.absolute.includes("LunaBiner"));
      assert.equal(metadata.openGraph.title, metadata.title.absolute);
      assert.equal(metadata.twitter.title, metadata.title.absolute);
      assert.equal(metadata.description, metadata.openGraph.description);
      assert.equal(metadata.twitter.card, "summary_large_image");
      assert.equal(metadata.openGraph.url, metadata.alternates.canonical);
      assert.match(metadata.alternates.canonical, new RegExp(`/${locale}(?:/|$)`));
      assert.equal(metadata.alternates.languages["x-default"], metadata.alternates.languages.id);
      assert.ok(metadata.openGraph.images[0].url.startsWith(metadata.alternates.canonical + "/"));
      assert.equal(metadata.twitter.images[0].url, metadata.openGraph.images[0].url);
      assert.ok(metadata.keywords.length > 0);
      urls.push(metadata.openGraph.images[0].url);
    }
    assert.equal(new Set(urls).size, documents.length);
  }
});

test("SEO contracts reject foreign URLs, traversal, query canonicals and unsupported locale", () => {
  const document = getPageSeo("about", "id");
  for (const path of ["https://attacker.test", "//attacker.test", "/../login", "/work?utm_source=secret", "/work#fragment", "/%2e%2e/login", "/work/"]) {
    assert.throws(()=>buildMetadata({...document,path}));
  }
  assert.throws(()=>pageUrl("fr", "/about"));
  assert.throws(()=>getPageSeo("dashboard", "id"));
  assert.throws(()=>seoDocumentSchema.parse({...document,secret:"not-allowed"}));
});

test("schema types match content and shared entities use stable references without fabricated offers", () => {
  const site = buildSiteSchema();
  const organization = site["@graph"].find(node=>node["@type"]==="Organization");
  assert.ok(organization.logo.endsWith("/images/lunabiner-logo.png"));
  for (const [key,type] of [["about","AboutPage"],["contact","ContactPage"],["solutions","CollectionPage"],["consultation","WebPage"]]) {
    const schema=buildPageSchema(getPageSeo(key,"en"));
    assert.equal(schema["@graph"][0]["@type"],type);
    assert.equal(schema["@graph"][0].publisher["@id"],organization["@id"]);
    assert.ok(!JSON.stringify(schema).includes("offers"));
  }
  const products=buildPageSchema(getPageSeo("products","id"),[{type:"CreativeWork",name:"Enterprise Chat",description:"A product concept, not a live offer.",concept:true}]);
  assert.equal(products["@graph"][2].itemListElement[0].item.creativeWorkStatus,"Concept");
  assert.ok(!JSON.stringify(products).includes('"@type":"Product"'));
  assert.throws(()=>buildPageSchema(getPageSeo("about","id"),[{type:"Service",name:"Service",description:"Test description"}]));
  assert.throws(()=>buildPageSchema(getPageSeo("products","id"),[{type:"Service",name:"Service",description:"Test description",concept:true}]));
});

test("JSON-LD safely escapes script termination and Unicode separators without changing data", () => {
  const data={"@context":"https://schema.org",name:"</script><script>alert(1)</script>&\u2028\u2029"};
  const json=serializeJsonLd(data);
  assert.ok(!json.includes("<")); assert.ok(!json.includes("&"));
  assert.deepEqual(JSON.parse(json),data);
});

test("published CMS SEO overrides use real author/dates and strip markup, missing fields fall back", async () => {
  const ids=[];
  const text={title:"Business integration article",excerpt:"Article excerpt with verified business context.",body:"Published article body for isolated test only.",seoTitle:"Integration SEO title",seoDescription:"Specific integration description from CMS."};
  try {
    const entry=await db.contentEntry.create({data:{kind:"ARTICLE",slug:"seo-"+randomUUID(),status:"PUBLISHED",publishedAt:new Date("2026-01-01T00:00:00Z"),translations:{id:text,en:text},details:{category:"Integration",tags:["Data"],authorName:"Test author"}}});
    ids.push(entry.id);
    const resolved=await getArticleSeoContent("en",entry.slug);
    assert.equal(resolved.entry.id,entry.id);assert.equal(resolved.article,null);
    assert.equal(resolved.seo.title,text.seoTitle);assert.equal(resolved.seo.headline,text.title);
    assert.equal(resolved.seo.description,text.seoDescription);
    const schema=buildPageSchema(resolved.seo);
    const article=schema["@graph"].find(node=>node["@type"]==="Article");
    assert.equal(article.author.name,"Test author");assert.equal(article.datePublished,"2026-01-01T00:00:00.000Z");
    assert.equal(buildMetadata(resolved.seo).openGraph.type,"article");
    const fallback={...resolved.entry,translations:{...resolved.entry.translations,en:{...text,seoTitle:"<b> </b>",seoDescription:"x"}}};
    const seo=seoFromPublishedEntry(fallback,"en");assert.equal(seo.title,text.title);assert.equal(seo.description,text.excerpt);
    for (const status of ["DRAFT","REVIEW","ARCHIVED"]) {
      await db.contentEntry.update({where:{id:entry.id},data:{status}});
      assert.equal(await getArticleSeoContent("en",entry.slug),null);
    }
    await db.contentEntry.update({where:{id:entry.id},data:{status:"SCHEDULED",publishedAt:new Date(Date.now()+86400000)}});
    assert.equal(await getArticleSeoContent("en",entry.slug),null);
    const projectRow=await db.contentEntry.create({data:{kind:"CASE_STUDY",slug:"case-"+randomUUID(),status:"DRAFT",publishedAt:new Date("2026-01-01T00:00:00Z"),translations:{id:text,en:text},details:{verifiedProject:false}}});
    ids.push(projectRow.id);
    assert.equal(await getCaseStudySeoContent("id",projectRow.id),null);
    await db.contentEntry.update({where:{id:projectRow.id},data:{status:"PUBLISHED"}});
    const project=await getCaseStudySeoContent("id",projectRow.id);
    assert.equal(project.seo.path,"/work/"+projectRow.id);
    assert.equal(project.seo.entityType,"CreativeWork");assert.equal(project.seo.illustrative,true);
  } finally { await db.contentEntry.deleteMany({where:{id:{in:ids}}}); }
});

test("detail resolvers validate IDs, preserve static links and do not invent dates or client claims", async () => {
  assert.equal(await getArticleSeoContent("id","bad?slug"),null);
  assert.equal(await getCaseStudySeoContent("id","1e0"),null);
  assert.equal(await getCaseStudySeoContent("id","01"),null);
  assert.equal(await getCaseStudySeoContent("id",randomUUID()),null);
  const article=await getArticleSeoContent("id","ai-untuk-operasi-bisnis");
  assert.equal(article.entry,null);assert.equal(article.seo.publishedAt,undefined);
  const project=await getCaseStudySeoContent("en","1");
  assert.equal(project.entry,null);assert.equal(project.seo.illustrative,true);assert.match(project.seo.title,/Illustrative example/);
  assert.equal(project.seo.path,"/work/1");
});

test("OG renderer produces distinct real 1200x630 PNGs using the local brand logo", async () => {
  const directory=await mkdtemp("/private/tmp/lunabiner-seo-og-");
  const hashes=[];
  for (const key of ["home","solutions","consultation"]) {
    const response=await renderOgImage(getPageSeo(key,"id"));
    assert.match(response.headers.get("content-type"),/image\/png/);
    const bytes=Buffer.from(await response.arrayBuffer());
    assert.equal(bytes.subarray(1,4).toString(),"PNG");
    assert.equal(bytes.readUInt32BE(16),1200);assert.equal(bytes.readUInt32BE(20),630);
    hashes.push(createHash("sha256").update(bytes).digest("hex"));
    await writeFile(directory+"/"+key+".png",bytes);
  }
  assert.equal(new Set(hashes).size,3);
  console.log("OG visual QA artifacts: "+directory);
});
