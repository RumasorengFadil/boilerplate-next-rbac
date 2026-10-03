import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { session, friendlyError } from "@/features/assistant/security";
import { getAssistantRuntimeConfig } from "@/features/assistant/config/runtime";
export async function GET(_: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const id = z.string().uuid().safeParse((await context.params).id); const owner = await session();
    if (!id.success || !owner) return NextResponse.json({ error: "Not found" }, { status: 404 });
    const config = await getAssistantRuntimeConfig();
    const conversation = await db.aiConversation.findFirst({ where: { id: id.data, sessionId: owner, status: "ACTIVE", updatedAt: { gt: new Date(Date.now() - config.conversationRetentionDays * 86400000) } },
      include: { messages: { orderBy: [{ createdAt: "desc" }, { id: "desc" }], take: 100, select: { id: true, role: true, content: true, metadata: true } } } });
    return conversation ? NextResponse.json({ messages: conversation.messages.reverse() }, { headers: { "Cache-Control": "no-store" } }) : NextResponse.json({ error: "Not found" }, { status: 404 });
  } catch { return NextResponse.json({ error: friendlyError() }, { status: 503 }); }
}
