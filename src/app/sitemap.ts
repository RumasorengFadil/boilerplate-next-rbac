import type { MetadataRoute } from "next";
import { APP_CONFIG } from "@/config/app-config";
const paths = ["", "/solutions", "/work", "/products", "/insights", "/about", "/contact"];
export default function sitemap(): MetadataRoute.Sitemap { return ["id", "en"].flatMap(locale => paths.map(path => ({ url: `${APP_CONFIG.url}/${locale}${path}`, lastModified: new Date(), changeFrequency: "monthly" as const, priority: path === "" ? 1 : 0.7 }))); }
