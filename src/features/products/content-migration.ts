import { randomUUID } from "node:crypto";
import type { PrismaClient, Prisma } from "@prisma/client";
import { z } from "zod";
import { detailsSchema } from "../cms/schema";
import { productExamples } from "./examples";
import { previewProductSummaryConversion, productJsonFingerprint, productSummaryContentSchema, validateProductSummaryPublication } from "./summary-content";

export const productMigrationTargetSchema = z.object({ host: z.enum(["localhost", "127.0.0.1", "[::1]"]), port: z.number().int().min(1).max(65535), database: z.string().regex(/^[a-zA-Z0-9_-]{1,100}$/), schema: z.string().regex(/^[a-zA-Z0-9_]{1,100}$/).default("public") }).strict();
const payloadSchema = z.object({ translations: z.object({ id: z.record(z.string(), z.json()), en: z.record(z.string(), z.json()) }).strict(), details: z.record(z.string(), z.json()) }).strict();
export function convertProductSummary(row: { id: string; translations: unknown; details: unknown }) {
  const preview = previewProductSummaryConversion({ ...row, kind: "PRODUCT" });
  if (!preview.ready) throw new Error("Product content needs review before migration.");
  detailsSchema.parse(row.details);
  const details = { ...row.details as Record<string, unknown> };
  const example = productExamples.find(sample => sample.id === row.id);
  if (!Object.hasOwn(details, "productFeatures") && example && productJsonFingerprint(details.features) === productJsonFingerprint(example.features.en))
    preview.content.productFeatures = { id: [...example.features.id], en: [...example.features.en] };
  details.productFeatures = preview.content.productFeatures;
  delete details.features;
  const after = payloadSchema.parse({ translations: preview.content.translations, details });
  return { ...after, changed: productJsonFingerprint(after) !== productJsonFingerprint({ translations: row.translations, details: row.details }) };
}
export const productBackupSchema = z.object({ format: z.literal("lunabiner-product-summary-v1"), batchId: z.uuid(), createdAt: z.iso.datetime(), target: productMigrationTargetSchema,
  rows: z.array(z.object({ id: z.uuid(), version: z.number().int().positive(), before: payloadSchema, after: payloadSchema }).strict()).max(10000),
}).strict().superRefine((backup, context) => {
  if (new Set(backup.rows.map(row => row.id)).size !== backup.rows.length) context.addIssue({ code: "custom", message: "Duplicate rows." });
  for (const row of backup.rows) try {
    const converted = convertProductSummary({ id: row.id, ...row.before });
    if (!converted.changed || productJsonFingerprint({ translations: converted.translations, details: converted.details }) !== productJsonFingerprint(row.after))
      context.addIssue({ code: "custom", message: "Invalid conversion." });
  } catch { context.addIssue({ code: "custom", message: "Invalid content." }); }
});
export type ProductBackup = z.infer<typeof productBackupSchema>;
async function checkTarget(tx: Prisma.TransactionClient, target: z.infer<typeof productMigrationTargetSchema>) {
  const rows = await tx.$queryRaw<Array<{ name: string; schema: string }>>`SELECT current_database() AS name, current_schema() AS schema`;
  if (rows[0]?.name !== target.database || rows[0]?.schema !== target.schema) throw new Error("Database target mismatch.");
}
export async function previewProducts(client: PrismaClient) {
  return (await client.contentEntry.findMany({ where: { kind: "PRODUCT" }, orderBy: { id: "asc" } })).map(row => {
    try { const result = convertProductSummary(row); if (["PUBLISHED", "SCHEDULED"].includes(row.status)) validateProductSummaryPublication(productSummaryContentSchema.parse({ translations: result.translations, productFeatures: result.details.productFeatures }));
      return { id: row.id, version: row.version, changed: result.changed, conflict: false }; }
    catch { return { id: row.id, version: row.version, changed: false, conflict: true }; }
  });
}
// Operator CLI only, not an HTTP/Server Action entry point.
export async function migrateProductSummary(client: PrismaClient, rawTarget: unknown, writeBackup: (backup: ProductBackup) => Promise<void>) {
  const target = productMigrationTargetSchema.parse(rawTarget);
  return client.$transaction(async tx => {
    await checkTarget(tx, target); await tx.$executeRaw`SELECT pg_advisory_xact_lock(105003003)`;
    const rows = await tx.contentEntry.findMany({ where: { kind: "PRODUCT" }, orderBy: { id: "asc" }, take: 10001 });
    if (rows.length > 10000) throw new Error("Inventory too large.");
    const changes = rows.map(row => {
      const result = convertProductSummary(row);
      if (["PUBLISHED", "SCHEDULED"].includes(row.status)) validateProductSummaryPublication(productSummaryContentSchema.parse({ translations: result.translations, productFeatures: result.details.productFeatures }));
      return { row, result };
    }).filter(item => item.result.changed);
    if (!changes.length) return { scanned: rows.length, migrated: 0, batchId: null };
    const backup = productBackupSchema.parse({ format: "lunabiner-product-summary-v1", batchId: randomUUID(), createdAt: new Date().toISOString(), target,
      rows: changes.map(({ row, result }) => ({ id: row.id, version: row.version, before: { translations: row.translations, details: row.details }, after: { translations: result.translations, details: result.details } })) });
    await writeBackup(backup);
    for (const item of backup.rows) {
      if (!(await tx.contentEntry.updateMany({ where: { id: item.id, kind: "PRODUCT", version: item.version }, data: { ...item.after, version: { increment: 1 } } })).count) throw new Error("Product changed during migration.");
      await tx.auditEvent.create({ data: { actorId: null, module: "cms", action: "product.content.migrate", recordId: item.id, before: { version: item.version }, after: { version: item.version + 1, batchId: backup.batchId } } });
    }
    return { scanned: rows.length, migrated: changes.length, batchId: backup.batchId };
  }, { isolationLevel: "Serializable", timeout: 30000 });
}
export async function restoreProductSummary(client: PrismaClient, rawTarget: unknown, rawBackup: unknown) {
  const target = productMigrationTargetSchema.parse(rawTarget), backup = productBackupSchema.parse(rawBackup);
  if (productJsonFingerprint(target) !== productJsonFingerprint(backup.target)) throw new Error("Backup target mismatch.");
  return client.$transaction(async tx => {
    await checkTarget(tx, target); await tx.$executeRaw`SELECT pg_advisory_xact_lock(105003003)`;
    for (const item of backup.rows) {
      const row = await tx.contentEntry.findUnique({ where: { id: item.id } });
      if (!row || row.kind !== "PRODUCT" || row.version !== item.version + 1 || productJsonFingerprint({ translations: row.translations, details: row.details }) !== productJsonFingerprint(item.after)) throw new Error("Restore would overwrite newer or unmatched content.");
      if (!(await tx.contentEntry.updateMany({ where: { id: row.id, kind: "PRODUCT", version: row.version }, data: { ...item.before, version: { increment: 1 } } })).count) throw new Error("Product changed during restore.");
      await tx.auditEvent.create({ data: { actorId: null, module: "cms", action: "product.content.restore", recordId: row.id, before: { version: row.version }, after: { version: row.version + 1, batchId: backup.batchId } } });
    }
    return { restored: backup.rows.length };
  }, { isolationLevel: "Serializable", timeout: 30000 });
}
