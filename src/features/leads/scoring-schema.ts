import { z } from "zod";
export const scoreSignals = ["enterprise", "clearProblem", "budgetProvided", "nearTimeline", "serviceSelected", "consultation", "caseViewed", "aiEngaged"] as const;
export const scoringRulesSchema = z.object({
  enabled: z.boolean(),
  problemMinChars: z.number().int().min(20).max(2000),
  timelineDays: z.number().int().min(1).max(365),
  behaviorDays: z.number().int().min(1).max(90),
  weights: z.object(Object.fromEntries(scoreSignals.map(signal => [signal, z.number().int().min(0).max(100)])) as Record<typeof scoreSignals[number], z.ZodNumber>).strict(),
}).strict();
export const defaultScoringRules = scoringRulesSchema.parse({ enabled: false, problemMinChars: 80, timelineDays: 90, behaviorDays: 30, weights: Object.fromEntries(scoreSignals.map(signal=>[signal,0])) });
export const scoringMutationSchema = z.object({ version: z.number().int().min(0), rules: scoringRulesSchema }).strict();
export function calculateScore(rules: z.infer<typeof scoringRulesSchema>, observed: Record<typeof scoreSignals[number], boolean>) {
  const reasons = scoreSignals.filter(signal=>rules.enabled && observed[signal] && rules.weights[signal]>0).map(signal=>({ signal, points: rules.weights[signal] }));
  const score = Math.min(100,reasons.reduce((sum,reason)=>sum+reason.points,0));
  return { score, classification: score<=30 ? "Low" : score<=60 ? "Medium" : score<=80 ? "High" : "Priority", reasons, observed, enabled: rules.enabled };
}
