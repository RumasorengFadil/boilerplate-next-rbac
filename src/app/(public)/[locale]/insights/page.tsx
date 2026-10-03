import { getPublicPageSeo } from "@/features/website/seo/routes";
import { JsonLd } from "@/features/website/seo/json-ld";
import { Cta, SectionIntro } from "@/features/website/components";
import { PublishedArticles } from "@/features/cms/public";
export const dynamic = "force-dynamic";
import { t, type Locale } from "@/features/website/content";
export async function generateMetadata({ params }: { params: Promise<{ locale: Locale }> }) {
  return (await getPublicPageSeo("insights", (await params).locale)).metadata;
}

export default async function Insights({ params }: { params: Promise<{ locale: Locale }> }) { const { locale } = await params; const seo = await getPublicPageSeo("insights", locale); return <><JsonLd data={seo.schema} /><section className="section-space border-b"><div className="site-shell"><SectionIntro kicker="INSIGHTS" title={t(locale, "Catatan praktis tentang teknologi yang bekerja untuk bisnis.", "Practical notes on technology that works for business.")} body={t(locale, "Perspektif tentang AI, automation, software engineering, data, dan transformasi digital.", "Perspectives on AI, automation, software engineering, data, and digital transformation.")} /></div></section><section className="section-space bg-[#EAF5F4]"><div className="site-shell"><PublishedArticles locale={locale} /></div></section><Cta locale={locale} /></>; }
