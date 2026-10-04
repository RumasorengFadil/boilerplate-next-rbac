import "server-only";
import { cache } from "react";
import { Prisma, type ContentKind } from "@prisma/client";
import { db } from "@/lib/db";
import { hasPermission } from "@/lib/permissions";
import { requirePermission } from "@/server/authorization";
import { recordAudit } from "@/server/audit";
import { canTransition, contentInputSchema, detailsSchema, translationSchema } from "./schema";

export const publicContentWhere = (kind?: ContentKind): Prisma.ContentEntryWhereInput => ({
  ...(kind ? { kind } : {}), deletedAt: null, status: { in: ["PUBLISHED", "SCHEDULED"] }, publishedAt: { lte: new Date() },
});
export function presentContent(entry: Awaited<ReturnType<typeof db.contentEntry.findMany>>[number]) {
  const translations = entry.translations as { id: unknown; en: unknown };
  return { ...entry, translations: { id: translationSchema.parse(translations.id), en: translationSchema.parse(translations.en) }, details: detailsSchema.parse(entry.details) };
}
export const publishedContent = cache(async (kind?: ContentKind) => {
  return (await db.contentEntry.findMany({ where: publicContentWhere(kind), orderBy: [{ publishedAt: "desc" }, { id: "asc" }], take: 200 })).map(presentContent);
});
export async function saveContent(raw: unknown) {
  const user = await requirePermission("content:write");
  const input = contentInputSchema.parse(raw);
  const publisher = hasPermission(user.role, "content:publish");
  return db.$transaction(async tx => {
    const previous = input.id ? await tx.contentEntry.findUnique({ where: { id: input.id } }) : null;
    if (input.id && !previous) throw new Error("Content no longer exists.");
    if (previous?.deletedAt) throw new Error("Restore archived portfolio before editing.");
    if (previous && previous.kind !== input.kind) throw new Error("Content kind cannot change.");
    if (previous?.kind === "CASE_STUDY") {
      const stored = presentContent(previous).translations;
      for (const locale of ["id", "en"] as const) if (stored[locale].richBody && !input.translations[locale].richBody)
        throw new Error("Use the portfolio editor to preserve rich content.");
    }
    if (!canTransition(previous?.status ?? "DRAFT", input.status)) throw new Error("Invalid publication transition; submit for review first.");
    if (!publisher && (["PUBLISHED", "SCHEDULED", "ARCHIVED"].includes(input.status) || previous && ["PUBLISHED", "SCHEDULED"].includes(previous.status))) throw new Error("Publishing permission required.");
    const data = {
      kind: input.kind, slug: input.slug, status: input.status,
      translations: input.translations, details: input.details,
      publishedAt: input.status === "PUBLISHED" ? previous?.status === "PUBLISHED" ? previous.publishedAt ?? new Date() : new Date() : input.status === "SCHEDULED" ? new Date(input.publishedAt!) : null,
    };
    if (input.status === "SCHEDULED" && data.publishedAt! <= new Date()) throw new Error("Schedule must be in the future.");
    if (previous) {
      const updated = await tx.contentEntry.updateMany({ where: { id: previous.id, version: input.version }, data: { ...data, version: { increment: 1 } } });
      if (!updated.count) throw new Error("Content changed; reload before saving.");
    }
    const saved = previous ? await tx.contentEntry.findUniqueOrThrow({ where: { id: previous.id } }) : await tx.contentEntry.create({ data: { ...data, authorId: user.id } });
    await recordAudit(tx, { actorId: user.id, module: "cms", action: previous ? "content.update" : "content.create", recordId: saved.id,
      ...(previous ? { before: { slug: previous.slug, status: previous.status, version: previous.version } } : {}), after: { slug: saved.slug, status: saved.status, version: saved.version } });
    return saved;
  });
}
