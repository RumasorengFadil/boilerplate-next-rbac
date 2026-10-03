import { getPublicPageSeo } from "@/features/website/seo/routes";
import { JsonLd } from "@/features/website/seo/json-ld";
import Link from "next/link";
import {availableSlots} from "@/features/scheduling/service";
import {BookingForm} from "@/features/scheduling/form";
import {SectionIntro} from "@/features/website/components";
import {t,type Locale} from "@/features/website/content";
export const dynamic="force-dynamic";
export async function generateMetadata({ params }: { params: Promise<{ locale: Locale }> }) {
  return (await getPublicPageSeo("consultation", (await params).locale)).metadata;
}

export default async function ConsultationPage({params}:{params:Promise<{locale:Locale}>}){
  const{locale}=await params;const seo=await getPublicPageSeo("consultation",locale);const slots=await availableSlots().catch(()=>null);
  return <><JsonLd data={seo.schema} /><section className="section-space"><div className="site-shell grid gap-10 lg:grid-cols-[.8fr_1.2fr]"><div><SectionIntro as="h1" kicker="CONSULTATION" title={t(locale,"Temukan langkah awal yang tepat.","Find the right first step.")} body={t(locale,"Pilih layanan dan jadwal yang tersedia untuk mendiskusikan tantangan bisnis bersama LunaBiner.","Choose a service and available time to discuss your business challenge with LunaBiner.")}/><p className="mt-6 text-sm leading-7 text-slate-600">{t(locale,"Waktu ditampilkan sesuai zona waktu pilihan Anda. Tidak ada komitmen harga, scope, atau timeline proyek pada saat booking.","Times follow your selected timezone. Booking makes no commitment on project pricing, scope, or delivery dates.")}</p><Link href={`/${locale}/contact`} className="mt-6 inline-flex min-h-11 items-center font-semibold text-[#08747A]">{t(locale,"Atau kirim inquiry","Or send an inquiry")} →</Link></div>{slots ? <BookingForm locale={locale} slots={slots.map(slot=>({...slot,startsAt:slot.startsAt.toISOString(),endsAt:slot.endsAt.toISOString()}))}/> : <div className="rounded-2xl border bg-white p-6" role="status">{t(locale,"Ketersediaan belum dapat dimuat. Coba kembali atau hubungi tim melalui kontak.","Availability could not be loaded. Retry or contact the team.")}</div>}</div></section></>;
}
