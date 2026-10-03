"use client";
import { Bot, MessageCircle, Send, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { AssistantLeadForm } from "./lead-form";
import type { Locale } from "@/features/website/content";
type Recommendation = { title: string; href: string };
type Message = { id: string; role: "USER" | "ASSISTANT"; content: string; metadata?: { recommendations?: Recommendation[] } };
type Event = { delta?: string; answer?: string; error?: string; conversationId?: string; recommendations?: Recommendation[]; offerLead?: boolean };
const storageKey = "lunabiner-ai-conversation";
export function SolutionAssistant({ locale = "id" }: { locale?: Locale }) {
  const [open, setOpen] = useState(false);
  const [prompt, setPrompt] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [pending, setPending] = useState(false);
  const [restoring, setRestoring] = useState(true);
  const [error, setError] = useState("");
  const [leadOpen, setLeadOpen] = useState(false);
  const [conversationId, setConversationId] = useState<string>();
  const lastPrompt = useRef("");
  const label = (id: string, en: string) => locale === "id" ? id : en;
  useEffect(() => {
    let live = true;
    const id = sessionStorage.getItem(storageKey);
    if (!id) { queueMicrotask(() => { if (live) setRestoring(false); }); return () => { live = false; }; }
    fetch("/api/assistant/conversations/" + id).then(async response => {
      if (response.status === 404) { sessionStorage.removeItem(storageKey); return; }
      if (!response.ok) throw new Error();
      const data = await response.json();
      if (live) { setMessages(data.messages); setConversationId(id); }
    }).catch(() => { if (live) setError("Riwayat belum dapat dimuat. Coba kembali."); })
      .finally(() => { if (live) setRestoring(false); });
    return () => { live = false; };
  }, []);
  function newConversation() { sessionStorage.removeItem(storageKey); setConversationId(undefined); setMessages([]); setError(""); setLeadOpen(false); }
  async function submit(value = prompt) {
    if (value.trim().length < 8 || pending || restoring) return;
    setError(""); setPending(true); setPrompt(""); lastPrompt.current = value;
    const userId = crypto.randomUUID(); const replyId = crypto.randomUUID();
    setMessages(current => [...current, { id: userId, role: "USER", content: value }, { id: replyId, role: "ASSISTANT", content: "" }]);
    function update(event: Event) {
      if (event.conversationId) { sessionStorage.setItem(storageKey, event.conversationId); setConversationId(event.conversationId); }
      if (event.error) throw new Error(event.error);
      if (event.offerLead) setLeadOpen(true);
      setMessages(current => current.map(x => x.id === replyId ? { ...x,
        content: event.answer ?? (x.content + (event.delta ?? "")),
        metadata: event.recommendations ? { recommendations: event.recommendations } : x.metadata } : x));
    }
    try {
      const response = await fetch("/api/assistant/chat", { method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: value, conversationId, language: locale }) });
      if (response.headers.get("content-type")?.includes("ndjson")) {
        const reader = response.body!.getReader(); const decoder = new TextDecoder(); let buffer = "";
        while (true) { const { done, value: bytes } = await reader.read(); if (done) break;
          buffer += decoder.decode(bytes, { stream: true }); const lines = buffer.split("\n"); buffer = lines.pop() ?? "";
          for (const line of lines) if (line.trim()) update(JSON.parse(line));
        }
      } else {
        const data = await response.json(); update(data);
        if (!response.ok) throw new Error();
      }
    } catch { setError(label("Pesan belum berhasil diproses. Coba lagi atau mulai percakapan baru.", "The message could not be processed. Retry or start a new conversation.")); }
    finally { setPending(false); }
  }
  return <div className="fixed bottom-5 right-5 z-50">
    <button aria-expanded={open} onClick={() => setOpen(!open)} className="inline-flex min-h-11 items-center gap-2 rounded-full bg-[#08747A] px-5 py-3 text-sm font-semibold text-white shadow-lg">{open ? <X size={17} /> : <MessageCircle size={17} />} LunaBiner AI</button>
    {open && <section aria-label="LunaBiner AI" className="absolute bottom-14 right-0 flex max-h-[80dvh] w-[calc(100vw-2.5rem)] max-w-sm flex-col overflow-hidden rounded-2xl border bg-white shadow-2xl">
      <header className="flex items-center justify-between bg-[#132A32] px-4 py-3 text-white"><div className="flex items-center gap-2"><Bot size={20} /><p className="font-semibold">LunaBiner AI</p></div><button disabled={pending} onClick={newConversation} className="min-h-11 px-2 text-xs underline">{label("Percakapan baru", "New chat")}</button></header>
      <div className="min-h-0 space-y-3 overflow-auto p-4">
        {restoring ? <p role="status">{label("Memuat riwayat…","Loading history…")}</p> : messages.length ? messages.map(message => <div key={message.id}><div className={`whitespace-pre-wrap rounded-xl p-3 text-sm leading-6 ${message.role === "USER" ? "ml-8 bg-[#08747A] text-white" : "mr-4 bg-[#EAF5F4] text-[#42565B]"}`}>{message.content || (pending ? "…" : "")}</div>{message.metadata?.recommendations?.map(item => <a key={item.href+item.title} href={item.href.replace(/^\/en/, "/"+locale)} className="mt-2 block rounded-lg border p-3 text-xs font-medium text-[#08747A]">{item.title} →</a>)}</div>) : <><p className="text-sm text-[#64767B]">{label("Ceritakan tantangan bisnis Anda.", "Tell us your business challenge.")}</p>{[label("Saya ingin mengotomatisasi proses manual", "I want to automate a manual process"),label("Saya butuh sistem internal bisnis", "I need an internal business system"),label("Bagaimana AI membantu perusahaan saya?", "How can AI help my company?")].map(item => <button disabled={pending} key={item} onClick={() => submit(item)} className="block min-h-11 w-full rounded-lg border p-3 text-left text-xs">{item}</button>)}</>}
        {error && <div role="alert" className="text-sm text-red-700">{error}<button onClick={() => submit(lastPrompt.current)} disabled={pending} className="block min-h-11 underline">{label("Coba lagi", "Retry")}</button></div>}
        {conversationId && <><button onClick={() => setLeadOpen(!leadOpen)} className="min-h-11 text-sm font-semibold text-[#08747A]">{label("Diskusikan dengan tim", "Discuss with the team")}</button>{leadOpen && <AssistantLeadForm conversationId={conversationId} language={locale} challenge={messages.findLast(x => x.role === "USER")?.content ?? ""} />}</>}
        <a href={"/"+locale+"/contact"} className="block min-h-11 pt-3 text-xs text-[#08747A]">{label("Konsultasi dengan LunaBiner", "Consult LunaBiner")} →</a>
      </div>
      <form onSubmit={event => { event.preventDefault(); submit(); }} className="flex gap-2 border-t p-3"><input aria-label={label("Pesan", "Message")} required minLength={8} maxLength={1000} disabled={pending || restoring} value={prompt} onChange={event => setPrompt(event.target.value)} className="input" placeholder={label("Tulis tantangan Anda", "Describe your challenge")} /><button disabled={pending || restoring} aria-label="Send" className="grid h-11 w-11 shrink-0 place-items-center rounded-lg bg-[#F5A033] disabled:opacity-50"><Send size={16} /></button></form>
    </section>}
  </div>;
}
