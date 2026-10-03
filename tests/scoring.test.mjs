import "./server-loader.mjs";
import test from "node:test";
import assert from "node:assert/strict";
const {calculateScore,defaultScoringRules,scoreSignals,scoringRulesSchema}=await import("../src/features/leads/scoring-schema.ts");
test("scoring is explicit, disabled by default, bounded and unknown signals add nothing",()=>{
  const known=Object.fromEntries(scoreSignals.map(signal=>[signal,true]));
  assert.equal(calculateScore(defaultScoringRules,known).score,0);
  const rules=scoringRulesSchema.parse({...defaultScoringRules,enabled:true,weights:Object.fromEntries(scoreSignals.map(signal=>[signal,30]))});
  assert.equal(calculateScore(rules,known).score,100);
  const unknown=Object.fromEntries(scoreSignals.map(signal=>[signal,false]));
  assert.deepEqual(calculateScore(rules,unknown).reasons,[]);
  assert.equal(calculateScore(rules,{...unknown,caseViewed:true}).score,30);
  assert.equal(scoringRulesSchema.safeParse({...rules,weights:{...rules.weights,enterprise:101}}).success,false);
});
