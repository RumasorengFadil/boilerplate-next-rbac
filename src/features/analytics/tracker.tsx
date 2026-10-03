"use client";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { publicPathSchema } from "./schema";
import { t, type Locale } from "@/features/website/content";
const consentKey = "lunabiner-analytics-consent";
export function AnalyticsTracker({ locale }: { locale: Locale }) {
  const path = usePathname();
  const [consent, setConsent] = useState<string | null>("loading");
  useEffect(() => { queueMicrotask(() => setConsent(localStorage.getItem(consentKey))); }, []);
  useEffect(() => {
    if (consent !== "accepted" || !publicPathSchema.safeParse(path).success) return;
    const send = (kind: string, target?: string) => { void fetch("/api/analytics/events", { method: "POST", keepalive: true, headers: { "Content-Type": "application/json" }, body: JSON.stringify({ consent: true, kind, path, language: locale, ...(target ? { target } : {}) }) }).catch(() => undefined); };
    send("PAGE_VIEW");
    const click = (event: MouseEvent) => {
      const element = event.target instanceof Element ? event.target.closest("a,button") : null;
      if (!element) return;
      if (element instanceof HTMLAnchorElement) {
        const url = new URL(element.href, location.origin);
        if (url.hostname === "wa.me") send("WHATSAPP_CLICK");
        else if (url.origin === location.origin && publicPathSchema.safeParse(url.pathname).success) send("CTA_CLICK", url.pathname);
      } else if (element.textContent?.includes("LunaBiner AI") && element.getAttribute("aria-expanded") === "false") send("AI_OPEN");
    };
    document.addEventListener("click", click); return () => document.removeEventListener("click", click);
  }, [consent, path, locale]);
  function choose(value: string) { localStorage.setItem(consentKey,value); setConsent(value); if (value !== "accepted") void fetch("/api/analytics/consent", { method: "DELETE" }).catch(()=>undefined); }
  if (consent === "loading") return null;
  if (consent) return <button onClick={()=>setConsent(null)} className="fixed bottom-1 left-2 z-40 min-h-11 rounded-md border bg-white/95 px-3 text-xs text-[#64767B]">{t(locale,"Privasi analytics","Analytics privacy")}</button>;
  return <aside aria-label="Analytics privacy" className="fixed bottom-20 left-4 right-4 z-50 max-w-sm rounded-2xl border bg-white p-5 shadow-lg"><p className="text-sm leading-6">{t(locale,"Izinkan analytics penggunaan untuk membantu meningkatkan website dan mengukur konversi? Kami tidak merekam isi form atau chat dalam event analytics.","Allow usage analytics to improve the website and measure conversions? Analytics events do not record form or chat content.")}</p><div className="mt-4 flex flex-wrap gap-3"><button className="min-h-11 rounded-lg bg-[#08747A] px-4 text-sm text-white" onClick={()=>choose("accepted")}>{t(locale,"Izinkan","Allow")}</button><button className="min-h-11 rounded-lg border px-4 text-sm" onClick={()=>choose("declined")}>{t(locale,"Tolak","Decline")}</button></div></aside>;
}
