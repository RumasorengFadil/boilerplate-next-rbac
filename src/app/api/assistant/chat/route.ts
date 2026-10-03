import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { assistantPromptSchema } from "@/features/assistant/schema";
import { respondToAssistant } from "@/features/assistant/orchestration/respond";
import { getAssistantRuntimeConfig } from "@/features/assistant/config/runtime";
import { getAssistantEnv } from "@/features/assistant/config/env";
import { acquireConversation, recentContext } from "@/features/assistant/conversations/service";
import { assertOrigin, friendlyError, rateLimit, readBody, RequestError, session } from "@/features/assistant/security";
export async function POST(request: Request) {
  let id: string | undefined; let language = "id";
  try {
    assertOrigin(request);
    const input = assistantPromptSchema.safeParse(await readBody(request));
    if (!input.success) throw new RequestError(400);
    language = input.data.language;
    if (getAssistantEnv().enabled !== "true") throw new RequestError(503);
    const config = await getAssistantRuntimeConfig();
    const owner = (await session(true))!;
    await rateLimit(request, config.rateLimitPerMinute, owner);
    const conversation = await acquireConversation(owner, input.data.conversationId, language, config);
    id = conversation.id;
    await db.aiMessage.create({ data: { conversationId: id, role: "USER", content: input.data.prompt } });
    const context = await recentContext(id, config);
    const run = async (onDelta?: (text: string) => void) => {
      const result = await respondToAssistant(context.history, config, language, context.summary, onDelta);
      await db.aiMessage.create({ data: { conversationId: id!, role: "ASSISTANT", content: result.answer,
        metadata: { recommendations: result.recommendations, ...(config.metricsEnabled ? { degradedRetrieval: result.degraded } : {}) } } });
      await db.aiConversation.update({ where: { id }, data: { busyUntil: null, language } });
      return result;
    };
    if (config.streamingEnabled) {
      const encoder = new TextEncoder();
      const stream = new ReadableStream({ async start(controller) {
        const emit = (event: object) => controller.enqueue(encoder.encode(JSON.stringify(event) + "\n"));
        try { emit({ conversationId: id }); const result = await run(text => emit({ delta: text })); emit({ ...result, conversationId: id, done: true }); }
        catch { await db.aiConversation.update({ where: { id }, data: { busyUntil: null } }).catch(() => undefined); emit({ error: friendlyError(language), done: true }); }
        finally { controller.close(); }
      } });
      return new Response(stream, { headers: { "Content-Type": "application/x-ndjson", "Cache-Control": "no-store" } });
    }
    return NextResponse.json({ ...await run(), conversationId: id }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    if (id) await db.aiConversation.update({ where: { id }, data: { busyUntil: null } }).catch(() => undefined);
    return NextResponse.json({ error: friendlyError(language), conversationId: id }, { status: error instanceof RequestError ? error.status : 503 });
  }
}
