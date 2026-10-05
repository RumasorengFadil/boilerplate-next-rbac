import "server-only";
import { cache } from "react";
import { z } from "zod";
import { db } from "@/lib/db";
import { presentContent, publicContentWhere } from "@/features/cms/service";
import { isPublicStatus } from "@/features/cms/schema";
import { resolvePublishedPortfolio } from "@/features/portfolio/service";
import { resolvePublishedProduct } from "@/features/products/service";
import { website, type Locale } from "../content";
import { seoDocumentSchema, seoLocaleSchema, type SeoDocument } from "./contracts";

type Entry = ReturnType<typeof presentContent>;
const slugSchema = z.string().min(2).max(120).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
const plainText = (value: string) => value.replace(/<[^>]*>/g, "").replace(/\s+/g, " ").trim();

export function seoFromPublishedEntry(entry: Entry, locale: Locale): SeoDocument {
  if (entry.deletedAt || !isPublicStatus(entry.status, entry.publishedAt)) throw new Error("SEO requires published content.");
  const text = entry.translations[locale];
  const illustrative = entry.kind === "CASE_STUDY" && !entry.details.verifiedProject;
  const prefix = illustrative ? (locale === "id" ? "Contoh ilustratif: " : "Illustrative example: ") : "";
  return seoDocumentSchema.parse({
    locale, path: entry.kind === "ARTICLE" ? `/insights/${entry.slug}` : entry.kind === "PRODUCT" ? `/products/${entry.slug}` : `/work/${entry.slug}`,
    title: prefix + (plainText(text.seoTitle) || plainText(text.title)), headline: prefix + plainText(text.title),
    description: plainText(text.seoDescription).length >= 10 ? plainText(text.seoDescription) : plainText(text.excerpt),
    keywords: [...new Set([
      entry.kind === "ARTICLE" ? "LunaBiner Insights" : entry.kind === "PRODUCT" ? (locale === "id" ? "produk LunaBiner" : "LunaBiner products") : (locale === "id" ? "studi kasus LunaBiner" : "LunaBiner case studies"),
      ...(entry.kind === "PRODUCT" ? [plainText(text.title)] : []),
      entry.details.category, ...entry.details.tags,
    ].filter(Boolean))].slice(0, 30),
    category: entry.details.category || (entry.kind === "ARTICLE" ? "INSIGHTS" : entry.kind === "PRODUCT" ? "LUNABINER LABS" : "PORTFOLIO"),
    pageType: "WebPage", entityType: entry.kind === "ARTICLE" ? "Article" : "CreativeWork",
    ...(entry.kind === "ARTICLE" && entry.details.authorName ? { authorName: entry.details.authorName } : {}),
    ...(entry.publishedAt ? { publishedAt: entry.publishedAt.toISOString() } : {}),
    modifiedAt: entry.updatedAt.toISOString(), illustrative,
    ...(entry.kind === "PRODUCT" ? { creativeWorkStatus: ({ COMING_SOON: "Concept", BETA: "Beta", LIVE: "Released" } as const)[entry.details.productStatus] } : {}),
  });
}

// RSC request-scoped memoization: metadata, page and JSON-LD share the same result.
// OG image requests are separate requests and resolve their own published content.
export const getArticleSeoContent = cache(async (rawLocale: Locale, rawSlug: string) => {
  const locale = seoLocaleSchema.parse(rawLocale);
  const slug = slugSchema.safeParse(rawSlug);
  if (!slug.success) return null;
  const row = await db.contentEntry.findFirst({ where: { ...publicContentWhere("ARTICLE"), slug: slug.data } });
  if (row) {
    const entry = presentContent(row);
    return { seo: seoFromPublishedEntry(entry, locale), entry, article: null };
  }
  const article = website.articles.find(item => item.slug === slug.data);
  if (!article) return null;
  const seo = seoDocumentSchema.parse({ locale, path: `/insights/${article.slug}`, title: article.title[locale],
    headline: article.title[locale], description: article.excerpt[locale], keywords: [article.category, "LunaBiner Insights"],
    category: article.category, pageType: "WebPage", entityType: "Article" });
  return { seo, entry: null, article };
});

export const getCaseStudySeoContent = cache(async (rawLocale: Locale, rawRoute: string) => {
  const locale = seoLocaleSchema.parse(rawLocale);
  const resolved = await resolvePublishedPortfolio(rawRoute);
  if (!resolved) return null;
  return { ...resolved, seo: seoFromPublishedEntry(resolved.entry, locale) };
});

export const getProductSeoContent = cache(async (rawLocale: Locale, rawRoute: string) => {
  const locale = seoLocaleSchema.parse(rawLocale);
  const resolved = await resolvePublishedProduct(rawRoute);
  if (!resolved) return null;
  return { ...resolved, seo: seoFromPublishedEntry(resolved.entry, locale) };
});
