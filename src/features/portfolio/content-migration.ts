import { randomUUID } from "node:crypto";
import type { PrismaClient, Prisma } from "@prisma/client";
import { z } from "zod";
import { convertLegacyPortfolioContent, portfolioJsonFingerprint } from "./legacy-content";

const payloadSchema = z.object({
  translations: z.object({ id: z.record(z.string(), z.json()), en: z.record(z.string(), z.json()) }).strict(),
  details: z.record(z.string(), z.json()),
}).strict();
export const migrationTargetSchema = z.object({
  host: z.enum(["localhost", "127.0.0.1", "[::1]"]), port: z.number().int().min(1).max(65535),
  database: z.string().min(1).max(100).regex(/^[a-zA-Z0-9_-]+$/),
  schema: z.string().min(1).max(100).regex(/^[a-zA-Z0-9_]+$/).default("public"),
}).strict();
export const portfolioBackupSchema = z.object({
  format: z.literal("lunabiner-portfolio-content-v1"), batchId: z.uuid(), createdAt: z.iso.datetime(), target: migrationTargetSchema,
  rows: z.array(z.object({ id: z.uuid(), version: z.number().int().positive(), before: payloadSchema, after: payloadSchema }).strict()).max(10000),
}).strict().superRefine((backup, context) => {
  if (new Set(backup.rows.map(row => row.id)).size !== backup.rows.length) context.addIssue({ code: "custom", message: "Duplicate backup rows." });
  for (const row of backup.rows) {
    try {
      const expected = convertLegacyPortfolioContent(row.before);
      if (!expected.changed || portfolioJsonFingerprint({ translations: expected.translations, details: expected.details }) !== portfolioJsonFingerprint(row.after))
        context.addIssue({ code: "custom", message: "Backup conversion does not match." });
    } catch { context.addIssue({ code: "custom", message: "Invalid backup content." }); }
  }
});
export type PortfolioBackup = z.infer<typeof portfolioBackupSchema>;

async function checkDatabase(tx: Prisma.TransactionClient, expected: z.infer<typeof migrationTargetSchema>) {
  const result = await tx.$queryRaw<Array<{ name: string; schema: string }>>`SELECT current_database() AS name, current_schema() AS schema`;
  if (result[0]?.name !== expected.database || result[0]?.schema !== expected.schema) throw new Error("Database target mismatch.");
}

// Operational CLI boundary, not a Server Action. The operator's DB role supplies
// authority; snapshot output is local-only and never returned through public API.
export async function migratePortfolioContent(client: PrismaClient, rawTarget: unknown, writeBackup: (backup: PortfolioBackup) => Promise<void>) {
  const target = migrationTargetSchema.parse(rawTarget);
  return client.$transaction(async tx => {
    await checkDatabase(tx, target);
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(104004003)`;
    const rows = await tx.contentEntry.findMany({ where: { kind: "CASE_STUDY" }, orderBy: { id: "asc" } });
    // Validate every row, including draft/deleted, before any writes or backup.
    const changes = rows.map(row => ({ row, result: convertLegacyPortfolioContent(row) })).filter(item => item.result.changed);
    if (!changes.length) return { scanned: rows.length, migrated: 0, batchId: null };
    const backup = portfolioBackupSchema.parse({ format: "lunabiner-portfolio-content-v1", batchId: randomUUID(), createdAt: new Date().toISOString(), target,
      rows: changes.map(({ row, result }) => ({ id: row.id, version: row.version,
        before: { translations: row.translations, details: row.details }, after: { translations: result.translations, details: result.details } })) });
    // The CLI must create, fsync and verify this private file before commit.
    await writeBackup(backup);
    for (const item of backup.rows) {
      const updated = await tx.contentEntry.updateMany({ where: { id: item.id, kind: "CASE_STUDY", version: item.version },
        data: { ...item.after, version: { increment: 1 } } });
      if (!updated.count) throw new Error("Portfolio changed during migration.");
      await tx.auditEvent.create({ data: { actorId: null, module: "cms", action: "portfolio.content.migrate", recordId: item.id,
        before: { version: item.version }, after: { version: item.version + 1, batchId: backup.batchId } } });
    }
    return { scanned: rows.length, migrated: changes.length, batchId: backup.batchId };
  }, { isolationLevel: "Serializable", timeout: 30000 });
}

export async function restorePortfolioContent(client: PrismaClient, rawTarget: unknown, rawBackup: unknown) {
  const target = migrationTargetSchema.parse(rawTarget), backup = portfolioBackupSchema.parse(rawBackup);
  if (portfolioJsonFingerprint(target) !== portfolioJsonFingerprint(backup.target)) throw new Error("Backup target mismatch.");
  return client.$transaction(async tx => {
    await checkDatabase(tx, target);
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(104004003)`;
    for (const item of backup.rows) {
      const row = await tx.contentEntry.findUnique({ where: { id: item.id } });
      if (!row || row.kind !== "CASE_STUDY" || row.version !== item.version + 1 ||
        portfolioJsonFingerprint({ translations: row.translations, details: row.details }) !== portfolioJsonFingerprint(item.after))
        throw new Error("Restore would overwrite a newer or unmatched record.");
      const updated = await tx.contentEntry.updateMany({ where: { id: item.id, kind: "CASE_STUDY", version: row.version },
        data: { ...item.before, version: { increment: 1 } } });
      if (!updated.count) throw new Error("Portfolio changed during restore.");
      await tx.auditEvent.create({ data: { actorId: null, module: "cms", action: "portfolio.content.restore", recordId: item.id,
        before: { version: row.version }, after: { version: row.version + 1, batchId: backup.batchId } } });
    }
    return { restored: backup.rows.length, batchId: backup.batchId };
  }, { isolationLevel: "Serializable", timeout: 30000 });
}
