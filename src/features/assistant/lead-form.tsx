"use client";
import { useState } from "react";
export function AssistantLeadForm({ conversationId, language, challenge }: { conversationId: string; language: "id" | "en"; challenge: string }) {
  const [status, setStatus] = useState(""); const [pending, setPending] = useState(false); const [sent, setSent] = useState(false);
  const label = (id: string, en: string) => language === "id" ? id : en;
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setPending(true); const data = new FormData(event.currentTarget);
    try {
      const response = await fetch("/api/assistant/leads", { method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...Object.fromEntries(data), consent: data.get("consent") === "on", conversationId, language }) });
      if (!response.ok) throw new Error();
      setSent(true); setStatus(label("Kebutuhan Anda sudah diteruskan ke tim LunaBiner.", "Your request has been sent to LunaBiner."));
    } catch { setStatus(label("Belum terkirim. Periksa data dan coba lagi.", "Not sent. Check your information and retry.")); }
    finally { setPending(false); }
  }
  return <form onSubmit={submit} className="space-y-3 rounded-xl border p-3">
    <p className="text-sm font-semibold">{label("Diskusikan kebutuhan Anda", "Discuss your needs")}</p>
    {!sent && <>
      <label className="block text-xs">{label("Nama", "Name")} *<input name="name" required minLength={2} maxLength={100} className="input mt-1" /></label>
      <label className="block text-xs">Email *<input name="email" type="email" required className="input mt-1" /></label>
      <label className="block text-xs">{label("Perusahaan", "Company")}<input name="company" maxLength={120} className="input mt-1" /></label>
      <label className="block text-xs">WhatsApp<input name="phone" maxLength={30} className="input mt-1" /></label>
      <label className="block text-xs">{label("Layanan", "Service")}<select name="serviceInterest" className="input mt-1"><option value="">{label("Belum yakin", "Not sure yet")}</option>{["Software Development","Business Automation","AI Solutions","Data & Integration"].map(x=><option key={x}>{x}</option>)}</select></label>
      <label className="block text-xs">{label("Tantangan bisnis", "Business challenge")} *<textarea name="challenge" required minLength={10} maxLength={2000} defaultValue={challenge} className="input mt-1" /></label>
      <label className="flex min-h-11 items-start gap-2 text-xs leading-5"><input type="checkbox" name="consent" required className="mt-1" />{label("Saya setuju tim LunaBiner menerima informasi dan menghubungi saya tentang kebutuhan ini.", "I agree to share this information with LunaBiner and be contacted about this request.")}</label>
      <button disabled={pending} className="min-h-11 rounded-full bg-[#F5A033] px-4 text-sm font-semibold disabled:opacity-50">{pending ? "…" : label("Kirim kebutuhan", "Send request")}</button>
    </>}
    <p role="status" className="text-xs">{status}</p>
  </form>;
}
