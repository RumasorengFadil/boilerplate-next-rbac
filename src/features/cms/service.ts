import "server-only";
import { cache } from "react";
import { Prisma, type ContentKind } from "@prisma/client";
import { db } from "@/lib/db";
import { hasPermission } from "@/lib/permissions";
import { requirePermission } from "@/server/authorization";
import { recordAudit } from "@/server/audit";
import { canTransition, contentInputSchema, detailsSchema, translationSchema } from "./schema";
import { convertLegacyPortfolioContent } from "@/features/portfolio/legacy-content";
import { parseCoverPath } from "@/features/portfolio/cover-schema";
import { z } from "zod";

export const publicContentWhere = (kind?: ContentKind): Prisma.ContentEntryWhereInput => ({
  ...(kind ? { kind } : {}), deletedAt: null, status: { in: ["PUBLISHED", "SCHEDULED"] }, publishedAt: { lte: new Date() },
});
export function presentContent(entry: Awaited<ReturnType<typeof db.contentEntry.findMany>>[number]) {
  const normalized = entry.kind === "CASE_STUDY" ? convertLegacyPortfolioContent(entry) : entry;
  const translations = normalized.translations as { id: unknown; en: unknown };
  return { ...entry, translations: { id: translationSchema.parse(translations.id), en: translationSchema.parse(translations.en) }, details: detailsSchema.parse(normalized.details) };
}
export const publishedContent = cache(async (kind?: ContentKind) => {
  if (kind === "CASE_STUDY") return (await import("@/features/portfolio/public-data")).publishedPortfolioContent();
  return (await db.contentEntry.findMany({ where: publicContentWhere(kind), orderBy: [{ publishedAt: "desc" }, { id: "asc" }], take: 200 })).map(presentContent);
});
export type ContentSaveOptions = {
  preservePortfolioDetails?: boolean;
  // Trusted server-only options, never parsed from client fields.
  createPortfolioId?: string;
  portfolioCover?: { operation: "keep" | "remove" | "replace"; path?: string };
};
export async function saveContent(raw: unknown, options: ContentSaveOptions = {}) {
  const user = await requirePermission("content:write");
  const input = contentInputSchema.parse(raw);
  const publisher = hasPermission(user.role, "content:publish");
  if ((options.createPortfolioId || options.portfolioCover) && input.kind !== "CASE_STUDY") throw new Error("Invalid portfolio options.");
  if (options.createPortfolioId && input.id) throw new Error("Cannot change portfolio identifier.");
  const createId = options.createPortfolioId ? z.uuid().parse(options.createPortfolioId) : undefined;
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
    // Portfolio status is a direct choice; archive remains a separate soft-delete action.
    if (input.kind === "CASE_STUDY") {
      if (input.status === "ARCHIVED") throw new Error("Use the portfolio archive action.");
    } else if (!canTransition(previous?.status ?? "DRAFT", input.status)) throw new Error("Invalid publication transition; submit for review first.");
    if (!publisher && (["PUBLISHED", "SCHEDULED", "ARCHIVED"].includes(input.status) || previous && ["PUBLISHED", "SCHEDULED"].includes(previous.status))) throw new Error("Publishing permission required.");
    // The editor already received converted defaults through presentContent.
    // Preserve non-narrative metadata, but never reappend text the admin removed.
    const details = options.preservePortfolioDetails && input.kind === "CASE_STUDY"
      ? { ...detailsSchema.parse(previous ? convertLegacyPortfolioContent(previous).details : {}), category: input.details.category,
        tags: input.details.tags, authorName: input.details.authorName, image: input.details.image }
      : input.details;
    if (options.portfolioCover) {
      const cover = options.portfolioCover;
      details.image = cover.operation === "keep" ? (previous ? presentContent(previous).details.image : "") : cover.operation === "remove" ? "" : cover.path ?? "";
      if (cover.operation === "replace" && !parseCoverPath(details.image)) throw new Error("Invalid uploaded cover.");
    }
    const uploaded = parseCoverPath(details.image);
    if (uploaded && uploaded.contentId !== (previous?.id ?? createId)) throw new Error("Cover belongs to another portfolio.");
    const normalized = input.kind === "CASE_STUDY" ? convertLegacyPortfolioContent({ translations: input.translations, details }) : { translations: input.translations, details };
    const data = {
      kind: input.kind, slug: input.slug, status: input.status,
      translations: normalized.translations, details: normalized.details,
      publishedAt: input.status === "PUBLISHED" ? previous?.status === "PUBLISHED" ? previous.publishedAt ?? new Date() : new Date() : input.status === "SCHEDULED" ? new Date(input.publishedAt!) : null,
    };
    if (input.status === "SCHEDULED" && data.publishedAt! <= new Date()) throw new Error("Schedule must be in the future.");
    if (previous) {
      const updated = await tx.contentEntry.updateMany({ where: { id: previous.id, version: input.version }, data: { ...data, version: { increment: 1 } } });
      if (!updated.count) throw new Error("Content changed; reload before saving.");
    }
    const saved = previous ? await tx.contentEntry.findUniqueOrThrow({ where: { id: previous.id } }) : await tx.contentEntry.create({ data: { ...data, ...(createId ? { id: createId } : {}), authorId: user.id } });
    await recordAudit(tx, { actorId: user.id, module: "cms", action: previous ? "content.update" : "content.create", recordId: saved.id,
      ...(previous ? { before: { slug: previous.slug, status: previous.status, version: previous.version, ...(input.kind === "CASE_STUDY" ? { image: presentContent(previous).details.image } : {}) } } : {}), after: { slug: saved.slug, status: saved.status, version: saved.version, ...(input.kind === "CASE_STUDY" ? { image: details.image } : {}) } });
    return saved;
  });
}
