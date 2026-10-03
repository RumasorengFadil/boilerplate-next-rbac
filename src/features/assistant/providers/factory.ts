import "server-only";
import { getAssistantEnv } from "../config/env";
import type { AssistantRuntimeConfig } from "../config/schema";
import type { LlmProvider } from "./types";
import { OpenAiCompatibleProvider } from "./openai-compatible";
type Factory = (config: AssistantRuntimeConfig) => LlmProvider;
const factories = new Map<string, Factory>();
export function registerProvider(name: string, factory: Factory) { factories.set(name, factory); }
export function createProvider(config: AssistantRuntimeConfig): LlmProvider {
  const env = getAssistantEnv();
  if (env.enabled !== "true") throw new Error("Assistant disabled.");
  const custom = factories.get(env.provider); if (custom) return custom(config);
  if (["openai", "openai-compatible", "ollama"].includes(env.provider))
    return new OpenAiCompatibleProvider({ baseUrl: env.baseUrl!, apiKey: env.apiKey }, config);
  throw new Error("Provider adapter not configured.");
}
