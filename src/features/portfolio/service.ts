import "server-only";
import { db } from "@/lib/db";
import { requirePermission } from "@/server/authorization";
import { recordAudit } from "@/server/audit";
import { presentContent, publicContentWhere, saveContent } from "@/features/cms/service";
import { portfolioInputSchema, portfolioLifecycleSchema, portfolioRouteSchema } from "./schema";

export async function savePortfolio(raw: unknown) {
  await requirePermission("content:write");
  return saveContent(portfolioInputSchema.parse(raw));
}

// No shared cache yet: Task 5 owns rendering/cache adoption and invalidation.
export async function resolvePublishedPortfolio(raw: unknown) {
  const parsed = portfolioRouteSchema.safeParse(raw);
  if (!parsed.success) return null;
  const route = await db.portfolioRoute.findUnique({
    where: { value: parsed.data }, select: { contentId: true },
  });
  if (!route) return null;
  const entry = await db.contentEntry.findFirst({ where: { ...publicContentWhere("CASE_STUDY"), id: route.contentId } });
  if (!entry) return null;
  return { entry: presentContent(entry), canonicalSlug: entry.slug, redirect: parsed.data !== entry.slug };
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
