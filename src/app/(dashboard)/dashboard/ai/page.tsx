import { requirePermission } from "@/server/authorization";
import { getAssistantRuntimeConfig } from "@/features/assistant/config/runtime";
import { AiSettingsForm } from "@/features/assistant/config/form";
import { db } from "@/lib/db";
export default async function AiConfigurationPage() {
  await requirePermission("ai:manage");
  const config = await getAssistantRuntimeConfig();
  const [conversations, leads, chunks] = config.metricsEnabled ? await Promise.all([db.aiConversation.count(), db.lead.count({ where: { source: "AI_ASSISTANT" } }), db.aiKnowledgeChunk.count()]) : ["—", "—", "—"];
  return <section><h1 className="page-title">Konfigurasi LunaBiner AI</h1><div className="my-6 grid gap-4 sm:grid-cols-3">{[["Percakapan",conversations],["Lead AI",leads],["Knowledge chunks",chunks]].map(([label,value])=><article key={label} className="card"><p>{label}</p><p className="mt-2 text-3xl font-semibold">{value}</p></article>)}</div><AiSettingsForm config={config} /></section>;
}
