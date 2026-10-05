import "server-only";
import { cache } from "react";
import { db } from "@/lib/db";
import { publicContentWhere } from "../cms/service";
import { presentProduct } from "./service";

// Request memoization only. Persistent guarded payload caching belongs to Task 6.
export const publishedProducts = cache(async () => {
  const rows = await db.contentEntry.findMany({ where: publicContentWhere("PRODUCT"),
    orderBy: [{ publishedAt: "desc" }, { id: "asc" }], take: 200 });
  return rows.map(presentProduct);
});
