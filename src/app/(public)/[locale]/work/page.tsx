import { getPublicPageSeo } from "@/features/website/seo/routes";
import { JsonLd } from "@/features/website/seo/json-ld";
import { Cta, SectionIntro } from "@/features/website/components";
import { PublishedWork } from "@/features/cms/public";
export const dynamic = "force-dynamic";
import type { Locale } from "@/features/website/content";
import { t } from "@/features/website/content";
export async function generateMetadata({ params }: { params: Promise<{ locale: Locale }> }) {
  return (await getPublicPageSeo("work", (await params).locale)).metadata;
}

export default async function Work({ params }: { params: Promise<{ locale: Locale }> }) { const { locale } = await params; const seo = await getPublicPageSeo("work", locale); return <><JsonLd data={seo.schema} /><section className="section-space border-b"><div className="site-shell"><SectionIntro as="h1" kicker="WORK" title={t(locale, "Solusi yang dibuat untuk konteks bisnis yang nyata.", "Solutions made for real business contexts.")} body={t(locale, "Kami menampilkan bentuk masalah dan pendekatan, bukan hanya daftar teknologi.", "We show the problem and the approach—not just a list of technologies.")} /></div></section><section className="section-space bg-[#EAF5F4]"><div className="site-shell"><PublishedWork locale={locale} /></div></section><Cta locale={locale} /></>; }
