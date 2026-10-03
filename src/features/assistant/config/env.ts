import "server-only";
import { z } from "zod";
const envSchema = z.object({
  enabled: z.enum(["true", "false"]).default("false"),
  provider: z.enum(["openai", "openai-compatible", "anthropic", "gemini", "ollama"]).default("openai-compatible"),
  baseUrl: z.string().url().optional(), apiKey: z.string().optional(),
  embeddingUrl: z.string().url().optional(), embeddingKey: z.string().optional(),
  secureCookie: z.boolean(),
});
export function getAssistantEnv() {
  const result = envSchema.safeParse({
    enabled: process.env.AI_ASSISTANT_ENABLED, provider: process.env.LLM_PROVIDER,
    baseUrl: process.env.LLM_BASE_URL || undefined, apiKey: process.env.LLM_API_KEY || undefined,
    embeddingUrl: process.env.EMBEDDING_BASE_URL || undefined, embeddingKey: process.env.EMBEDDING_API_KEY || undefined,
    secureCookie: process.env.NODE_ENV === "production",
  });
  if (!result.success) throw new Error("Invalid AI infrastructure configuration.");
  const env = result.data;
  if (env.enabled === "true" && (!env.baseUrl || (!env.apiKey && env.provider !== "ollama"))) throw new Error("AI provider configuration is incomplete.");
  return env;
}
