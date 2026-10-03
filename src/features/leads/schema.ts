import { z } from "zod";
export const leadStatuses = ["NEW", "CONTACTED", "QUALIFIED", "PROPOSAL", "NEGOTIATION", "WON", "LOST"] as const;
export const leadMutationSchema = z.object({
  id: z.uuid(), version: z.coerce.number().int().min(1), status: z.enum(leadStatuses),
  ownerId: z.string().trim().max(128).default(""),
}).strict();
export const leadNoteSchema = z.object({ id: z.uuid(), body: z.string().trim().min(2).max(4000) }).strict();
export const capturedLeadSchema = z.object({
  consent: z.literal(true), name: z.string().trim().min(2).max(100), company: z.string().trim().max(120).optional(),
  email: z.string().trim().email().max(254), phone: z.string().trim().max(30).optional(),
  serviceInterest: z.string().trim().max(100).optional(), challenge: z.string().trim().min(10).max(2000),
  budget: z.string().trim().max(80).optional(), timeline: z.string().trim().max(80).optional(),
  sourcePage: z.string().max(250).regex(/^\/(id|en)\/[a-z0-9/-]*$/).optional(),
  source: z.enum(["CONTACT", "AI_ASSISTANT", "CONSULTATION", "WAITLIST"]), language: z.enum(["id", "en"]).default("id"),
  conversationId: z.uuid().optional(),
}).strict();
