import { notFound, permanentRedirect } from "next/navigation";
import { getCaseStudySeoContent } from "@/features/website/seo/content";
import { publicSeoLocale } from "@/features/website/seo/routes";
import { renderOgImage } from "@/features/website/seo/og-image";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function GET(_request: Request, { params }: { params: Promise<{ locale: string; slug: string }> }) {
  const values = await params;
  const locale = publicSeoLocale(values.locale);
  const content = await getCaseStudySeoContent(locale, values.slug);
  if (!content) notFound();
  if (content.redirect) permanentRedirect(`/${locale}/work/${content.canonicalSlug}/opengraph-image/main`);
  const document = content.seo;
  const response = await renderOgImage(document);
  response.headers.set("Cache-Control", "no-store");
  return response;
}
