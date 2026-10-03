import { getPublicPageSeo } from "@/features/website/seo/routes";
import { renderOgImage } from "@/features/website/seo/og-image";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function GET(_request: Request, { params }: { params: Promise<{ locale: string }> }) {
  const { document } = await getPublicPageSeo("about", (await params).locale);
  const response = await renderOgImage(document);
  response.headers.set("Cache-Control", "no-store");
  return response;
}
