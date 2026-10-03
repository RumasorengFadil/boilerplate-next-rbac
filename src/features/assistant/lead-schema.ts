import { z } from "zod";
export const createAssistantLeadSchema = z.object({
  consent: z.literal(true), name: z.string().trim().min(2).max(100),
  email: z.string().trim().email(), company: z.string().trim().max(120).optional(),
  phone: z.string().trim().max(30).optional(), challenge: z.string().trim().min(10).max(2000),
  serviceInterest: z.string().trim().max(100).optional(),
  conversationId: z.string().uuid(), language: z.enum(["id","en"]).default("id"),
}).strict();
