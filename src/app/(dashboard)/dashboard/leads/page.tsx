import Link from "next/link";
import { z } from "zod";
import { requirePermission } from "@/server/authorization";
import { db } from "@/lib/db";
import { leadStatuses } from "@/features/leads/schema";

export default async function LeadsPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  await requirePermission("leads:read");
  const raw = await searchParams;
  const parsed = z.object({ q: z.string().max(100).default(""), status: z.enum(leadStatuses).optional() }).safeParse({ q: raw.q ?? "", status: raw.status || undefined });
  if (!parsed.success) return <section><h1 className="page-title">Lead LunaBiner</h1><p className="mt-4">Filter tidak valid.</p><Link href="/dashboard/leads">Hapus filter</Link></section>;
  const { q, status } = parsed.data;
  const leads = await db.lead.findMany({ where: { ...(status ? { status } : {}), ...(q ? { OR: [{ name: { contains: q, mode: "insensitive" } }, { company: { contains: q, mode: "insensitive" } }, { email: { contains: q, mode: "insensitive" } }] } : {}) }, include: { owner: { select: { name: true } } }, orderBy: { createdAt: "desc" }, take: 100 });
  return <section><h1 className="page-title">Lead LunaBiner</h1><p className="mt-3 text-sm text-slate-600">Kebutuhan dari contact dan AI, status, owner, catatan, serta percakapan terkait.</p>
    <form className="mt-6 flex flex-wrap gap-3"><input className="input max-w-xs" name="q" aria-label="Cari nama, perusahaan, email" defaultValue={q} placeholder="Cari nama, perusahaan, email" maxLength={100} /><select name="status" className="input max-w-xs" aria-label="Filter status" defaultValue={status ?? ""}><option value="">Semua status</option>{leadStatuses.map(value => <option key={value}>{value}</option>)}</select><button className="min-h-11 rounded-lg border px-5">Filter</button></form>
    <div className="mt-6 grid gap-4">{leads.map(lead => <Link key={lead.id} href={`/dashboard/leads/${lead.id}`} className="card"><div className="flex flex-wrap justify-between gap-3"><h2 className="font-semibold">{lead.name} · {lead.company || "Individual"}</h2><p className="text-sm">{lead.status} · Score {lead.score}</p></div><p className="mt-2 break-words text-sm">{lead.email} · {lead.phone}</p><p className="mt-3 line-clamp-2 text-sm">{lead.challenge}</p><p className="mt-3 text-xs text-slate-500">{lead.source} · {lead.owner?.name ?? "Belum ditugaskan"} · {lead.createdAt.toISOString()}</p></Link>)}{!leads.length && <p className="card">Belum ada lead yang sesuai filter.</p>}</div>
  </section>;
}
