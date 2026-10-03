import "server-only";
import { db } from "@/lib/db";
import { createAssistantLeadSchema } from "../lead-schema";
export { createAssistantLeadSchema } from "../lead-schema";
export async function createAssistantLead(input: unknown, owner: string) {
  const { consent, ...lead } = createAssistantLeadSchema.parse(input);
  if (!consent) throw new Error("Consent required");
  const conversation = await db.aiConversation.findFirst({ where: { id: lead.conversationId, sessionId: owner } });
  if (!conversation) throw new Error("Conversation not found");
  const score = (lead.company ? 10 : 0) + (lead.serviceInterest ? 10 : 0) + (lead.challenge.length > 80 ? 20 : 0);
  return db.lead.create({ data: { ...lead, source: "AI_ASSISTANT", score, consentAt: new Date() } });
}
