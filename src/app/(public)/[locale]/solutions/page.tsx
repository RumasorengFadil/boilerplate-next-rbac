import { getPublicPageSeo } from "@/features/website/seo/routes";
import { JsonLd } from "@/features/website/seo/json-ld";
import { Cta, SectionIntro, ServiceGrid } from "@/features/website/components";
import type { Locale } from "@/features/website/content";
import { t } from "@/features/website/content";
export async function generateMetadata({ params }: { params: Promise<{ locale: Locale }> }) {
  return (await getPublicPageSeo("solutions", (await params).locale)).metadata;
}

export default async function Solutions({ params }: { params: Promise<{ locale: Locale }> }) { const { locale } = await params; const seo = await getPublicPageSeo("solutions", locale); return <><JsonLd data={seo.schema} /><section className="section-space border-b"><div className="site-shell"><SectionIntro as="h1" kicker="SOLUTIONS" title={t(locale, "Sistem digital yang dibentuk dari cara bisnis Anda bekerja.", "Digital systems shaped around how your business works.")} body={t(locale, "Kami menggabungkan capability yang tepat untuk menjawab proses, data, dan target pertumbuhan bisnis Anda.", "We combine the right capabilities to address your processes, data, and growth goals.")} /></div></section><section className="section-space bg-[#EAF5F4]"><div className="site-shell"><ServiceGrid locale={locale} /></div></section><Cta locale={locale} /></>; }
