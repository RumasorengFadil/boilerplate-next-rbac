"use client";

import { useParams } from "next/navigation";
import { t } from "@/features/website/content";

export default function WorkError({ reset }: { reset: () => void }) {
  const params = useParams();
  const locale = params.locale === "en" ? "en" : "id";
  return <section className="section-space"><div className="site-shell">
    <h1 className="display-title text-3xl">{t(locale, "Portfolio belum dapat dimuat", "Portfolio could not be loaded")}</h1>
    <p className="mt-4 text-[#64767B]" role="alert">{t(locale, "Terjadi kendala saat mengambil data. Silakan coba kembali.", "There was a problem loading the data. Please try again.")}</p>
    <button onClick={reset} className="mt-6 min-h-11 rounded-full bg-[#F5A033] px-6 py-3 font-semibold">{t(locale, "Coba kembali", "Try again")}</button>
  </div></section>;
}
