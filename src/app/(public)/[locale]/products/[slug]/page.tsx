import { notFound, permanentRedirect } from "next/navigation";
import { publicSeoLocale } from "@/features/website/seo/routes";
import { getProductSeoContent } from "@/features/website/seo/content";
import { buildSeo } from "@/features/website/seo";
import { JsonLd } from "@/features/website/seo/json-ld";
import { ProductDetail } from "@/features/products/public";

export const dynamic = "force-dynamic";
type Props = { params: Promise<{ locale: string; slug: string }> };
async function resolvePage(params: Props["params"]) {
  const values = await params, locale = publicSeoLocale(values.locale);
  const content = await getProductSeoContent(locale, values.slug);
  if (!content) notFound();
  if (content.redirect) permanentRedirect(`/${locale}/products/${content.canonicalSlug}`);
  return { locale, content };
}
export async function generateMetadata({ params }: Props) {
  return buildSeo((await resolvePage(params)).content.seo).metadata;
}
export default async function Product({ params }: Props) {
  // Resolve eligibility and canonical before rendering: real HTTP404/308, no private disclosure.
  const { locale, content } = await resolvePage(params);
  return <><JsonLd data={buildSeo(content.seo).schema} /><ProductDetail entry={content.entry} locale={locale} /></>;
}
