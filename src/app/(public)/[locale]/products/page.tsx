import { getPublicPageSeo, publicSeoLocale } from "@/features/website/seo/routes";
import { getPageSeo } from "@/features/website/seo";
import { JsonLd } from "@/features/website/seo/json-ld";
import { Cta, SectionIntro } from "@/features/website/components";
import { t, type Locale } from "@/features/website/content";
import { publishedProducts } from "@/features/products/public-data";
import { ProductGrid } from "@/features/products/public";
import { Suspense } from "react";
export const dynamic = "force-dynamic";
export async function generateMetadata({ params }: { params: Promise<{ locale: Locale }> }) {
  return getPageSeo("products", publicSeoLocale((await params).locale)).metadata;
}

async function ProductResults({ locale }: { locale: Locale }) {
  let entries: Awaited<ReturnType<typeof publishedProducts>> = [], failed = false;
  let seo = getPageSeo("products", locale);
  try {
    entries = await publishedProducts();
    seo = await getPublicPageSeo("products", locale);
  } catch {
    failed = true;
  }
  const content = failed ? <p role="alert" className="rounded-2xl border bg-white p-7 text-[#64767B]">{t(locale, "Produk belum dapat dimuat. Silakan coba kembali nanti.", "Products could not be loaded. Please try again later.")}</p> : <ProductGrid entries={entries} locale={locale} />;
  return <><JsonLd data={seo.schema} />{content}</>;
}

export default async function Products({ params }: { params: Promise<{ locale: Locale }> }) {
  const locale = publicSeoLocale((await params).locale);
  return <>
    <section className="section-space border-b"><div className="site-shell"><SectionIntro as="h1" kicker="LUNABINER LABS" title={t(locale, "Produk untuk kebutuhan bisnis yang terus berkembang.", "Products for evolving business needs.")} body={t(locale, "Jelajahi produk LunaBiner dan lihat kesiapan masing-masing sebelum mendiskusikan kebutuhan Anda.", "Explore LunaBiner products and their readiness before discussing your needs.")} /></div></section>
    <section className="section-space bg-[#EAF5F4]"><div className="site-shell"><Suspense fallback={<p role="status" className="rounded-2xl border bg-white p-7 text-[#64767B]">{t(locale, "Memuat produk…", "Loading products…")}</p>}><ProductResults locale={locale} /></Suspense></div></section>
    <Cta locale={locale} />
  </>;
}
