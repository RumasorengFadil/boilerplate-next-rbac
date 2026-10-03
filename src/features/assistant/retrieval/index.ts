import "server-only";
import { createHash } from "crypto";
import { db } from "@/lib/db";
import { getKnowledge, type KnowledgeItem } from "./knowledge";
import { embed } from "./embeddings";
import { chunkText, cosine } from "./vector";
import type { AssistantRuntimeConfig } from "../config/schema";
export async function rebuildKnowledge(config: AssistantRuntimeConfig) {
  const chunks = getKnowledge().flatMap(item => chunkText(item.content).map((content, index) => ({
    ...item, content, sourceKey: item.href + ":" + item.source + ":" + item.title + ":" + index,
    contentHash: createHash("sha256").update(content).digest("hex"),
  })));
  const vectors = await embed(chunks.map(x => x.content), config);
  await db.$transaction(async tx => {
    await tx.aiKnowledgeChunk.deleteMany({});
    for (let i = 0; i < chunks.length; i++) await tx.aiKnowledgeChunk.create({ data: { ...chunks[i], embedding: vectors[i], embeddingModel: config.embeddingModel } });
  });
  return chunks.length;
}
export async function retrieve(query: string, config: AssistantRuntimeConfig): Promise<{ items: KnowledgeItem[]; degraded: boolean }> {
  if (!config.ragEnabled) return { items: [], degraded: false };
  try {
    const chunks = await db.aiKnowledgeChunk.findMany({ where: { embeddingModel: config.embeddingModel }, take: 2000 });
    if (!chunks.length) throw new Error("Index not initialized");
    const [vector] = await embed([query], config);
    const items = chunks.map(item => ({ item, score: cosine(vector, item.embedding as number[]) }))
      .filter(x => x.score >= config.ragMinScore).sort((a,b) => b.score-a.score)
      .slice(0, Math.min(config.ragTopK, config.ragMaxContextChunks)).map(x => x.item as KnowledgeItem);
    return { items, degraded: false };
  } catch {
    // Fail closed for unverifiable facts; lexical fallback is still sourced.
    const terms = query.toLowerCase().split(/[^\p{L}\p{N}]+/u).filter(x => x.length > 2);
    const items = getKnowledge().map(item => ({ item, score: terms.filter(term => (item.title+" "+item.content).toLowerCase().includes(term)).length }))
      .filter(x => x.score > 0).sort((a,b) => b.score-a.score).slice(0, config.ragTopK).map(x => x.item);
    return { items, degraded: true };
  }
}
