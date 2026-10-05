import { notFound, permanentRedirect } from "next/navigation";
import { getProductSeoContent } from "@/features/website/seo/content";
import { publicSeoLocale } from "@/features/website/seo/routes";
import { renderOgImage } from "@/features/website/seo/og-image";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function GET(_request: Request, { params }: { params: Promise<{ locale: string; slug: string }> }) {
  const values = await params, locale = publicSeoLocale(values.locale);
  const content = await getProductSeoContent(locale, values.slug);
  if (!content) notFound();
  if (content.redirect) permanentRedirect(`/${locale}/products/${content.canonicalSlug}/opengraph-image/main`);
  const response = await renderOgImage(content.seo);
  response.headers.set("Cache-Control", "no-store");
  return response;
}
