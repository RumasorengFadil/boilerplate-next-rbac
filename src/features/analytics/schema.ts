import { z } from "zod";
export const publicPathSchema = z.string().max(250).regex(/^\/(id|en)(?:\/(?:solutions|work|products|insights|about|contact|consultation|search)(?:\/[a-z0-9-]+)?)?$/);
export const analyticsInputSchema = z.object({
  consent: z.literal(true), kind: z.enum(["PAGE_VIEW", "CTA_CLICK", "WHATSAPP_CLICK", "AI_OPEN"]),
  path: publicPathSchema, target: publicPathSchema.optional(), language: z.enum(["id", "en"]),
}).strict();
