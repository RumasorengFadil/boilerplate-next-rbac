import Link from "next/link";
import { db } from "@/lib/db";
import { requirePermission } from "@/server/authorization";
import { hasPermission } from "@/lib/permissions";
import { presentContent } from "@/features/cms/service";

export default async function ContentPage() {
  const user = await requirePermission("content:read");
  const entries = (await db.contentEntry.findMany({ where: { deletedAt: null }, orderBy: { updatedAt: "desc" }, take: 100 })).map(presentContent);
  return <section><div className="flex flex-wrap items-center justify-between gap-4"><h1 className="page-title">Konten website</h1>{hasPermission(user.role, "content:write") && <Link className="min-h-11 rounded-lg bg-[#08747A] px-4 py-3 text-white" href="/dashboard/content/new">Tambah konten</Link>}</div>
    <p className="mt-3 text-sm text-slate-600">Artikel, studi kasus, dan produk · ID/EN · draft, review, jadwal, publikasi, arsip.</p>
    <div className="mt-6 grid gap-4">{entries.map(entry => <Link key={entry.id} href={`/dashboard/${entry.kind === "CASE_STUDY" ? "portfolio" : "content"}/${entry.id}`} className="card flex flex-wrap justify-between gap-3"><span className="font-semibold">{entry.translations.id.title}<span className="mt-2 block text-xs font-normal">{entry.kind} · /{entry.slug}</span></span><span className="text-sm">{entry.status} · v{entry.version}</span></Link>)}{!entries.length && <p className="card">Belum ada konten CMS. Website tetap menampilkan konten awal sampai konten baru dipublikasikan.</p>}</div>
  </section>;
}
