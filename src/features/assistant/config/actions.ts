"use server";
import { db } from "@/lib/db";
import { requirePermission } from "@/server/authorization";
import { settingsSchema } from "./schema";
import { getAssistantRuntimeConfig } from "./runtime";
import { rebuildKnowledge } from "../retrieval";
import { revalidatePath } from "next/cache";
export async function saveAiSettings(_: { message: string }, form: FormData) {
  const user = await requirePermission("ai:manage");
  try {
    const raw = JSON.parse(String(form.get("settings")));
    const config = settingsSchema.parse(raw);
    const current = await db.aiConfiguration.findFirst({ orderBy: { updatedAt: "desc" } });
    const data = { activeModel: config.activeModel, temperature: config.temperature, maxOutputTokens: config.maxOutputTokens,
      contextMessageLimit: config.contextMessageLimit, ragEnabled: config.ragEnabled, systemPrompt: config.systemPrompt,
      settings: config, updatedBy: user.id };
    await db.$transaction(async tx => {
      if (current) await tx.aiConfiguration.update({ where: { id: current.id }, data });
      else await tx.aiConfiguration.create({ data });
      await tx.aiAuditEvent.create({ data: { actorId: user.id, action: "AI_CONFIG_UPDATED" } });
    });
    revalidatePath("/dashboard/ai");
    return { message: "Konfigurasi berhasil disimpan." };
  } catch { return { message: "Gagal menyimpan. Periksa JSON dan rentang pengaturan." }; }
}
export async function indexKnowledge(_: { message: string }) {
  const user = await requirePermission("ai:manage");
  try {
    const count = await rebuildKnowledge(await getAssistantRuntimeConfig());
    await db.aiAuditEvent.create({ data: { actorId: user.id, action: "AI_KNOWLEDGE_REINDEXED" } });
    return { message: `${count} chunks berhasil diindeks.` };
  } catch { return { message: "Index belum diperbarui. Periksa konfigurasi embedding dan koneksi database." }; }
}
export async function purgeExpired(_: { message: string }) {
  const user = await requirePermission("ai:manage");
  const config = await getAssistantRuntimeConfig();
  await db.aiConversation.deleteMany({ where: { updatedAt: { lt: new Date(Date.now()-config.conversationRetentionDays*86400000) } } });
  await db.aiRateBucket.deleteMany({ where: { expiresAt: { lt: new Date() } } });
  await db.aiAuditEvent.create({ data: { actorId: user.id, action: "AI_RETENTION_CLEANUP" } });
  return { message: "Percakapan kedaluwarsa dan bucket lama dibersihkan." };
}
