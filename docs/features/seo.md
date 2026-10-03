# Public SEO

## Current status

Tasks 1–3 are implemented. The eight public page families (home, solutions, work, products, insights, about, contact and consultation) and article/case-study detail pages expose contextual ID/EN metadata, native JSON-LD and working OG image endpoints. Sitemap, crawl directives and HTML language are synchronized. No migration or CMS form change is required. Local automated checks do not replace production deployment, domain verification or Search Console submission.

## Architecture and data flow

The feature follows Metadata → OpenGraph → Twitter → Canonical → Schema.org. Public non-secret brand and origin come from `src/config/app-config.ts` (`APP_CONFIG.url` / `NEXT_PUBLIC_APP_URL`, default `https://lunabiner.com`). The origin must be HTTP(S), without credentials, query, fragment or subpath. Production deployment must set the real HTTPS origin, not a preview/localhost address.

- `contracts.ts`: Zod contracts for ID/EN locale, internal non-localized paths, SEO documents and collection entities. Paths cannot include queries, fragments, traversal, foreign origins or trailing slashes. Collection entity concepts can only be CreativeWork, never active commercial offers.
- `registry.ts`: editorial source only, one bilingual definition per home, solutions, work, products, insights, about, contact and consultation page. Each locale has distinct titles/descriptions, context-specific keywords and category. `getPageSeoDocument` returns a validated source document, not the final Next metadata.
- `index.ts`: public SEO facade. `getPageSeo(key, locale, items?)` returns the complete `{ metadata, schema }` pair. `buildSeo(document, items?)` provides the same shape for dynamic content, keeping metadata/schema synchronized rather than duplicating route definitions.
- `routes.ts`: request-scoped `getPublicPageSeo` adds collection schema for services and the published CMS articles/cases/products actually shown by the UI, falling back to the existing static cards only when there are no eligible CMS entries. CMS list descriptions/keywords use the published context, not hidden fallback product names. `publishedContent` in the CMS service is React-cached per RSC request; no cross-request publication cache is introduced. Invalid locales map to 404.
- `metadata.ts`: `buildMetadata` produces a full Next Metadata object: title, description, keywords, robots (index/follow), category, OpenGraph (title/description/url/siteName/type/locale/images including width/height/alt), Twitter (summary_large_image/title/description/images) and alternates (canonical/languages). Absolute branded title avoids applying the root title template twice. `x-default` points to the ID equivalent. Article detail uses OG `article`; other pages use `website`. Twitter `site` is omitted until a real LunaBiner account is confirmed; it never uses BisaDev's handle or an invented account.
- `content.ts`: server-only React request-scoped cached article/case-study resolvers. Metadata, page and schema share one result within an RSC request. CMS query reuses `publicContentWhere` and `presentContent`: only PUBLISHED or due SCHEDULED rows are eligible. DB/provider errors propagate, not silently replaced with unrelated content. Missing eligible article falls back to an exact existing static slug; missing UUID case study returns null. Pages and image routes map null to `notFound`.
- CMS SEO uses localized `seoTitle` and `seoDescription`, with localized title/excerpt fallback when override is blank/too short after removing markup. Category/tags provide bounded, deduplicated keywords. Visible title remains the entity headline, separate from an editorial SEO title. Real `publishedAt`, `updatedAt` and supplied article author are used; no invented dates/authors. Unverified case studies are identified as illustrative. No numeric database ID is created; existing static `/work/1`–`/work/3` links remain compatible until a separately authorized migration.
- `schema.ts`: builders return graph data, not scripts. `buildSiteSchema` defines stable Organization/WebSite IDs once per document; `buildPageSchema` refers to them and adds page/image/content/list nodes. Insights has CollectionPage plus a Blog node (`/<locale>/insights#blog`) whose name/description/url/publisher match the reference contract. Article and CreativeWork describe detail content; CollectionPage can have ItemList of Service/Article/CreativeWork. If Blog and ItemList coexist, both remain referenced by the page. ListItem.position is ordering, not a persisted identifier. No price, offer, review, client result, schedule, search action or launch claim is fabricated.
- `json-ld.tsx`: native server-rendered `application/ld+json` script; serialization escapes `<`, `>`, `&`, U+2028/U+2029, preventing CMS text from terminating the script element.
- `og-image.tsx`: shared Node renderer with Next ImageResponse, PNG 1200×630, local logo read from `public/images/lunabiner-logo.png`. It creates per-context headline/category/description/language images, preserving teal/dark/orange identity without copying BisaDev branding. No external image/font download or LLM call is required. Explicit Node route handlers expose it at stable URLs described below. Image generation requests resolve their own data; React cache is not a cross-request publication cache.

