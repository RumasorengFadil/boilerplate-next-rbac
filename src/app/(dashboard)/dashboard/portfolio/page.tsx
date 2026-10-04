import Link from "next/link";
import { z } from "zod";
import { db } from "@/lib/db";
import { hasPermission } from "@/lib/permissions";
import { requirePermission } from "@/server/authorization";
import { presentContent } from "@/features/cms/service";
import { PortfolioLifecycleControls } from "@/features/portfolio/lifecycle-controls";

export default async function PortfolioPage({ searchParams }: { searchParams: Promise<{ view?: string }> }) {
  const user = await requirePermission("content:read");
  const view = z.enum(["active", "archived"]).catch("active").parse((await searchParams).view);
  const entries = (await db.contentEntry.findMany({ where: { kind: "CASE_STUDY", deletedAt: view === "archived" ? { not: null } : null }, orderBy: [{ updatedAt: "desc" }, { id: "asc" }], take: 100 })).map(presentContent);
  return <section className="min-w-0"><div className="flex flex-wrap items-center justify-between gap-4"><h1 className="page-title">Portfolio</h1>
    {hasPermission(user.role, "content:write") && <Link href="/dashboard/portfolio/new" className="min-h-11 rounded-lg bg-[#08747A] px-4 py-3 font-semibold text-white">Tambah portfolio</Link>}</div>
    <p className="mt-3 text-sm text-slate-600">Studi kasus ID/EN · overview terstruktur · editor rich content · arsip yang dapat dipulihkan.</p>
    <nav aria-label="Filter portfolio" className="mt-6 flex flex-wrap gap-2">{(["active", "archived"] as const).map(value => <Link key={value} href={`/dashboard/portfolio?view=${value}`} aria-current={view === value ? "page" : undefined} className={`min-h-11 rounded-md border px-4 py-3 text-sm ${view === value ? "bg-[#EAF5F4] font-semibold text-[#08747A]" : "bg-white"}`}>{value === "active" ? "Aktif" : "Arsip"}</Link>)}</nav>
    <div className="mt-6 grid gap-4">{entries.map(entry => <article key={entry.id} className="card min-w-0 space-y-4"><div className="flex flex-wrap items-start justify-between gap-3"><div className="min-w-0">
      <Link href={`/dashboard/portfolio/${entry.id}`} className="break-words font-semibold text-[#08747A]">{entry.translations.id.title}</Link><p className="mt-2 break-all text-xs text-slate-600">/{entry.slug}</p>
      <p className="mt-2 text-xs text-slate-600">{entry.details.verifiedProject ? "Proyek terverifikasi" : "Contoh ilustratif"} · diperbarui {entry.updatedAt.toISOString()}</p></div><span className="text-sm">{entry.deletedAt ? "DIARSIPKAN" : entry.status} · v{entry.version}</span></div>
      {hasPermission(user.role, "content:publish") && <PortfolioLifecycleControls key={entry.version} id={entry.id} version={entry.version} deleted={Boolean(entry.deletedAt)} />}
    </article>)}{!entries.length && <p className="card">{view === "archived" ? "Belum ada portfolio diarsipkan." : "Belum ada portfolio aktif. Tambahkan contoh atau studi kasus melalui editor."}</p>}</div>
    {entries.length === 100 && <p className="mt-4 text-sm text-slate-600">Menampilkan 100 portfolio terbaru pada filter ini.</p>}
  </section>;
}
