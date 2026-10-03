import type { Metadata } from "next";
import { z } from "zod";
import { APP_CONFIG } from "@/config/app-config";
import type { Locale } from "../content";
import { seoDocumentSchema, seoLocaleSchema, type SeoDocument } from "./contracts";

const originSchema = z.url().refine(value => {
  const url = new URL(value);
  return ["http:", "https:"].includes(url.protocol) && !url.username && !url.password && !url.search && !url.hash && url.pathname === "/";
}, "APP_CONFIG.url must be an HTTP(S) origin without credentials, query or subpath.");
export function siteOrigin() { return new URL(originSchema.parse(APP_CONFIG.url)).origin; }
export function pageUrl(locale: Locale, path: string) {
  // Validate internal paths through the same contract, including callers for alternates.
  const parsed = seoDocumentSchema.shape.path.parse(path);
  return `${siteOrigin()}/${seoLocaleSchema.parse(locale)}${parsed}`;
}
export function ogImageUrl(document: SeoDocument) {
  return `${pageUrl(document.locale, document.path)}/opengraph-image/main`;
}
export function brandedTitle(title: string) {
  return title.toLowerCase().includes(APP_CONFIG.name.toLowerCase()) ? title : `${title} | ${APP_CONFIG.name}`;
}
export function localizedUrls(path: string) {
  return { id: pageUrl("id", path), en: pageUrl("en", path), "x-default": pageUrl("id", path) };
}

export function buildMetadata(input: SeoDocument): Metadata {
  const document = seoDocumentSchema.parse(input);
  const title = brandedTitle(document.title);
  const image = { url: ogImageUrl(document), width: 1200, height: 630, alt: document.headline };
  return {
    title: { absolute: title }, description: document.description, keywords: [...new Set(document.keywords)],
    category: document.category,
    openGraph: {
      title, description: document.description, url: pageUrl(document.locale, document.path), siteName: APP_CONFIG.name,
      locale: document.locale === "id" ? "id_ID" : "en_US", alternateLocale: document.locale === "id" ? ["en_US"] : ["id_ID"],
      images: [image],
      ...(document.entityType === "Article"
        ? { type: "article" as const, ...(document.publishedAt ? { publishedTime: document.publishedAt } : {}), ...(document.modifiedAt ? { modifiedTime: document.modifiedAt } : {}) }
        : { type: "website" as const }),
    },
    twitter: { card: "summary_large_image", title, description: document.description, images: [{ url: image.url, alt: image.alt }] },
    alternates: { canonical: pageUrl(document.locale, document.path), languages: localizedUrls(document.path) },
    robots: { index: true, follow: true },
  };
}
