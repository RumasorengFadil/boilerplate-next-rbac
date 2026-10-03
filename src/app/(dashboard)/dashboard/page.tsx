import Link from "next/link";
import { db } from "@/lib/db";
import { requirePermission } from "@/server/authorization";
import { hasPermission } from "@/lib/permissions";
export default async function DashboardPage() {
  const user = await requirePermission("dashboard:read");
  const count = hasPermission(user.role, "projects:read") ? await db.project.count({ where: user.role === "ADMIN" || user.role === "SUPER_ADMIN" ? {} : { ownerId: user.id } }) : null;
  return <section><p className="eyebrow">LunaBiner</p><h1 className="page-title">Ringkasan</h1><div className="mt-6 grid gap-4 sm:grid-cols-2">
    {count !== null && <article className="card"><p>Proyek yang terlihat</p><p className="mt-2 text-3xl font-semibold">{count}</p><Link className="mt-3 block underline" href="/dashboard/projects">Kelola proyek</Link></article>}
    {hasPermission(user.role, "content:read") && <Link className="card" href="/dashboard/content">Konten website →</Link>}
    {hasPermission(user.role, "leads:read") && <Link href="/dashboard/leads" className="card">Lead dan tindak lanjut →</Link>}
    {hasPermission(user.role, "ai:manage") && <Link href="/dashboard/ai" className="card">Konfigurasi LunaBiner AI →</Link>}
  </div></section>;
}
