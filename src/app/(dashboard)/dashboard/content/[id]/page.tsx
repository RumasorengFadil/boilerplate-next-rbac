import { notFound, redirect } from "next/navigation";
import { z } from "zod";
import { requirePermission } from "@/server/authorization";
import { hasPermission } from "@/lib/permissions";
import { db } from "@/lib/db";
import { presentContent } from "@/features/cms/service";
import { ContentEditor } from "@/features/cms/editor";

export default async function EditContent({ params }: { params: Promise<{ id: string }> }) {
  const user = await requirePermission("content:write");
  const { id } = await params;
  if (id === "new") return <section><h1 className="page-title">Tambah konten</h1><ContentEditor canPublish={hasPermission(user.role, "content:publish")} /></section>;
  if (!z.uuid().safeParse(id).success) notFound();
  const row = await db.contentEntry.findUnique({ where: { id } });
  if (!row) notFound();
  if (row.kind === "CASE_STUDY") redirect(`/dashboard/portfolio/${row.id}`);
  if (row.kind === "PRODUCT") redirect(`/dashboard/products/${row.id}`);
  const entry = presentContent(row);
  return <section><h1 className="page-title">Edit konten</h1><ContentEditor canPublish={hasPermission(user.role, "content:publish")} initial={{ id, kind: entry.kind, slug: entry.slug, status: entry.status, version: entry.version, publishedAt: entry.publishedAt?.toISOString() ?? null, translations: entry.translations, details: entry.details }} /></section>;
}
