import "server-only";
import { cache } from "react";
import { createHash } from "node:crypto";
import { unstable_cache } from "next/cache";
import { db } from "@/lib/db";
import { publicContentWhere } from "../cms/service";
import { presentProduct } from "./service";

export const PRODUCT_PUBLIC_TAG = "products-public";
export const productRevisionSelect = { id: true, version: true, updatedAt: true } as const;
type Revision = { id: string; version: number; updatedAt: Date };

// Cache only eligible, exact revisions. Inventory, routes and authorization stay live.
const cachedRows = unstable_cache(async (_source: string, revisions: { id: string; version: number; updatedAt: string }[]) => {
  const rows = await db.contentEntry.findMany({ where: { ...publicContentWhere("PRODUCT"),
    OR: revisions.map(row => ({ id: row.id, version: row.version, updatedAt: new Date(row.updatedAt) })) } });
  return rows.map(row => ({ ...row, createdAt: row.createdAt.toISOString(), updatedAt: row.updatedAt.toISOString(),
    publishedAt: row.publishedAt?.toISOString() ?? null, deletedAt: null }));
}, ["products-public-revisions-v1"], { tags: [PRODUCT_PUBLIC_TAG], revalidate: 300 });

export async function productRevisionContent(revisions: Revision[]) {
  if (!revisions.length) return [];
  const source = createHash("sha256").update(process.env.DATABASE_URL ?? "unconfigured").digest("hex");
  const rows = await cachedRows(source, revisions.map(row => ({ id: row.id, version: row.version, updatedAt: row.updatedAt.toISOString() })));
  const entries = new Map(rows.map(row => [row.id, presentProduct({ ...row,
    createdAt: new Date(row.createdAt), updatedAt: new Date(row.updatedAt),
    publishedAt: row.publishedAt ? new Date(row.publishedAt) : null, deletedAt: null })]));
  return revisions.flatMap(row => entries.has(row.id) ? [entries.get(row.id)!] : []);
}

export const publishedProducts = cache(async () => {
  const revisions = await db.contentEntry.findMany({ where: publicContentWhere("PRODUCT"), select: productRevisionSelect,
    orderBy: [{ publishedAt: "desc" }, { id: "asc" }], take: 200 });
  return productRevisionContent(revisions);
});
