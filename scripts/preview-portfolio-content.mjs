import nextEnv from "@next/env";
import { convertLegacyPortfolioContent, legacyPortfolioKeys } from "../src/features/portfolio/legacy-content.ts";

// Preview only. No apply flag, writes, content dumps, credentials or provider calls.
if (process.argv.length > 2) throw new Error("Preview takes no arguments and never modifies data.");
nextEnv.loadEnvConfig(process.cwd());
const { PrismaClient } = await import("@prisma/client");
const client = new PrismaClient();
try {
  const result = await client.$transaction(async tx => {
    await tx.$executeRaw`SET TRANSACTION READ ONLY`;
    const rows = await tx.contentEntry.findMany({ where: { kind: "CASE_STUDY" }, select: { translations: true, details: true } });
    let changed = 0, invalid = 0, legacy = 0;
    for (const row of rows) {
      if (row.details && typeof row.details === "object" && legacyPortfolioKeys.some(key => Object.hasOwn(row.details, key))) legacy++;
      try { if (convertLegacyPortfolioContent(row).changed) changed++; } catch { invalid++; }
    }
    return { total: rows.length, legacy, changed, invalid };
  }, { isolationLevel: "RepeatableRead" });
  console.log(`Portfolio preview (read-only): ${result.total} rows, ${result.legacy} with legacy keys, ${result.changed} convertible changes, ${result.invalid} invalid rows.`);
  if (result.invalid) process.exitCode = 1;
} catch {
  console.error("Preview failed. Check database access and migrations. No data was changed."); process.exitCode = 1;
} finally { await client.$disconnect(); }
