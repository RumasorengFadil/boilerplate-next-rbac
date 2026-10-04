import { getPublicPageSeo, publicSeoLocale } from "@/features/website/seo/routes";
import { JsonLd } from "@/features/website/seo/json-ld";
import { Cta, SectionIntro } from "@/features/website/components";
import { PublishedWork } from "@/features/cms/public";
import { Suspense } from "react";
import { getPageSeo } from "@/features/website/seo";
export const dynamic = "force-dynamic";
import type { Locale } from "@/features/website/content";
import { t } from "@/features/website/content";
export async function generateMetadata({ params }: { params: Promise<{ locale: Locale }> }) {
  return getPageSeo("work", publicSeoLocale((await params).locale)).metadata;
}

async function WorkSchema({ locale }: { locale: Locale }) {
  const seo = await getPublicPageSeo("work", locale);
  // Metadata and collection schema use the same stable page description.
  return <JsonLd data={seo.schema} />;
}

export default async function Work({ params }: { params: Promise<{ locale: Locale }> }) {
  const locale = publicSeoLocale((await params).locale);
  return <>
    <section className="section-space border-b"><div className="site-shell"><SectionIntro as="h1" kicker="WORK" title={t(locale, "Solusi yang dibuat untuk konteks bisnis yang nyata.", "Solutions made for real business contexts.")} body={t(locale, "Kami menampilkan bentuk masalah dan pendekatan, bukan hanya daftar teknologi.", "We show the problem and the approach—not just a list of technologies.")} /></div></section>
    <section className="section-space bg-[#EAF5F4]"><div className="site-shell">
      <Suspense fallback={<p role="status" className="rounded-2xl border bg-white p-7 text-[#64767B]">{t(locale, "Memuat portfolio…", "Loading portfolio…")}</p>}>
        <PublishedWork locale={locale} /><WorkSchema locale={locale} />
      </Suspense>
    </div></section>
    <Cta locale={locale} />
  </>;
}
