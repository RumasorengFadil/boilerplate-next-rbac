import Image from "next/image";
import Link from "next/link";
import { type Locale, t } from "../website/content";
import { parseProductCoverPath } from "./cover-schema";
import { productCtaHref } from "./cta-schema";
import type { presentProduct } from "./service";

type Product = ReturnType<typeof presentProduct>;
export const readinessLabel = (status: Product["details"]["productStatus"], locale: Locale) => ({
  COMING_SOON: t(locale, "Segera hadir", "Coming soon"), BETA: "Beta", LIVE: t(locale, "Tersedia", "Available"),
})[status];
function Readiness({ entry, locale }: { entry: Product; locale: Locale }) {
  return <span className="inline-flex rounded-full bg-[#EAF5F4] px-3 py-1 text-xs font-semibold text-[#08747A]">{readinessLabel(entry.details.productStatus, locale)}</span>;
}
export function ProductGrid({ entries, locale }: { entries: Product[]; locale: Locale }) {
  if (!entries.length) return <p role="status" className="rounded-2xl border bg-white p-7 text-[#64767B]">{t(locale, "Belum ada produk yang dipublikasikan.", "No products have been published yet.")}</p>;
  return <div className="grid gap-6 md:grid-cols-2">{entries.map(entry => {
    const text = entry.translations[locale], features = entry.details.productFeatures?.[locale] ?? entry.details.features;
    return <article key={entry.id} className="min-w-0 rounded-2xl border bg-white p-7">
      {entry.details.image && <Image src={entry.details.image} unoptimized={Boolean(parseProductCoverPath(entry.details.image))} alt={text.title} width={640} height={360} className="mb-6 aspect-video w-full rounded-xl object-cover" />}
      <Readiness entry={entry} locale={locale} />
      <h2 className="mt-6 break-words text-3xl font-semibold tracking-[-.04em]"><Link href={`/${locale}/products/${entry.slug}`}>{text.title}</Link></h2>
      <p className="mt-5 break-words whitespace-pre-wrap leading-7 text-[#64767B]">{text.excerpt}</p>
      {features.length > 0 && <ul className="mt-6 space-y-3 text-sm">{features.map((item, index) => <li className="break-words border-t pt-3" key={index}>{item}</li>)}</ul>}
      <Link href={`/${locale}/products/${entry.slug}`} className="mt-6 inline-flex min-h-11 items-center font-semibold text-[#08747A]">{t(locale, "Lihat detail produk", "View product details")} →</Link>
    </article>;
  })}</div>;
}
export function ProductDetail({ entry, locale }: { entry: Product; locale: Locale }) {
  const text = entry.translations[locale], details = entry.details;
  const features = details.productFeatures?.[locale] ?? details.features;
  const cta = details.productCta!;
  return <>
    <section className="section-space border-b"><div className="site-shell">
      <Link href={`/${locale}/products`} className="inline-flex min-h-11 items-center text-sm font-semibold text-[#08747A]">← {t(locale, "Semua produk", "All products")}</Link>
      <div className="mt-5"><Readiness entry={entry} locale={locale} /></div>
      <h1 className="display-title mt-5 max-w-4xl break-words text-4xl sm:text-6xl">{text.title}</h1>
      <p className="mt-6 max-w-2xl break-words whitespace-pre-wrap text-lg leading-8 text-[#64767B]">{text.excerpt}</p>
    </div></section>
    <section className="section-space"><div className="site-shell grid min-w-0 gap-10 lg:grid-cols-[1.3fr_.7fr]">
      <div className="min-w-0 space-y-8">
        {details.image && <Image src={details.image} unoptimized={Boolean(parseProductCoverPath(details.image))} alt={text.title} width={1200} height={675} className="aspect-video w-full rounded-2xl object-contain bg-[#EAF5F4]" />}
        {features.length > 0 && <section><h2 className="text-xl font-semibold">{t(locale, "Fitur produk", "Product features")}</h2><ul className="mt-5 grid gap-3 sm:grid-cols-2">{features.map((feature, index) => <li key={index} className="min-w-0 break-words rounded-xl border p-5 text-sm leading-6">{feature}</li>)}</ul></section>}
      </div>
      <aside className="h-fit min-w-0 rounded-2xl border bg-[#F4F9F8] p-7">
        <h2 className="text-xl font-semibold">{t(locale, "Diskusikan kebutuhan Anda", "Discuss your needs")}</h2>
        <p className="mt-4 text-sm leading-7 text-[#64767B]">{t(locale, "Hubungi tim LunaBiner untuk membahas kesesuaian produk dan kebutuhan bisnis Anda.", "Talk to the LunaBiner team about product fit and your business needs.")}</p>
        <Link href={productCtaHref(cta, locale)} {...(cta.type === "external" ? { target: "_blank", rel: "noopener noreferrer" } : {})} className="mt-6 inline-flex min-h-11 max-w-full items-center break-words rounded-full bg-[#F5A033] px-6 py-3 font-semibold">{details.ctaLabel[locale] || t(locale, "Diskusikan produk", "Discuss product")} →</Link>
        {details.productStatus === "COMING_SOON" && <p className="mt-5 text-xs leading-6 text-[#64767B]">{t(locale, "Produk masih berupa konsep. Ketersediaan dan detail pengembangan perlu dikonfirmasi dengan tim.", "This product is still a concept. Confirm availability and development details with the team.")}</p>}
      </aside>
    </div></section>
  </>;
}
