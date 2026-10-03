import Link from "next/link";
import Image from "next/image";
import { ArticleGrid, WorkGrid } from "@/features/website/components";
import { t, type Locale } from "@/features/website/content";
import { publishedContent, type presentContent } from "./service";

export function PublishedDetail({ entry, locale }: { entry: ReturnType<typeof presentContent>; locale: Locale }) {
  const text = entry.translations[locale];
  const details = entry.details;
  return <><section className="section-space border-b"><div className="site-shell max-w-4xl"><p className="section-kicker">{entry.kind === "CASE_STUDY" && !details.verifiedProject ? t(locale,"CONTOH ILUSTRATIF","ILLUSTRATIVE EXAMPLE") : details.category || entry.kind}</p><h1 className="display-title mt-5 text-4xl sm:text-6xl">{text.title}</h1><p className="mt-6 text-lg leading-8 text-[#64767B]">{text.excerpt}</p>{details.authorName && <p className="mt-4 text-sm">{details.authorName}</p>}</div></section>
    <article className="section-space"><div className="site-shell max-w-4xl space-y-10">
      {details.image && <Image src={details.image} alt={text.title} width={1200} height={675} className="w-full rounded-2xl" />}
      <div className="space-y-5 leading-8 text-[#42565B]">{text.body.split(/\n\s*\n/).map((paragraph, index) => <p className="whitespace-pre-wrap" key={index}>{paragraph}</p>)}</div>
      {entry.kind === "CASE_STUDY" && <>{(["industry", "challenge", "approach", "solution", "impact", "before", "after", "architecture"] as const).map(name => details[name][locale] && <section key={name}><h2 className="text-2xl font-semibold">{name}</h2><p className="mt-4 whitespace-pre-wrap leading-7 text-[#64767B]">{details[name][locale]}</p></section>)}{details.verifiedProject && details.client && <p>{t(locale,"Klien","Client")}: {details.client}</p>}</>}
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
  if (!entries.length) return <WorkGrid locale={locale} />;
  return <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">{entries.map(entry => <article key={entry.id} className="overflow-hidden rounded-2xl border bg-white transition hover:-translate-y-1 hover:shadow-xl"><div className="bg-gradient-to-br from-[#08747A] to-[#18B7B3] p-6 text-white"><p className="text-xs uppercase tracking-widest">{entry.details.verifiedProject ? "CASE STUDY" : t(locale,"CONTOH ILUSTRATIF","ILLUSTRATIVE EXAMPLE")}</p><p className="mt-8 text-sm">{entry.details.industry[locale]}</p><h3 className="mt-2 text-xl font-semibold">{entry.translations[locale].title}</h3></div><div className="p-6"><p className="text-sm leading-6 text-[#64767B]">{entry.translations[locale].excerpt}</p><Link href={`/${locale}/work/${entry.id}`} className="mt-6 inline-flex min-h-11 items-center font-semibold text-[#08747A]">{t(locale,"Lihat studi kasus","View case study")} →</Link></div></article>)}</div>;
}
