import "server-only";
import { cache } from "react";
import { notFound } from "next/navigation";
import { publishedContent } from "@/features/cms/service";
import { website, type Locale } from "../content";
import { seoLocaleSchema, type SeoPageKey, type SchemaItem } from "./contracts";
import { getPageSeoDocument } from "./registry";
import { buildSeo } from "./index";

export function publicSeoLocale(value: string): Locale {
  const parsed = seoLocaleSchema.safeParse(value);
  if (!parsed.success) notFound();
  return parsed.data;
}

/** Same published snapshot for list UI, metadata and schema within an RSC request. */
export const getPublicPageSeo = cache(async (key: SeoPageKey, rawLocale: string) => {
  const locale = publicSeoLocale(rawLocale);
  const document = getPageSeoDocument(key, locale);
  let items: SchemaItem[] = [];
  if (key === "solutions") {
    items = website.services.map(service => ({ type: "Service", name: service.title[locale], description: service.body[locale], concept: false }));
  } else if (key === "work" || key === "insights" || key === "products") {
    const kind = key === "work" ? "CASE_STUDY" : key === "insights" ? "ARTICLE" : "PRODUCT";
    const entries = await publishedContent(kind);
    if (entries.length) {
      // Do not advertise static fallback examples when the UI displays CMS content instead.
      if (key !== "work") {
        document.description = `${document.title}. ${entries[0].translations[locale].excerpt}`.slice(0, 500);
        document.keywords = [...new Set(["LunaBiner", ...entries.flatMap(entry => [entry.details.category, ...entry.details.tags]).filter(Boolean)])].slice(0, 30);
      }
      items = entries.map(entry => {
        const illustrative = entry.kind === "CASE_STUDY" && !entry.details.verifiedProject;
        const qualifier = illustrative ? (locale === "id" ? "Contoh ilustratif: " : "Illustrative example: ") : "";
        return { type: entry.kind === "ARTICLE" ? "Article" : "CreativeWork", name: qualifier + entry.translations[locale].title,
          description: qualifier + entry.translations[locale].excerpt,
          ...(entry.kind === "ARTICLE" ? { path: `/insights/${entry.slug}` } : entry.kind === "CASE_STUDY" ? { path: `/work/${entry.slug}` } : {}),
          concept: entry.kind === "PRODUCT" && entry.details.productStatus === "COMING_SOON" };
      });
    } else if (key === "insights") {
      items = website.articles.map(article => ({ type: "Article", name: article.title[locale], description: article.excerpt[locale], path: `/insights/${article.slug}`, concept: false }));
    } else if (key === "products") {
      items = website.products.map(product => ({ type: "CreativeWork", name: product.name, description: product.text[locale], concept: true }));
    }
  }
  return { document, ...buildSeo(document, items) };
});
