import "server-only";
import { z } from "zod";
import { db } from "@/lib/db";
import { requirePermission } from "@/server/authorization";

export async function acquisitionMetrics(rawDays: unknown = 30) {
  await requirePermission("analytics:read");
  const days = z.coerce.number().int().min(1).max(90).parse(rawDays);
  const since = new Date(Date.now() - days*86400000);
  const [visitors, converted, pages, events, leads, qualified, conversations, aiLeads, topics, statuses] = await Promise.all([
    db.$queryRaw<{ count: bigint }[]>`SELECT COUNT(DISTINCT "visitorId") AS count FROM "AnalyticsEvent" WHERE "createdAt" >= ${since}`,
    db.$queryRaw<{ count: bigint }[]>`SELECT COUNT(DISTINCT l."visitorId") AS count FROM "Lead" l WHERE l."createdAt" >= ${since} AND l."visitorId" IS NOT NULL AND EXISTS (SELECT 1 FROM "AnalyticsEvent" a WHERE a."visitorId" = l."visitorId" AND a."createdAt" >= ${since})`,
    db.analyticsEvent.groupBy({ by: ["path"], where: { createdAt: { gte: since }, kind: "PAGE_VIEW" }, _count: { _all: true }, orderBy: { _count: { path: "desc" } }, take: 20 }),
    db.analyticsEvent.groupBy({ by: ["kind"], where: { createdAt: { gte: since } }, _count: { _all: true } }),
    db.lead.count({ where: { createdAt: { gte: since } } }),
    db.lead.count({ where: { createdAt: { gte: since }, status: { in: ["QUALIFIED", "PROPOSAL", "NEGOTIATION", "WON"] } } }),
    db.aiConversation.count({ where: { createdAt: { gte: since } } }),
    db.$queryRaw<{ count: bigint }[]>`SELECT COUNT(DISTINCT l."conversationId") AS count FROM "Lead" l WHERE l."createdAt" >= ${since} AND l.source = 'AI_ASSISTANT' AND EXISTS (SELECT 1 FROM "AiConversation" c WHERE c.id = l."conversationId" AND c."createdAt" >= ${since})`,
    db.aiMessage.findMany({ where: { createdAt: { gte: since }, role: "USER" }, select: { content: true, metadata: true }, orderBy: { createdAt: "desc" }, take: 5000 }),
    db.aiMessage.findMany({ where: { createdAt: { gte: since }, role: "ASSISTANT" }, select: { metadata: true }, orderBy: { createdAt: "desc" }, take: 5000 }),
  ]);
  const counts = Object.fromEntries(events.map(event => [event.kind, event._count._all]));
  const topicCounts: Record<string, number> = {};
  for (const message of topics) {
    const text = message.content.toLowerCase();
    const label = /invoice|document|dokumen|ocr/.test(text) ? "Dokumen & invoice" : /automat|otomasi|manual|workflow/.test(text) ? "Automation" : /rag|\bai\b|knowledge|assistant/.test(text) ? "AI & knowledge" : /integrasi|integration|sistem|system/.test(text) ? "Software & integration" : /harga|pricing|biaya|cost/.test(text) ? "Pricing & consultation" : "Lainnya";
    topicCounts[label] = (topicCounts[label] ?? 0) + 1;
  }
  const metadata = statuses.map(message => message.metadata as { degradedRetrieval?: boolean; responseType?: string } | null);
  const recommended: Record<string, number> = {};
  for (const message of statuses) {
    const cards = (message.metadata as { recommendations?: { title: string }[] } | null)?.recommendations ?? [];
    for (const title of ["Software Development", "Business Automation", "AI Solutions", "Data & Integration"]) if (cards.some(card => card.title === title)) recommended[title] = (recommended[title] ?? 0)+1;
  }
  const failed = topics.filter(message => (message.metadata as { status?: string } | null)?.status === "FAILED").length;
  return { days, since, visitors: Number(visitors[0].count), convertedVisitors: Number(converted[0].count), pageViews: counts.PAGE_VIEW ?? 0, ctaClicks: counts.CTA_CLICK ?? 0, whatsappClicks: counts.WHATSAPP_CLICK ?? 0, aiOpens: counts.AI_OPEN ?? 0,
    leads, qualified, conversations, aiConvertedConversations: Number(aiLeads[0].count), pages, topics: Object.entries(topicCounts).sort((a,b)=>b[1]-a[1]), failed,
    degraded: metadata.filter(item=>item?.degradedRetrieval).length, unanswered: metadata.filter(item=>item?.responseType==="UNVERIFIED").length,
    sampledMessages: topics.length, recommended: Object.entries(recommended).sort((a,b)=>b[1]-a[1]),
  };
}
