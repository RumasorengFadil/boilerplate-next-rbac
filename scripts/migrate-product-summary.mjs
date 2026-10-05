import nextEnv from "@next/env";
import { parseArgs } from "node:util";
import { mkdir, open, readFile, realpath, stat } from "node:fs/promises";
import path from "node:path";
import { migrateProductSummary, restoreProductSummary, previewProducts, productMigrationTargetSchema, productBackupSchema } from "../src/features/products/content-migration.ts";
import { productJsonFingerprint } from "../src/features/products/summary-content.ts";

let client;
try {
  const { values } = parseArgs({ options: { preview: { type: "boolean" }, apply: { type: "boolean" }, restore: { type: "string" }, database: { type: "string" } }, strict: true, allowPositionals: false });
  if ([values.preview, values.apply, values.restore].filter(Boolean).length !== 1 || !values.database) throw new Error("Specify one operation and database.");
  nextEnv.loadEnvConfig(process.cwd());
  const url = new URL(process.env.DATABASE_URL ?? "");
  if (!["postgres:", "postgresql:"].includes(url.protocol)) throw new Error("Invalid database.");
  const target = productMigrationTargetSchema.parse({ host: url.hostname, port: Number(url.port || 5432), database: decodeURIComponent(url.pathname.slice(1)), schema: url.searchParams.get("schema") || "public" });
  if (values.database !== target.database) throw new Error("Target mismatch.");
  const { PrismaClient } = await import("@prisma/client"); client = new PrismaClient();
  const directory = path.resolve(".local-backups/product-summary");
  if (values.preview) {
    const rows = await previewProducts(client); console.log(JSON.stringify(rows, null, 2));
    console.log(`Product preview: ${rows.length} scanned, ${rows.filter(row => row.changed).length} changes, ${rows.filter(row => row.conflict).length} conflicts. No writes.`);
  } else if (values.apply) {
    let backupPath;
    const result = await migrateProductSummary(client, target, async backup => {
      await mkdir(directory, { recursive: true, mode: 0o700 });
      if (await realpath(directory) !== directory || ((await stat(directory)).mode & 0o077) !== 0) throw new Error("Private directory required.");
      backupPath = path.join(directory, `${backup.batchId}.json`);
      const contents = JSON.stringify(backup);
      if (Buffer.byteLength(contents) > 10000000) throw new Error("Backup too large.");
      const file = await open(backupPath, "wx", 0o600);
      try { await file.writeFile(contents); await file.sync(); } finally { await file.close(); }
      const verified = productBackupSchema.parse(JSON.parse(await readFile(backupPath, "utf8")));
      if (productJsonFingerprint(verified) !== productJsonFingerprint(backup)) throw new Error("Backup verification failed.");
      const folder = await open(directory, "r"); try { await folder.sync(); } finally { await folder.close(); }
    });
    console.log(`Product migration: ${result.scanned} scanned, ${result.migrated} migrated.`);
    if (backupPath) console.log(`Private backup: ${backupPath}`);
  } else {
    const root = await realpath(directory), backupPath = await realpath(path.resolve(values.restore));
    const info = await stat(backupPath);
    if (root !== directory || ((await stat(root)).mode & 0o077) !== 0 || !backupPath.startsWith(root + path.sep) || !backupPath.endsWith(".json") || info.size > 10000000 || (info.mode & 0o077) !== 0) throw new Error("Invalid backup path/permissions/size.");
    const result = await restoreProductSummary(client, target, JSON.parse(await readFile(backupPath, "utf8")));
    console.log(`Product restore: ${result.restored} restored; versions incremented, workflow unchanged.`);
  }
} catch {
  console.error("Product operation failed. Check explicit operation/database, local DB access, content conflicts, private backup and current versions. No partial transaction committed; any backup is retained.");
  process.exitCode = 1;
} finally { await client?.$disconnect(); }