## Active route integration

```ts
import { getPageSeo } from "@/features/website/seo";

const seo = getPageSeo("insights", "id");
// seo.metadata: complete Next Metadata, not the editorial registry record.
// seo.schema: @context + @graph (CollectionPage, ImageObject and Blog).
// Inside generateMetadata: return seo.metadata.
// Inside the page: <JsonLd data={seo.schema} />.
```

The JSON-LD graph is equivalent structured data to separate schema objects and avoids duplicating Organization in every page. Metadata title remains `{ absolute: string }` intentionally; schema name/OG/Twitter receive the resolved string, not that object.

Root layout retains metadataBase and global defaults only, with noindex/nofollow as the safe default for non-public pages. Each public page explicitly opts into index/follow and returns the shared metadata in `generateMetadata`, rendering its corresponding graph through `JsonLd`. Public layout renders Organization/WebSite JSON-LD once; pages reference these stable IDs instead of duplicating the organization. Twitter uses the corresponding contextual OG image. Public main and root HTML language match ID/EN.

Language architecture decision: proxy overwrites the internal x-lunabiner-locale request header from the URL (/en or /en/* → en, otherwise id). The async root layout validates it with Zod and reads it through headers(). The matcher covers page requests, excluding API/Next/assets/sitemap/robots. No client-supplied locale is trusted for public pages, no translation or auth decision uses this header, and existing server authorization remains required. headers() makes pages request-rendered, including previously static about/contact/solutions/login/register; this explicit tradeoff avoids duplicate root layouts and provides correct HTML to crawlers. Header also synchronizes document.documentElement.lang when locale changes through client-side navigation, because root layouts persist in the router.

Static and unverified CMS case-study UI/schema explicitly identify illustrative examples, without changing card spacing, typography, responsive layout or inventing verified client results. Existing numeric static URLs remain compatible; persisted CMS IDs remain UUIDs.

Every public page has one primary H1. SectionIntro defaults to H2 for inner/home sections and accepts as="h1" for the main headings of solutions/work/products/insights/about/contact/consultation. Styling and responsive classes remain unchanged.

## OG endpoints and deployment

Public, read-only `GET /{locale}{pagePath}/opengraph-image/main` returns `image/png` at 1200×630 with `Cache-Control: no-store`. There is no payload or authentication requirement. Locale is ID/EN; fixed pagePath is empty, /solutions, /work, /products, /insights, /about, /contact or /consultation. Detail paths are /insights/{slug} and /work/{UUID-or-existing-static-key}. Zod validates locale/slug/identifier; unsupported locales, invalid/missing/unpublished details return 404. Database/renderer failures propagate as server errors, never as unrelated fallback images. External image-provider and AI credentials are not involved.

Architecture decision: explicit `opengraph-image/main/route.ts` handlers are used rather than metadata-file image conventions. Installed Next 16.3.8 generates route-group image suffixes and evaluates `generateImageMetadata` during static-parameter collection. Explicit handlers keep metadata, Twitter and schema image URLs stable and avoid build-time queries for unknown detail parameters. `main` is an image variant name, not a database identifier. Next ImageResponse remains the renderer.

The renderer requires Node filesystem access to the local logo. The current standalone build trace includes this logo; keep public assets and .next/static in the deployed artifact as described in [installation](../deployment/installation.md). Set NEXT_PUBLIC_APP_URL to the actual public HTTPS origin **before building**, since public configuration can be embedded into the build. Authentication/API/rate-limiting behavior is unchanged.

## Sitemap and crawl policy

- GET /sitemap.xml is force-dynamic and calls server-only buildPublicSitemap. All eight fixed paths come from the SEO registry, including consultation; ID/EN and x-default alternates reuse localizedUrls, the same helper as page metadata.
- All eligible CMS ARTICLE/CASE_STUDY details are included using publicContentWhere (PUBLISHED/due SCHEDULED with publication date). The query is not capped at the 200-card collection display limit. Products have no detail route and are not invented as separate sitemap URLs.
- Existing static article and illustrative case routes remain reachable even when CMS cards replace the listing; they remain in the sitemap. A Map deduplicates paths, with published CMS overriding matching static article paths. Persisted cases use UUIDs; numeric static compatibility links are unchanged.
- lastModified is the actual CMS updatedAt. Static content has no trustworthy revision date, so lastModified is omitted rather than set to the time of every request. No sitemap priority/changefreq is invented.
- Publication/withdrawal is reflected at request time without rebuild. DB errors propagate rather than returning a misleading partial sitemap. Large future inventories must split sitemaps before the standard 50,000-URL limit; current scope uses one sitemap.
- GET /robots.txt uses the same validated origin for its sitemap directive, allows public/OG assets and disallows /dashboard and /api/. Login/register remain crawlable so compliant crawlers can read their noindex metadata. Crawl directives are not authorization; RBAC/session checks still protect private data.
- Auth/dashboard/API/OG endpoints are never page entries in the sitemap. Missing/unpublished details return 404 with Next's noindex handling.
- Default Next metadata streaming remains enabled: HTML-limited social bots receive tags in head; JavaScript-capable crawlers can inspect the complete DOM. No blanket streaming disable or unverified rich-result/ranking promise is introduced.

## Verification and SEO limits

Run `node --test tests/seo.test.mjs` using an **isolated test PostgreSQL** only: the suite creates/cleans synthetic CMS records. Tests cover unique bilingual metadata, canonical/OG consistency, unsafe URL rejection, JSON-LD escaping, schema contexts, published filtering, real CMS dates/author, static compatibility and actual PNG generation. Generated PNG QA artifacts are temporary under `/private/tmp/lunabiner-seo-og-*`, never committed. `tests/server-loader.mjs` resolves `next/og.js` for direct Node ESM tests; the production import remains `next/og`.

Run the complete DB-backed regression suite with `node --test --test-concurrency=1 tests/*.test.mjs`; existing integration tests share one isolated database and analytics counts can observe other files' temporary fixtures under parallel execution. Run the HTTP suite after regression cleanup, not concurrently with fixture mutation.

`tests/seo-http.mjs` verifies production-rendered HTML and real OG PNG endpoints for all eight fixed pages in both languages, CMS UUID case/article detail, static detail and unpublished/missing 404s. It also crawls sitemap loc URLs against page canonicals, tests live publication/withdrawal, unique canonical/title, reciprocal ID/EN/x-default alternates, root language/spoofed headers, private noindex/robots and social/search/desktop/mobile User Agents. It requires a freshly built app and the isolated PostgreSQL test role/port (lunabiner_test, 55439); it refuses other database targets and starts/stops its own test server on 55445. Synthetic UUID fixtures are cleaned up. It does not send requests to the LLM or external crawlers. SEO unit tests cover all publication statuses and real/omitted lastModified.

Use concise, descriptive titles and per-page descriptions, without keyword stuffing or duplicate generic copy. Google can rewrite titles/snippets; title lengths are not a guaranteed character cutoff. Meta keywords are included at the user's request, but are not a Google ranking factor. Structured data describes existing visible content and does not guarantee rich results or rankings. CMS editorial claims still require human review; Zod validation is not semantic fact checking.

References: [Google title guidance](https://developers.google.com/search/docs/appearance/title-link), [Google snippets](https://developers.google.com/search/docs/appearance/snippet), [meta keywords](https://developers.google.com/search/blog/2009/09/google-does-not-use-keywords-meta-tag). Implementation follows the locally installed Next.js metadata, JSON-LD and ImageResponse guides.
