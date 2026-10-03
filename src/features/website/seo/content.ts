import "server-only";
import { cache } from "react";
import { z } from "zod";
import { db } from "@/lib/db";
import { presentContent, publicContentWhere } from "@/features/cms/service";
import { isPublicStatus } from "@/features/cms/schema";
import { website, type Locale } from "../content";
import { seoDocumentSchema, seoLocaleSchema, type SeoDocument } from "./contracts";

type Entry = ReturnType<typeof presentContent>;
const slugSchema = z.string().min(2).max(120).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
const caseIdSchema = z.union([z.uuid(), z.string().regex(/^[1-9]\d*$/).max(3)]);
const plainText = (value: string) => value.replace(/<[^>]*>/g, "").replace(/\s+/g, " ").trim();

export function seoFromPublishedEntry(entry: Entry, locale: Locale): SeoDocument {
  if (!isPublicStatus(entry.status, entry.publishedAt)) throw new Error("SEO requires published content.");
  const text = entry.translations[locale];
  const illustrative = entry.kind === "CASE_STUDY" && !entry.details.verifiedProject;
  const prefix = illustrative ? (locale === "id" ? "Contoh ilustratif: " : "Illustrative example: ") : "";
  if (entry.kind !== "ARTICLE" && entry.kind !== "CASE_STUDY") throw new Error("No public detail route for this content kind.");
  return seoDocumentSchema.parse({
    locale, path: entry.kind === "ARTICLE" ? `/insights/${entry.slug}` : `/work/${entry.id}`,
    title: prefix + (plainText(text.seoTitle) || plainText(text.title)), headline: prefix + plainText(text.title),
    description: plainText(text.seoDescription).length >= 10 ? plainText(text.seoDescription) : plainText(text.excerpt),
    keywords: [...new Set([entry.details.category, ...entry.details.tags].filter(Boolean))].slice(0, 30),
    category: entry.details.category || (entry.kind === "ARTICLE" ? "INSIGHTS" : "PORTFOLIO"),
    pageType: "WebPage", entityType: entry.kind === "ARTICLE" ? "Article" : "CreativeWork",
    ...(entry.kind === "ARTICLE" && entry.details.authorName ? { authorName: entry.details.authorName } : {}),
    ...(entry.publishedAt ? { publishedAt: entry.publishedAt.toISOString() } : {}),
    modifiedAt: entry.updatedAt.toISOString(), illustrative,
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

export const getCaseStudySeoContent = cache(async (rawLocale: Locale, rawId: string) => {
  const locale = seoLocaleSchema.parse(rawLocale);
  const id = caseIdSchema.safeParse(rawId);
  if (!id.success) return null;
  if (z.uuid().safeParse(id.data).success) {
    const row = await db.contentEntry.findFirst({ where: { ...publicContentWhere("CASE_STUDY"), id: id.data } });
    if (!row) return null;
    const entry = presentContent(row);
    return { seo: seoFromPublishedEntry(entry, locale), entry, project: null };
  }
  // Preserve existing public static links; do not create numeric database IDs.
  const project = website.projects[Number(id.data) - 1];
  if (!project) return null;
  const prefix = locale === "id" ? "Contoh ilustratif: " : "Illustrative example: ";
  const seo = seoDocumentSchema.parse({ locale, path: `/work/${id.data}`, title: prefix + project.title[locale],
    headline: prefix + project.title[locale], description: project.solution[locale],
    keywords: [project.industry[locale], ...project.capabilities], category: project.industry[locale],
    pageType: "WebPage", entityType: "CreativeWork", illustrative: true });
  return { seo, entry: null, project };
});
