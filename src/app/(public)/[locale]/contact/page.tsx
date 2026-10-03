import { getPublicPageSeo } from "@/features/website/seo/routes";
import { JsonLd } from "@/features/website/seo/json-ld";
import { InquiryForm, SectionIntro } from "@/features/website/components";
import { t, type Locale } from "@/features/website/content";
import { APP_CONFIG } from "@/config/app-config";
export async function generateMetadata({ params }: { params: Promise<{ locale: Locale }> }) {
  return (await getPublicPageSeo("contact", (await params).locale)).metadata;
}

export default async function Contact({ params }: { params: Promise<{ locale: Locale }> }) { const { locale } = await params; const seo = await getPublicPageSeo("contact", locale); return <><JsonLd data={seo.schema} /><section className="section-space"><div className="site-shell grid gap-12 lg:grid-cols-[.8fr_1.2fr]"><div><SectionIntro kicker="CONTACT" title={t(locale, "Ceritakan apa yang ingin Anda perbaiki.", "Tell us what you want to improve.")} body={t(locale, "Bagikan konteks bisnis dan tantangan Anda. Kami akan membantu memetakan langkah awal yang masuk akal.", "Share your business context and challenge. We will help map a sensible first step.")} /><Link href={`/${locale}/consultation`} className="mt-8 inline-flex min-h-11 items-center rounded-full bg-[#F5A033] px-5 py-3 font-semibold">{t(locale, "Jadwalkan konsultasi", "Schedule consultation")} →</Link><div className="mt-10 rounded-xl bg-[#132A32] p-6 text-white"><p className="text-sm text-[#63CEC9]">WHATSAPP</p><a href={`https://wa.me/${APP_CONFIG.whatsapp}`} className="mt-3 block text-xl font-semibold">+62 815-9370-857</a></div></div><InquiryForm locale={locale} /></div></section></>; }
import Link from "next/link";
