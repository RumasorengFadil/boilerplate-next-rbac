import { z } from "zod";

export const inquirySchema = z.object({
  name: z.string().trim().min(2).max(100),
  company: z.string().trim().max(120).optional(),
  email: z.string().trim().email(),
  whatsapp: z.string().trim().max(30).optional(),
  need: z.enum(["software", "automation", "ai", "data", "unsure"]),
  challenge: z.string().trim().min(20).max(2000),
  timeline: z.string().trim().max(80).optional(),
  budget: z.string().trim().max(80).optional(),
});

export type InquiryInput = z.infer<typeof inquirySchema>;
