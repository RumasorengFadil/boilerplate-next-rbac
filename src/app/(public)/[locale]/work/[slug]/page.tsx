import { PublishedDetail } from "@/features/cms/public";
import { Cta } from "@/features/website/components";
import { type Locale } from "@/features/website/content";
import { buildSeo } from "@/features/website/seo";
import { getCaseStudySeoContent } from "@/features/website/seo/content";
import { JsonLd } from "@/features/website/seo/json-ld";
import { publicSeoLocale } from "@/features/website/seo/routes";
import { notFound, permanentRedirect } from "next/navigation";

type Props = { params: Promise<{ locale: Locale; slug: string }> };

async function resolvePage(params: Props["params"]) {
  const values = await params;
  const locale = publicSeoLocale(values.locale);
  const content = await getCaseStudySeoContent(locale, values.slug);
  if (!content) notFound();
  // Check eligibility before redirecting: no private title/slug disclosure.
  if (content.redirect) permanentRedirect(`/${locale}/work/${content.canonicalSlug}`);
  return { locale, content };
}

export async function generateMetadata({ params }: Props) {
  const { content } = await resolvePage(params);
  return buildSeo(content.seo).metadata;
}

export default async function CaseStudy({ params }: Props) {
  const { locale, content } = await resolvePage(params);
  const seo = buildSeo(content.seo);
  return (
    <>
      <JsonLd data={seo.schema} />
      <PublishedDetail entry={content.entry} locale={locale} />
      <Cta locale={locale} />
    </>
  );
}
