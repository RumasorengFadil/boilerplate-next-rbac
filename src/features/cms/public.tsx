import Link from "next/link";
import { Suspense } from "react";
import Image from "next/image";
import { ArticleGrid } from "@/features/website/components";
import { publishedRelatedPortfolios } from "@/features/portfolio/service";
import { t, type Locale } from "@/features/website/content";
import { publishedContent, type presentContent } from "./service";
import { RichTextContent } from "./rich-text-renderer";
import { parseCoverPath } from "@/features/portfolio/cover-schema";

export function PublishedDetail({ entry, locale }: { entry: ReturnType<typeof presentContent>; locale: Locale }) {
  const text = entry.translations[locale];
  const details = entry.details;
  if (entry.kind === "CASE_STUDY") return <>
    <section className="section-space border-b"><div className="site-shell"><p className="section-kicker">{details.verifiedProject ? "CASE STUDY" : t(locale, "CONTOH ILUSTRATIF", "ILLUSTRATIVE EXAMPLE")}</p><h1 className="display-title mt-5 max-w-4xl text-4xl sm:text-6xl">{text.title}</h1><p className="mt-6 max-w-2xl text-lg leading-8 text-[#64767B]">{text.excerpt}</p></div></section>
    <article className="section-space"><div className="site-shell grid min-w-0 gap-12 lg:grid-cols-[.7fr_1.3fr]">
      <aside className="min-w-0"><p className="section-kicker">OVERVIEW</p><dl className="mt-6 grid gap-5 text-sm">
        {details.category && <div><dt className="text-[#64767B]">{t(locale, "Kategori", "Category")}</dt><dd className="mt-1 font-semibold">{details.category}</dd></div>}
        {details.tags.length > 0 && <div><dt className="text-[#64767B]">Tags</dt><dd className="mt-2 flex flex-wrap gap-2">{details.tags.map(tag => <span key={tag} className="rounded-full border px-3 py-1">{tag}</span>)}</dd></div>}
        {details.authorName && <div><dt className="text-[#64767B]">{t(locale, "Kredit", "Credit")}</dt><dd className="mt-1">{details.authorName}</dd></div>}
        {details.verifiedProject && details.client && <div><dt className="text-[#64767B]">{t(locale, "Klien", "Client")}</dt><dd className="mt-1">{details.client}</dd></div>}
      </dl></aside>
      <div className="min-w-0 space-y-8">
        {details.image && <Image src={details.image} unoptimized={Boolean(parseCoverPath(details.image))} alt={text.title} width={1200} height={675} className="w-full rounded-2xl" />}
        <RichTextContent document={text.richBody} />
        {details.features.length > 0 && <section><h2 className="text-xl font-semibold">{t(locale, "Fitur", "Features")}</h2><ul className="mt-4 list-disc pl-6">{details.features.map(item => <li key={item}>{item}</li>)}</ul></section>}
        {details.gallery.length > 0 && <div className="grid gap-4 sm:grid-cols-2">{details.gallery.map(image => <Image key={image} src={image} alt={text.title} width={800} height={500} className="rounded-xl" />)}</div>}
        {details.relatedServices.length > 0 && <Link href={`/${locale}/solutions`} className="block min-h-11 font-semibold text-[#08747A]">{t(locale, "Layanan terkait", "Related services")} →</Link>}
        {details.relatedCaseStudies.length > 0 && <Suspense fallback={null}><RelatedPortfolios ids={details.relatedCaseStudies} currentId={entry.id} locale={locale} /></Suspense>}
        <Link href={details.ctaPath.replace(/^\/(id|en)\//, `/${locale}/`)} className="inline-flex min-h-11 items-center rounded-full bg-[#F5A033] px-6 py-3 font-semibold">{details.ctaLabel[locale] || t(locale, "Diskusikan kebutuhan Anda", "Discuss your needs")} →</Link>
      </div>
    </div></article>
  </>;
  return <><section className="section-space border-b"><div className="site-shell max-w-4xl"><p className="section-kicker">{details.category || entry.kind}</p><h1 className="display-title mt-5 text-4xl sm:text-6xl">{text.title}</h1><p className="mt-6 text-lg leading-8 text-[#64767B]">{text.excerpt}</p>{details.authorName && <p className="mt-4 text-sm">{details.authorName}</p>}</div></section>
    <article className="section-space"><div className="site-shell max-w-4xl space-y-10">
      {details.image && <Image src={details.image} alt={text.title} width={1200} height={675} className="w-full rounded-2xl" />}
      <div className="space-y-5 leading-8 text-[#42565B]">{text.body.split(/\n\s*\n/).map((paragraph, index) => <p className="whitespace-pre-wrap" key={index}>{paragraph}</p>)}</div>
      {(["features", "capabilities", "technology"] as const).map(name => details[name].length > 0 && <section key={name}><h2 className="text-xl font-semibold">{name}</h2><ul className="mt-4 flex flex-wrap gap-3">{details[name].map(item => <li key={item} className="rounded-full border px-4 py-2 text-sm">{item}</li>)}</ul></section>)}
      {details.gallery.length > 0 && <div className="grid gap-4 sm:grid-cols-2">{details.gallery.map(image => <Image key={image} src={image} alt={text.title} width={800} height={500} className="rounded-xl" />)}</div>}
      {details.relatedServices.length > 0 && <Link href={`/${locale}/solutions`} className="block min-h-11 font-semibold text-[#08747A]">{t(locale,"Layanan terkait","Related services")}: {details.relatedServices.join(", ")} →</Link>}
      <Link href={details.ctaPath.replace(/^\/(id|en)\//, `/${locale}/`)} className="inline-flex min-h-11 items-center rounded-full bg-[#F5A033] px-6 py-3 font-semibold">{details.ctaLabel[locale] || t(locale,"Diskusikan kebutuhan Anda","Discuss your needs")} →</Link>
    </div></article></>;
}

export async function PublishedProducts({ locale }: { locale: Locale }) {
  const entries = await publishedContent("PRODUCT");
  if (!entries.length) return null;
  return <div className="grid gap-6 md:grid-cols-2">{entries.map(entry => <article key={entry.id} className="rounded-2xl border bg-white p-7"><p className="section-kicker">{entry.details.productStatus}</p><h2 className="mt-6 text-3xl font-semibold">{entry.translations[locale].title}</h2><p className="mt-5 leading-7 text-[#64767B]">{entry.translations[locale].excerpt}</p><ul className="mt-6 space-y-3">{entry.details.features.map(item => <li className="border-t pt-3" key={item}>{item}</li>)}</ul><Link href={entry.details.ctaPath.replace(/^\/(id|en)\//, `/${locale}/`)} className="mt-6 inline-flex min-h-11 items-center font-semibold text-[#08747A]">{entry.details.ctaLabel[locale] || t(locale,"Diskusikan produk","Discuss product")} →</Link></article>)}</div>;
}

export async function PublishedArticles({ locale }: { locale: Locale }) {
  const entries = await publishedContent("ARTICLE");
  if (!entries.length) return <ArticleGrid locale={locale} />;
  return <div className="grid gap-4 md:grid-cols-3">{entries.map(entry => <article key={entry.id} className="rounded-2xl border bg-white p-6">
    {entry.details.image && <Image src={entry.details.image} width={640} height={360} alt={entry.translations[locale].title} className="mb-5 aspect-video w-full rounded-lg object-cover" />}
    <p className="text-xs font-bold uppercase tracking-widest text-[#08747A]">{entry.details.category}</p><h3 className="mt-5 text-xl font-semibold">{entry.translations[locale].title}</h3><p className="mt-3 text-sm leading-6 text-[#64767B]">{entry.translations[locale].excerpt}</p><Link href={`/${locale}/insights/${entry.slug}`} className="mt-6 inline-flex min-h-11 items-center text-sm font-semibold text-[#08747A]">{t(locale,"Baca insight","Read insight")} →</Link>
  </article>)}</div>;
}
export async function PublishedWork({ locale }: { locale: Locale }) {
  const entries = await publishedContent("CASE_STUDY");
  if (!entries.length) return <p className="rounded-2xl border bg-white p-7 text-[#64767B]" role="status">{t(locale, "Belum ada portfolio yang dipublikasikan.", "No portfolio has been published yet.")}</p>;
  return <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">{entries.map(entry => <article key={entry.id} className="overflow-hidden rounded-2xl border bg-white transition hover:-translate-y-1 hover:shadow-xl">{entry.details.image && <Image src={entry.details.image} unoptimized={Boolean(parseCoverPath(entry.details.image))} alt={entry.translations[locale].title} width={640} height={360} className="aspect-video w-full object-cover" />}<div className="bg-gradient-to-br from-[#08747A] to-[#18B7B3] p-6 text-white"><p className="text-xs uppercase tracking-widest">{entry.details.verifiedProject ? "CASE STUDY" : t(locale,"CONTOH ILUSTRATIF","ILLUSTRATIVE EXAMPLE")}</p><p className="mt-8 text-sm">{entry.details.category}</p><h3 className="mt-2 text-xl font-semibold">{entry.translations[locale].title}</h3></div><div className="p-6"><p className="text-sm leading-6 text-[#64767B]">{entry.translations[locale].excerpt}</p><Link href={`/${locale}/work/${entry.slug}`} className="mt-6 inline-flex min-h-11 items-center font-semibold text-[#08747A]">{t(locale,"Lihat studi kasus","View case study")} →</Link></div></article>)}</div>;
}

async function RelatedPortfolios({ ids, currentId, locale }: { ids: string[]; currentId: string; locale: Locale }) {
  const entries = await publishedRelatedPortfolios(ids, currentId);
  if (!entries.length) return null;
  return <section><h2 className="text-xl font-semibold">{t(locale, "Portfolio terkait", "Related work")}</h2><ul className="mt-4 space-y-2">{entries.map(entry => <li key={entry.id}><Link href={`/${locale}/work/${entry.slug}`} className="inline-flex min-h-11 items-center font-semibold text-[#08747A]">{!entry.details.verifiedProject && t(locale, "Contoh ilustratif: ", "Illustrative example: ")}{entry.translations[locale].title} →</Link></li>)}</ul></section>;
}
