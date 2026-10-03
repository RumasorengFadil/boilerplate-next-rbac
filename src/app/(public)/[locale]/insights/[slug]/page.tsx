import { getArticleSeoContent } from "@/features/website/seo/content";
import { publicSeoLocale } from "@/features/website/seo/routes";
import { buildSeo } from "@/features/website/seo";
import { JsonLd } from "@/features/website/seo/json-ld";
import Link from "next/link";
import { PublishedDetail } from "@/features/cms/public";
import { ArrowLeft } from "lucide-react";
import { Cta } from "@/features/website/components";
import { type Locale } from "@/features/website/content";
import { notFound } from "next/navigation";
export async function generateMetadata({ params }: { params: Promise<{ locale: Locale; slug: string }> }) {
  const values = await params;
  const content = await getArticleSeoContent(publicSeoLocale(values.locale), values.slug);
  if (!content) notFound();
  return buildSeo(content.seo).metadata;
}
export default async function Article({ params }: { params: Promise<{ locale: Locale; slug: string }> }) { const values = await params; const locale = publicSeoLocale(values.locale); const content = await getArticleSeoContent(locale, values.slug); if (!content) notFound(); const seo = buildSeo(content.seo); if (content.entry) return <><JsonLd data={seo.schema} /><PublishedDetail entry={content.entry} locale={locale} /><Cta locale={locale} /></>; const article = content.article; if (!article) notFound(); return <><JsonLd data={seo.schema} /><article className="section-space"><div className="site-shell max-w-4xl"><Link className="inline-flex items-center gap-2 text-sm font-semibold text-[#08747A]" href={`/${locale}/insights`}><ArrowLeft size={16} /> Insights</Link><p className="mt-12 text-xs font-bold uppercase tracking-[.18em] text-[#08747A]">{article.category}</p><h1 className="display-title mt-5 max-w-3xl text-4xl leading-tight sm:text-6xl">{article.title[locale]}</h1><p className="mt-7 max-w-2xl text-xl leading-8 text-[#64767B]">{article.excerpt[locale]}</p><div className="mt-14 max-w-2xl space-y-6 leading-8 text-[#42565B]"><p>{locale === "id" ? "Keputusan teknologi yang baik dimulai dari memahami cara kerja bisnis hari ini. Sebelum memilih alat atau platform, tim perlu mengetahui proses mana yang menyita waktu, informasi apa yang dibutuhkan, dan hasil seperti apa yang ingin dicapai." : "Good technology decisions begin by understanding how the business works today. Before selecting tools or platforms, teams need to know which processes consume time, what information is needed, and what outcome they want to achieve."}</p><h2 className="text-2xl font-semibold text-[#132A32]">{locale === "id" ? "Mulai dari konteks" : "Start with context"}</h2><p>{locale === "id" ? "Mulailah dengan satu masalah yang cukup spesifik untuk diuji. Setelah alur dan data dasar jelas, solusi dapat dikembangkan secara bertahap tanpa menambah kerumitan yang belum diperlukan." : "Begin with one problem specific enough to test. Once the workflow and basic data are clear, the solution can grow in stages without adding complexity that is not yet needed."}</p></div></div></article><Cta locale={locale} /></>; }
