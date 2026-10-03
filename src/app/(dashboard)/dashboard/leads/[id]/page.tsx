import Link from "next/link";
import { z } from "zod";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { requirePermission } from "@/server/authorization";
import { hasPermission } from "@/lib/permissions";
import { LeadControls, LeadNoteForm } from "@/features/leads/forms";
export default async function LeadDetail({ params }: { params: Promise<{ id: string }> }) {
  const user = await requirePermission("leads:read");
  const { id } = await params; if (!z.uuid().safeParse(id).success) notFound();
  const lead = await db.lead.findUnique({ where: { id }, include: { notes: { orderBy: { createdAt: "desc" }, take: 100, include: { author: { select: { name: true } } } }, activities: { orderBy: { createdAt: "desc" }, take: 100, include: { actor: { select: { name: true } } } } } });
  if (!lead) notFound();
  const owners = await db.user.findMany({ where: { role: { in: ["SUPER_ADMIN", "ADMIN", "MARKETING", "SALES"] } }, select: { id: true, name: true }, orderBy: { name: "asc" } });
  const transcript = lead.conversationId ? await db.aiMessage.findMany({ where: { conversationId: lead.conversationId }, select: { id: true, role: true, content: true }, orderBy: { createdAt: "asc" }, take: 100 }) : [];
  return <section><Link href="/dashboard/leads" className="inline-flex min-h-11 items-center text-sm text-teal-700">← Lead</Link><h1 className="page-title">{lead.name}</h1>
    <div className="mt-6 grid gap-6 lg:grid-cols-[1.5fr_1fr]"><div className="space-y-6"><article className="card"><h2 className="font-semibold">Informasi kebutuhan</h2><dl className="mt-4 grid gap-4 sm:grid-cols-2">{Object.entries({ Perusahaan: lead.company, Email: lead.email, Telepon: lead.phone, Layanan: lead.serviceInterest, Anggaran: lead.budget, Timeline: lead.timeline, Sumber: lead.source, Halaman: lead.sourcePage, Bahasa: lead.language, Status: lead.status, Score: String(lead.score), Consent: lead.consentAt.toISOString() }).map(([label,value]) => <div key={label}><dt className="text-sm text-slate-500">{label}</dt><dd className="mt-1 break-words">{value || "—"}</dd></div>)}</dl><p className="mt-6 whitespace-pre-wrap leading-7">{lead.challenge}</p></article>
      <section className="card"><h2 className="font-semibold">Catatan internal</h2>{lead.notes.map(note => <article className="mt-4 border-t pt-4" key={note.id}><p className="whitespace-pre-wrap">{note.body}</p><p className="mt-2 text-xs text-slate-500">{note.author?.name ?? "Akun dihapus"} · {note.createdAt.toISOString()}</p></article>)}{!lead.notes.length && <p className="mt-3 text-sm">Belum ada catatan.</p>}</section>
      <section className="card"><h2 className="font-semibold">Timeline</h2>{lead.activities.map(activity => <p className="mt-3 text-sm" key={activity.id}>{activity.createdAt.toISOString()} · {activity.action} · {activity.actor?.name ?? "Visitor"}</p>)}</section>
      {transcript.length > 0 && <details className="card"><summary className="min-h-11 cursor-pointer font-semibold">Percakapan AI terkait</summary>{transcript.map(message => <p className="mt-4 whitespace-pre-wrap rounded-lg bg-slate-50 p-3 text-sm" key={message.id}>{message.role}: {message.content}</p>)}</details>}
    </div>{hasPermission(user.role, "leads:write") && <aside className="space-y-6"><LeadControls id={id} version={lead.version} status={lead.status} ownerId={lead.ownerId} owners={owners} /><LeadNoteForm id={id} /></aside>}</div>
  </section>;
}
