import { buildPublicSitemap } from "@/features/website/seo/sitemap";

// Publication changes must be reflected without rebuilding the application.
export const dynamic = "force-dynamic";
export default async function sitemap() {
  return buildPublicSitemap();
}
