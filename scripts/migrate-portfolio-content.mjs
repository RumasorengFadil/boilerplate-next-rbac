import nextEnv from "@next/env";
import { parseArgs } from "node:util";
import { mkdir, open, readFile, realpath, stat } from "node:fs/promises";
import path from "node:path";
import { migratePortfolioContent, restorePortfolioContent, migrationTargetSchema, portfolioBackupSchema } from "../src/features/portfolio/content-migration.ts";
import { portfolioJsonFingerprint } from "../src/features/portfolio/legacy-content.ts";

let client;
try {
  const { values } = parseArgs({ options: { apply: { type: "boolean" }, restore: { type: "string" }, database: { type: "string" } }, strict: true, allowPositionals: false });
  if (Boolean(values.apply) === Boolean(values.restore) || !values.database) throw new Error("Specify exactly one operation and database confirmation.");
  nextEnv.loadEnvConfig(process.cwd());
  const url = new URL(process.env.DATABASE_URL ?? "");
  if (!["postgres:", "postgresql:"].includes(url.protocol)) throw new Error("Invalid database configuration.");
  const target = migrationTargetSchema.parse({ host: url.hostname, port: Number(url.port || 5432), database: decodeURIComponent(url.pathname.slice(1)), schema: url.searchParams.get("schema") || "public" });
  if (values.database !== target.database) throw new Error("Database confirmation mismatch.");
  const { PrismaClient } = await import("@prisma/client"); client = new PrismaClient();
  const directory = path.resolve(".local-backups/portfolio-content");
  if (values.apply) {
    let backupPath;
    const result = await migratePortfolioContent(client, target, async backup => {
      await mkdir(directory, { recursive: true, mode: 0o700 });
      if (await realpath(directory) !== directory || ((await stat(directory)).mode & 0o077) !== 0) throw new Error("Backup directory is not private.");
      backupPath = path.join(directory, `${backup.batchId}.json`);
      const contents = JSON.stringify(backup);
      if (Buffer.byteLength(contents) > 10000000) throw new Error("Backup exceeds restore size limit.");
      const file = await open(backupPath, "wx", 0o600);
      try { await file.writeFile(contents); await file.sync(); } finally { await file.close(); }
      const verified = portfolioBackupSchema.parse(JSON.parse(await readFile(backupPath, "utf8")));
      if (portfolioJsonFingerprint(verified) !== portfolioJsonFingerprint(backup)) throw new Error("Backup verification failed.");
      const folder = await open(directory, "r"); try { await folder.sync(); } finally { await folder.close(); }
    });
    console.log(`Portfolio migration: ${result.scanned} scanned, ${result.migrated} migrated.`);
    if (backupPath) console.log(`Private backup: ${backupPath}`);
  } else {
    const root = await realpath(directory), backupPath = await realpath(path.resolve(values.restore));
    if (!backupPath.startsWith(root + path.sep) || !backupPath.endsWith(".json") || (await stat(backupPath)).size > 10000000) throw new Error("Invalid backup path/size.");
    const result = await restorePortfolioContent(client, target, JSON.parse(await readFile(backupPath, "utf8")));
    console.log(`Portfolio restore: ${result.restored} restored; versions incremented, no workflow changes.`);
  }
} catch {
  // Never echo raw Prisma/Zod/URL errors, content snapshots or environment keys.
  console.error("Portfolio operation failed. Check explicit --apply/--restore and --database, local DB access, valid content, private backup storage and version conflicts. Transaction changes were rolled back; any written backup is retained.");
  process.exitCode = 1;
} finally { await client?.$disconnect(); }
