import { notFound } from "next/navigation";
import { getArticleSeoContent } from "@/features/website/seo/content";
import { publicSeoLocale } from "@/features/website/seo/routes";
import { renderOgImage } from "@/features/website/seo/og-image";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function GET(_request: Request, { params }: { params: Promise<{ locale: string; slug: string }> }) {
  const values = await params;
  const content = await getArticleSeoContent(publicSeoLocale(values.locale), values.slug);
  if (!content) notFound();
  const document = content.seo;
  const response = await renderOgImage(document);
  response.headers.set("Cache-Control", "no-store");
  return response;
}
