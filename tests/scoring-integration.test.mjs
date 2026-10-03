import "./server-loader.mjs";
import test from "node:test";
import assert from "node:assert/strict";
import {randomUUID,createHash} from "node:crypto";
const {db}=await import("../src/lib/db.ts");
const {saveScoringConfig,recalculateLeadScore}=await import("../src/features/leads/scoring.ts");
const {captureLead}=await import("../src/features/leads/service.ts");
const {defaultScoringRules}=await import("../src/features/leads/scoring-schema.ts");
test("scoring config authorization, snapshot, consent behavior, versions and explicit recalculation",async()=>{
  assert.equal(await db.leadScoreConfig.count(),0,"Use fresh isolated DB; never run against user's configured DB");
  const users=[],leads=[],tokens={},visitor=randomUUID();let configId;
  try{
    for(const role of ["ADMIN","SALES"]){const token=randomUUID();const user=await db.user.create({data:{name:"Score test",email:token+"@example.test",passwordHash:"synthetic",role}});users.push(user.id);tokens[role]=token;await db.session.create({data:{userId:user.id,tokenHash:createHash("sha256").update(token).digest("hex"),expiresAt:new Date(Date.now()+60000)}});}
    const rules={...defaultScoringRules,enabled:true,weights:{enterprise:20,clearProblem:20,budgetProvided:10,nearTimeline:10,serviceSelected:10,consultation:25,caseViewed:10,aiEngaged:5}};
    globalThis.__phase2TestCookie=tokens.SALES;
    await assert.rejects(()=>saveScoringConfig({version:0,rules}),/Unauthorized/);
    globalThis.__phase2TestCookie=tokens.ADMIN;
    const config=await saveScoringConfig({version:0,rules});configId=config.id;
    await assert.rejects(()=>saveScoringConfig({version:0,rules}),/changed/);
    await db.analyticsEvent.create({data:{visitorId:visitor,sessionId:randomUUID(),kind:"PAGE_VIEW",path:"/id/work/example",language:"id"}});
    const input={name:"Test Visitor",company:"Enterprise name alone",email:randomUUID()+"@example.test",challenge:"This is a sufficiently clear problem description that contains more than eighty characters.",timeline:"Less than three months",source:"CONTACT",consent:true};
    const unknown=await captureLead(input);leads.push(unknown.id);assert.equal(unknown.score,20);assert.equal(unknown.scoreDetails.observed.enterprise,false);assert.equal(unknown.scoreDetails.observed.nearTimeline,false);assert.equal(unknown.scoreDetails.observed.caseViewed,false);
    const attributed=await captureLead({...input,companySize:"ENTERPRISE",budget:"Provided",targetDate:new Date(Date.now()+7*86400000).toISOString().slice(0,10)},visitor);leads.push(attributed.id);assert.equal(attributed.score,70);assert.equal(attributed.scoreDetails.configVersion,1);
    await saveScoringConfig({version:1,rules:{...rules,enabled:false}});
    assert.equal((await db.lead.findUniqueOrThrow({where:{id:attributed.id}})).score,70);
    globalThis.__phase2TestCookie=tokens.SALES;
    assert.equal((await recalculateLeadScore({id:attributed.id,version:1})).score,0);
    await assert.rejects(()=>recalculateLeadScore({id:attributed.id,version:1}),/changed/);
    assert.equal(await db.leadActivity.count({where:{leadId:attributed.id,action:"score.recalculated"}}),1);
  }finally{
    await db.auditEvent.deleteMany({where:{OR:[{recordId:{in:leads}},{recordId:configId ?? "no-fixture"}]}});
    await db.lead.deleteMany({where:{id:{in:leads}}});await db.analyticsEvent.deleteMany({where:{visitorId:visitor}});
    if(configId)await db.leadScoreConfig.delete({where:{id:configId}});
    await db.user.deleteMany({where:{id:{in:users}}});globalThis.__phase2TestCookie=undefined;await db.$disconnect();
  }
});
