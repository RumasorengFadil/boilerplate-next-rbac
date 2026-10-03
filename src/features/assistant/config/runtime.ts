import "server-only";
import { db } from "@/lib/db";
import { defaultSettings, settingsSchema } from "./schema";
export async function getAssistantRuntimeConfig() {
  const config = await db.aiConfiguration.findFirst({ orderBy: { updatedAt: "desc" } });
  if (!config) return defaultSettings;
  return settingsSchema.parse({ ...defaultSettings, ...(config.settings as object ?? {}),
    activeModel: config.activeModel, temperature: config.temperature,
    maxOutputTokens: config.maxOutputTokens, contextMessageLimit: config.contextMessageLimit,
    ragEnabled: config.ragEnabled, systemPrompt: config.systemPrompt ?? "" });
}
