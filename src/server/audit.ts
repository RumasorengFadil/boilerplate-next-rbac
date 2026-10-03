import "server-only";
import type { Prisma } from "@prisma/client";

// Only explicitly selected non-secret fields belong in audit snapshots.
export function recordAudit(tx: Prisma.TransactionClient, event: {
  actorId: string; action: string; module: string; recordId: string;
  before?: Prisma.InputJsonObject; after?: Prisma.InputJsonObject; ip?: string;
}) {
  return tx.auditEvent.create({ data: event });
}
