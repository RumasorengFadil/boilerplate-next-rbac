import "server-only";
import { z } from "zod";
import { getAssistantEnv } from "../config/env";
import type { AssistantRuntimeConfig } from "../config/schema";
const responseSchema = z.object({ data: z.array(z.object({ index: z.number(), embedding: z.array(z.number().finite()).min(1) })) });
export async function embed(input: string[], config: AssistantRuntimeConfig) {
  const env = getAssistantEnv();
  if (!env.embeddingUrl || !env.embeddingKey) throw new Error("Embeddings are not configured.");
  const response = await fetch(env.embeddingUrl, { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${env.embeddingKey}` },
    body: JSON.stringify({ model: config.embeddingModel, input }), signal: AbortSignal.timeout(config.timeoutMs) });
  if (!response.ok) throw new Error("Embedding provider unavailable.");
  const data = responseSchema.parse(await response.json()).data.sort((a, b) => a.index - b.index);
  if (data.length !== input.length) throw new Error("Embedding batch incomplete.");
  return data.map(x => x.embedding);
}
