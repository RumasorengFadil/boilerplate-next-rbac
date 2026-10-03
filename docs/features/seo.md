# Public SEO

## Current status

Task 1 implements reusable SEO foundations under `src/features/website/seo/`. **They are not yet connected to public routes**: current live pages still use the existing generic root metadata, and the generated OG URLs are contracts for Task 2, not active image endpoints. No migration or CMS form change is required. Task 2 will integrate page metadata/JSON-LD and image routes; Task 3 will synchronize sitemap and verify rendered HTML/crawlers.

## Architecture and data flow

The feature follows Metadata → OpenGraph → Twitter → Canonical → Schema.org. Public non-secret brand and origin come from `src/config/app-config.ts` (`APP_CONFIG.url` / `NEXT_PUBLIC_APP_URL`, default `https://lunabiner.com`). The origin must be HTTP(S), without credentials, query, fragment or subpath. Production deployment must set the real HTTPS origin, not a preview/localhost address.

- `contracts.ts`: Zod contracts for ID/EN locale, internal non-localized paths, SEO documents and collection entities. Paths cannot include queries, fragments, traversal, foreign origins or trailing slashes. Collection entity concepts can only be CreativeWork, never active commercial offers.
- `registry.ts`: editorial source only, one bilingual definition per home, solutions, work, products, insights, about, contact and consultation page. Each locale has distinct titles/descriptions, context-specific keywords and category. `getPageSeoDocument` returns a validated source document, not the final Next metadata.
- `index.ts`: public SEO facade. `getPageSeo(key, locale, items?)` returns the complete `{ metadata, schema }` pair. `buildSeo(document, items?)` provides the same shape for dynamic content. This is the entry point for Task 2, keeping metadata/schema synchronized rather than duplicating route definitions.
- `metadata.ts`: `buildMetadata` produces a full Next Metadata object: title, description, keywords, robots (index/follow), category, OpenGraph (title/description/url/siteName/type/locale/images including width/height/alt), Twitter (summary_large_image/title/description/images) and alternates (canonical/languages). Absolute branded title avoids applying the root title template twice. `x-default` points to the ID equivalent. Article detail uses OG `article`; other pages use `website`. Twitter `site` is omitted until a real LunaBiner account is confirmed; it never uses BisaDev's handle or an invented account.
- `content.ts`: server-only React request-scoped cached article/case-study resolvers. Metadata, page and schema can share one result within an RSC request when integrated. CMS query reuses `publicContentWhere` and `presentContent`: only PUBLISHED or due SCHEDULED rows are eligible. DB/provider errors propagate, not silently replaced with unrelated content. Missing eligible article falls back to an exact existing static slug; missing UUID case study returns null. Callers will map null to `notFound` in Task 2.
- CMS SEO uses localized `seoTitle` and `seoDescription`, with localized title/excerpt fallback when override is blank/too short after removing markup. Category/tags provide bounded, deduplicated keywords. Visible title remains the entity headline, separate from an editorial SEO title. Real `publishedAt`, `updatedAt` and supplied article author are used; no invented dates/authors. Unverified case studies are identified as illustrative. No numeric database ID is created; existing static `/work/1`–`/work/3` links remain compatible until a separately authorized migration.
- `schema.ts`: builders return graph data, not scripts. `buildSiteSchema` defines stable Organization/WebSite IDs once per document; `buildPageSchema` refers to them and adds page/image/content/list nodes. Insights has CollectionPage plus a Blog node (`/<locale>/insights#blog`) whose name/description/url/publisher match the reference contract. Article and CreativeWork describe detail content; CollectionPage can have ItemList of Service/Article/CreativeWork. If Blog and ItemList coexist, both remain referenced by the page. ListItem.position is ordering, not a persisted identifier. No price, offer, review, client result, schedule, search action or launch claim is fabricated.
- `json-ld.tsx`: native server-rendered `application/ld+json` script; serialization escapes `<`, `>`, `&`, U+2028/U+2029, preventing CMS text from terminating the script element.
- `og-image.tsx`: shared Node renderer with Next ImageResponse, PNG 1200×630, local logo read from `public/images/lunabiner-logo.png`. It creates per-context headline/category/description/language images, preserving teal/dark/orange identity without copying BisaDev branding. No external image/font download or LLM call is required. Task 2 will expose it through route-specific `opengraph-image.tsx` files. Image generation requests resolve their own data; React cache is not a cross-request publication cache.

## Integration contract (not active yet)

```ts
import { getPageSeo } from "@/features/website/seo";

const seo = getPageSeo("insights", "id");
// seo.metadata: complete Next Metadata, not the editorial registry record.
// seo.schema: @context + @graph (CollectionPage, ImageObject and Blog).
// Inside generateMetadata: return seo.metadata.
// Inside the page: <JsonLd data={seo.schema} />.
```

The JSON-LD graph is equivalent structured data to separate schema objects and avoids duplicating Organization in every page. Metadata title remains `{ absolute: string }` intentionally; schema name/OG/Twitter receive the resolved string, not that object.

Root layout will retain metadataBase and global defaults only. Each public page will call the shared builder with its own validated source. Public layout will render Organization/WebSite JSON-LD once; pages will render page-specific graphs. Route-specific OG generation overrides parent images, and Twitter will reuse the corresponding image.

There is no SEO endpoint or new external input boundary exposed by Task 1. Existing authentication, API, rate limiting, public rendering, sitemap and robots behavior are unchanged. Auth/dashboard pages are outside the marketing-page metadata scope.

## Verification and SEO limits

Run `node --test tests/seo.test.mjs` using an **isolated test PostgreSQL** only: the suite creates/cleans synthetic CMS records. Tests cover unique bilingual metadata, canonical/OG consistency, unsafe URL rejection, JSON-LD escaping, schema contexts, published filtering, real CMS dates/author, static compatibility and actual PNG generation. Generated PNG QA artifacts are temporary under `/private/tmp/lunabiner-seo-og-*`, never committed. `tests/server-loader.mjs` resolves `next/og.js` for direct Node ESM tests; the production import remains `next/og`.

Use concise, descriptive titles and per-page descriptions, without keyword stuffing or duplicate generic copy. Google can rewrite titles/snippets; title lengths are not a guaranteed character cutoff. Meta keywords are included at the user's request, but are not a Google ranking factor. Structured data describes existing visible content and does not guarantee rich results or rankings. CMS editorial claims still require human review; Zod validation is not semantic fact checking.

References: [Google title guidance](https://developers.google.com/search/docs/appearance/title-link), [Google snippets](https://developers.google.com/search/docs/appearance/snippet), [meta keywords](https://developers.google.com/search/blog/2009/09/google-does-not-use-keywords-meta-tag). Implementation follows the locally installed Next.js metadata, JSON-LD and ImageResponse guides.
