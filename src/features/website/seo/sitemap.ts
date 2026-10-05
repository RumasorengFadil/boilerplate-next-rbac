import "server-only";
import type { MetadataRoute } from "next";
import { db } from "@/lib/db";
import { publicContentWhere } from "@/features/cms/service";
import { website } from "../content";
import { seoPages } from "./registry";
import { localizedUrls } from "./metadata";

export async function buildPublicSitemap(): Promise<MetadataRoute.Sitemap> {
  // Detail routes are not limited to the first 200 cards shown in collection UI.
  const entries = await db.contentEntry.findMany({
    where: { ...publicContentWhere(), kind: { in: ["ARTICLE", "CASE_STUDY", "PRODUCT"] } },
    select: { id: true, slug: true, kind: true, updatedAt: true },
    orderBy: { id: "asc" },
  });
  const paths = new Map<string, Date | undefined>();
  for (const page of Object.values(seoPages)) paths.set(page.path, undefined);
  for (const article of website.articles) paths.set(`/insights/${article.slug}`, undefined);
  // Portfolio entries have exactly one current slug; never emit aliases or UUIDs.
  for (const entry of entries) paths.set(entry.kind === "ARTICLE" ? `/insights/${entry.slug}` : entry.kind === "PRODUCT" ? `/products/${entry.slug}` : `/work/${entry.slug}`, entry.updatedAt);
  return [...paths].flatMap(([path, modified]) => {
    const languages = localizedUrls(path);
    return (["id", "en"] as const).map(locale => ({
      url: languages[locale], alternates: { languages },
      ...(modified ? { lastModified: modified } : {}),
    }));
  });
}
