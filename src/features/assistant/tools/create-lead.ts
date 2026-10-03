import "server-only";
import { db } from "@/lib/db";
import { createAssistantLeadSchema } from "../lead-schema";
import { captureLead } from "@/features/leads/service";
export { createAssistantLeadSchema } from "../lead-schema";
export async function createAssistantLead(input: unknown, owner: string, visitorId?: string) {
  const { consent, ...lead } = createAssistantLeadSchema.parse(input);
  if (!consent) throw new Error("Consent required");
  const conversation = await db.aiConversation.findFirst({ where: { id: lead.conversationId, sessionId: owner } });
  if (!conversation) throw new Error("Conversation not found");
  return captureLead({ ...lead, consent: true, source: "AI_ASSISTANT" }, visitorId);
}
