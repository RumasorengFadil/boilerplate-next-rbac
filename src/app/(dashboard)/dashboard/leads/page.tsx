import { requirePermission } from "@/server/authorization";
import { db } from "@/lib/db";
export default async function LeadsPage() {
  await requirePermission("ai:manage");
  const leads = await db.lead.findMany({ orderBy: { createdAt: "desc" }, take: 100 });
  return <section><h1 className="page-title">Lead LunaBiner AI</h1><div className="mt-6 grid gap-4">{leads.map(lead => <article key={lead.id} className="card"><div className="flex flex-wrap justify-between gap-3"><h2 className="font-semibold">{lead.name} · {lead.company || "Individual"}</h2><p className="text-sm">{lead.status} · Score {lead.score}</p></div><p className="mt-2 text-sm">{lead.email} · {lead.phone}</p><p className="mt-3 whitespace-pre-wrap text-sm">{lead.challenge}</p><p className="mt-3 text-xs text-slate-500">Consent: {lead.consentAt.toISOString()} · {lead.source}</p></article>)}{!leads.length && <p>Belum ada lead yang masuk.</p>}</div></section>;
}
