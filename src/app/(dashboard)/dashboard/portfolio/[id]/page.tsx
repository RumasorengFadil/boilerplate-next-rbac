import Link from "next/link";
import { notFound } from "next/navigation";
import { z } from "zod";
import { db } from "@/lib/db";
import { hasPermission } from "@/lib/permissions";
import { requirePermission } from "@/server/authorization";
import { presentContent } from "@/features/cms/service";
import { PortfolioEditor } from "@/features/portfolio/editor";
import { PortfolioLifecycleControls } from "@/features/portfolio/lifecycle-controls";

export default async function EditPortfolio({ params }: { params: Promise<{ id: string }> }) {
  const user = await requirePermission("content:write");
  const { id } = await params;
  const canPublish = hasPermission(user.role, "content:publish");
  if (id === "new") return <section className="min-w-0"><Link href="/dashboard/portfolio" className="text-sm text-[#08747A]">← Portfolio</Link><h1 className="page-title mt-4">Tambah portfolio</h1><PortfolioEditor canPublish={canPublish} /></section>;
  if (!z.uuid().safeParse(id).success) notFound();
  const row = await db.contentEntry.findFirst({ where: { id, kind: "CASE_STUDY" } });
  if (!row) notFound();
  const entry = presentContent(row);
  return <section className="min-w-0"><Link href="/dashboard/portfolio" className="text-sm text-[#08747A]">← Portfolio</Link><h1 className="page-title mt-4">{entry.deletedAt ? "Portfolio diarsipkan" : "Edit portfolio"}</h1>
    {entry.deletedAt ? <div className="card mt-6 space-y-4"><p className="font-semibold">{entry.translations.id.title}</p><p className="text-sm text-slate-600">Pulihkan sebagai DRAFT sebelum mengedit. Data dan URL historis tetap tersimpan.</p>{canPublish && <PortfolioLifecycleControls key={entry.version} id={id} version={entry.version} deleted />}</div>
      : <><PortfolioEditor canPublish={canPublish} readOnly={!canPublish && ["PUBLISHED", "SCHEDULED"].includes(entry.status)} initial={{ id, kind: entry.kind, slug: entry.slug, status: entry.status, version: entry.version, publishedAt: entry.publishedAt?.toISOString() ?? null, translations: entry.translations, details: entry.details }} />
        {canPublish && <section className="card mt-8"><h2 className="mb-4 font-semibold">Arsip portfolio</h2><PortfolioLifecycleControls key={entry.version} id={id} version={entry.version} deleted={false} /></section>}</>}
  </section>;
}
