import "server-only";
import type { Prisma } from "@prisma/client";
import { z } from "zod";
import { db } from "@/lib/db";
import { requirePermission } from "@/server/authorization";
import { recordAudit } from "@/server/audit";
import { calculateScore, defaultScoringRules, scoringRulesSchema, scoringMutationSchema } from "./scoring-schema";

export async function scoreLead(tx: Prisma.TransactionClient, lead: { companySize?: string | null; challenge: string; budget?: string | null; targetDate?: Date | null; serviceInterest?: string | null; source: string; conversationId?: string | null; visitorId?: string | null }, now = new Date()) {
  const config = await tx.leadScoreConfig.findUnique({ where: { key: "global" } });
  const rules = config ? scoringRulesSchema.parse(config.rules) : defaultScoringRules;
  const since = new Date(now.getTime()-rules.behaviorDays*86400000);
  const [caseViewed, aiEngaged] = await Promise.all([
    lead.visitorId ? tx.analyticsEvent.count({ where: { visitorId: lead.visitorId, kind: "PAGE_VIEW", createdAt: { gte: since, lte: now }, OR: [{path:{startsWith:"/id/work/"}},{path:{startsWith:"/en/work/"}}] } }) : 0,
    lead.conversationId ? tx.aiMessage.count({ where: { conversationId: lead.conversationId, role: "USER", createdAt: { gte: since, lte: now } } }) : 0,
  ]);
  const result = calculateScore(rules, {
    enterprise: lead.companySize === "ENTERPRISE", clearProblem: lead.challenge.trim().length>=rules.problemMinChars,
    budgetProvided: !!lead.budget?.trim(), nearTimeline: !!lead.targetDate && lead.targetDate>=now && lead.targetDate.getTime()-now.getTime()<=rules.timelineDays*86400000,
    serviceSelected: !!lead.serviceInterest?.trim() && lead.serviceInterest!=="unsure", consultation: lead.source==="CONSULTATION", caseViewed: caseViewed>0, aiEngaged: aiEngaged>0,
  });
  return { score: result.score, scoreDetails: { ...result, configId: config?.id ?? null, configVersion: config?.version ?? 0, evaluatedAt: now.toISOString() } };
}
export async function getScoringConfig() {
  await requirePermission("operations:manage");
  const config = await db.leadScoreConfig.findUnique({where:{key:"global"}});
  return {version:config?.version ?? 0, rules:config ? scoringRulesSchema.parse(config.rules) : defaultScoringRules};
}
export async function saveScoringConfig(raw: unknown) {
  const user = await requirePermission("operations:manage");
  const input = scoringMutationSchema.parse(raw);
  return db.$transaction(async tx=>{
    const before = await tx.leadScoreConfig.findUnique({where:{key:"global"}});
    if ((before?.version ?? 0)!==input.version) throw new Error("Configuration changed; reload.");
    if (before) {
      const changed = await tx.leadScoreConfig.updateMany({where:{id:before.id,version:input.version},data:{rules:input.rules,version:{increment:1}}});
      if (!changed.count) throw new Error("Configuration changed; reload.");
    } else await tx.leadScoreConfig.create({data:{rules:input.rules}});
    const after = await tx.leadScoreConfig.findUniqueOrThrow({where:{key:"global"}});
    await recordAudit(tx,{actorId:user.id,module:"leads",recordId:after.id,action:"scoring.configured",before:before ? {rules:before.rules,version:before.version} : undefined,after:{rules:after.rules,version:after.version}});
    return after;
  });
}
export async function recalculateLeadScore(raw: unknown) {
  const user = await requirePermission("leads:write");
  const {id,version}=z.object({id:z.uuid(),version:z.coerce.number().int().min(1)}).strict().parse(raw);
  return db.$transaction(async tx=>{
    const before=await tx.lead.findUniqueOrThrow({where:{id}});
    const scoring=await scoreLead(tx,before);
    const changed=await tx.lead.updateMany({where:{id,version},data:{...scoring,version:{increment:1}}});
    if (!changed.count) throw new Error("Lead changed; reload.");
    await tx.leadActivity.create({data:{leadId:id,actorId:user.id,action:"score.recalculated",details:scoring.scoreDetails}});
    await recordAudit(tx,{actorId:user.id,module:"leads",recordId:id,action:"score.recalculated",before:{score:before.score},after:{score:scoring.score}});
    return scoring;
  });
}
