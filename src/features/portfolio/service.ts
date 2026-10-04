import "server-only";
import { z } from "zod";
import { db } from "@/lib/db";
import { requirePermission } from "@/server/authorization";
import { recordAudit } from "@/server/audit";
import { presentContent, publicContentWhere, saveContent, type ContentSaveOptions } from "@/features/cms/service";
import { portfolioInputSchema, portfolioLifecycleSchema, portfolioRouteSchema } from "./schema";
import { portfolioRevisionContent, portfolioRevisionSelect } from "./public-data";

export async function savePortfolio(raw: unknown, options: ContentSaveOptions = {}) {
  await requirePermission("content:write");
  return saveContent(portfolioInputSchema.parse(raw), options);
}

// Route ownership and public eligibility remain live, outside the shared payload cache.
export async function resolvePublishedPortfolio(raw: unknown) {
  const parsed = portfolioRouteSchema.safeParse(raw);
  if (!parsed.success) return null;
  const route = await db.portfolioRoute.findUnique({
    where: { value: parsed.data }, select: { contentId: true },
  });
  if (!route) return null;
  const revision = await db.contentEntry.findFirst({ where: { ...publicContentWhere("CASE_STUDY"), id: route.contentId }, select: portfolioRevisionSelect });
  if (!revision) return null;
  const [entry] = await portfolioRevisionContent([revision]);
  if (!entry) return null;
  return { entry, canonicalSlug: entry.slug, redirect: parsed.data !== entry.slug };
}

export async function publishedRelatedPortfolios(rawIds: unknown, rawCurrentId: unknown) {
  const ids = z.array(z.uuid()).max(6).parse(rawIds);
  const currentId = z.uuid().parse(rawCurrentId);
  if (!ids.length) return [];
  const rows = await db.contentEntry.findMany({
    where: { ...publicContentWhere("CASE_STUDY"), id: { in: ids, not: currentId } },
    select: portfolioRevisionSelect,
  });
  // Follow the configured order, excluding duplicates/missing/private entries.
  const entries = new Map((await portfolioRevisionContent(rows)).map(row => [row.id, row]));
  return [...new Set(ids)].flatMap(id => entries.has(id) ? [entries.get(id)!] : []);
}

export async function changePortfolioLifecycle(raw: unknown) {
  const user = await requirePermission("content:publish");
  const input = portfolioLifecycleSchema.parse(raw);
  return db.$transaction(async tx => {
    const previous = await tx.contentEntry.findFirst({ where: { id: input.id, kind: "CASE_STUDY" } });
    if (!previous) throw new Error("Portfolio no longer exists.");
    if (input.operation === "restore" && !previous.deletedAt) throw new Error("Portfolio is not deleted.");
    if (input.operation === "archive" && previous.deletedAt) throw new Error("Portfolio is already deleted.");
    const updated = await tx.contentEntry.updateMany({
      where: { id: previous.id, kind: "CASE_STUDY", version: input.version, deletedAt: previous.deletedAt },
      data: { deletedAt: input.operation === "archive" ? new Date() : null,
        status: input.operation === "archive" ? "ARCHIVED" : "DRAFT", publishedAt: null, version: { increment: 1 } },
    });
    if (!updated.count) throw new Error("Portfolio changed; reload before saving.");
    const saved = await tx.contentEntry.findUniqueOrThrow({ where: { id: previous.id } });
    await recordAudit(tx, { actorId: user.id, module: "cms", action: `portfolio.${input.operation}`, recordId: saved.id,
      before: { status: previous.status, version: previous.version, deletedAt: previous.deletedAt?.toISOString() ?? null },
      after: { status: saved.status, version: saved.version, deletedAt: saved.deletedAt?.toISOString() ?? null } });
    return saved;
  });
}
