import type { MetadataRoute } from "next";
import { siteOrigin } from "@/features/website/seo/metadata";
export default function robots(): MetadataRoute.Robots {
  return { rules: { userAgent: "*", allow: "/", disallow: ["/dashboard", "/api/"] }, sitemap: `${siteOrigin()}/sitemap.xml` };
}
