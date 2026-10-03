import { z } from "zod";
export const assistantPromptSchema = z.object({ prompt: z.string().trim().min(8).max(1000), conversationId: z.string().uuid().optional(), language: z.enum(["id", "en"]).default("id") });
