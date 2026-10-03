import "server-only";
import { db } from "@/lib/db";
import { requirePermission } from "@/server/authorization";
import { recordAudit } from "@/server/audit";
import { capturedLeadSchema, leadMutationSchema, leadNoteSchema } from "./schema";
import { z } from "zod";
import { scoreLead } from "./scoring";
import type { Prisma } from "@prisma/client";

// Internal capture API: caller must verify origin, consent and ownership where relevant.
export async function captureLead(raw: unknown, visitorId?: string) {
  return db.$transaction(tx=>captureLeadInTransaction(tx, raw, visitorId));
}
export async function captureLeadInTransaction(tx: Prisma.TransactionClient, raw: unknown, visitorId?: string) {
  const { consent, targetDate, ...input } = capturedLeadSchema.parse(raw);
  if (!consent) throw new Error("Consent required.");
  if (visitorId) z.uuid().parse(visitorId);
  const data = { ...input, targetDate: targetDate ? new Date(`${targetDate}T00:00:00Z`) : null, visitorId };
  const scoring = await scoreLead(tx, data);
  const lead = await tx.lead.create({ data: { ...data, ...scoring, consentAt: new Date() } });
  await tx.leadActivity.create({ data: { leadId: lead.id, action: "lead.captured", details: { source: lead.source, language: lead.language } } });
  return lead;
}
export async function updateLead(raw: unknown) {
  const user = await requirePermission("leads:write");
  const input = leadMutationSchema.parse(raw);
  return db.$transaction(async tx => {
    const before = await tx.lead.findUniqueOrThrow({ where: { id: input.id } });
    if (input.ownerId && !await tx.user.findFirst({ where: { id: input.ownerId, role: { in: ["SUPER_ADMIN", "ADMIN", "MARKETING", "SALES"] } } })) throw new Error("Owner must be a sales-enabled account.");
    const result = await tx.lead.updateMany({ where: { id: input.id, version: input.version }, data: { status: input.status, ownerId: input.ownerId || null, version: { increment: 1 } } });
    if (!result.count) throw new Error("Lead changed; reload the latest version.");
    const details = { status: input.status, ownerId: input.ownerId || null };
    await tx.leadActivity.create({ data: { leadId: input.id, actorId: user.id, action: "lead.updated", details } });
    await recordAudit(tx, { actorId: user.id, module: "leads", recordId: input.id, action: "lead.updated", before: { status: before.status, ownerId: before.ownerId }, after: details });
    return tx.lead.findUniqueOrThrow({ where: { id: input.id } });
  });
}
export async function addLeadNote(raw: unknown) {
  const user = await requirePermission("leads:write");
  const input = leadNoteSchema.parse(raw);
  return db.$transaction(async tx => {
    await tx.lead.findUniqueOrThrow({ where: { id: input.id } });
    const note = await tx.leadNote.create({ data: { leadId: input.id, authorId: user.id, body: input.body } });
    await tx.leadActivity.create({ data: { leadId: input.id, actorId: user.id, action: "note.added", details: { noteId: note.id } } });
    await recordAudit(tx, { actorId: user.id, module: "leads", recordId: input.id, action: "note.added", after: { noteId: note.id } });
    return note;
  });
}
