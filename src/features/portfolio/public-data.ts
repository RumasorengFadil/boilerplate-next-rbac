import "server-only";
import { createHash } from "node:crypto";
import { unstable_cache } from "next/cache";
import { db } from "@/lib/db";
import { presentContent, publicContentWhere } from "@/features/cms/service";

export const PORTFOLIO_PUBLIC_TAG = "portfolio-public";
export const portfolioRevisionSelect = { id: true, version: true, updatedAt: true } as const;
type Revision = { id: string; version: number; updatedAt: Date };

// The caller must obtain these revisions through a LIVE public eligibility query.
// Never cache the inventory/authorization decision: schedules and withdrawals are immediate.
const cachedRows = unstable_cache(async (_source: string, revisions: { id: string; version: number; updatedAt: string }[]) => {
  const rows = await db.contentEntry.findMany({
    where: { ...publicContentWhere("CASE_STUDY"), OR: revisions.map(revision => ({
      id: revision.id, version: revision.version, updatedAt: new Date(revision.updatedAt),
    })) },
  });
  // Explicit wire format: the persistent cache serializes Dates into strings.
  return rows.map(row => ({ ...row, createdAt: row.createdAt.toISOString(), updatedAt: row.updatedAt.toISOString(),
    publishedAt: row.publishedAt?.toISOString() ?? null, deletedAt: null }));
}, ["portfolio-public-revisions-v1"], { tags: [PORTFOLIO_PUBLIC_TAG], revalidate: 300 });

export async function portfolioRevisionContent(revisions: Revision[]) {
  if (!revisions.length) return [];
  // Isolate persistent entries between database configurations without storing credentials in keys.
  const source = createHash("sha256").update(process.env.DATABASE_URL ?? "unconfigured").digest("hex");
  const rows = await cachedRows(source, revisions.map(row => ({ ...row, updatedAt: row.updatedAt.toISOString() })));
  const entries = new Map(rows.map(row => [row.id, presentContent({ ...row,
    createdAt: new Date(row.createdAt), updatedAt: new Date(row.updatedAt),
    publishedAt: row.publishedAt ? new Date(row.publishedAt) : null, deletedAt: null,
  })]));
  return revisions.flatMap(row => entries.has(row.id) ? [entries.get(row.id)!] : []);
}

export async function publishedPortfolioContent() {
  const revisions = await db.contentEntry.findMany({ where: publicContentWhere("CASE_STUDY"),
    select: portfolioRevisionSelect, orderBy: [{ publishedAt: "desc" }, { id: "asc" }], take: 200 });
  return portfolioRevisionContent(revisions);
}
