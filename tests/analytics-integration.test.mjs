import "./server-loader.mjs";
import test from "node:test";
import assert from "node:assert/strict";
import { randomUUID, createHash } from "node:crypto";
const {db}=await import("../src/lib/db.ts");
const {acquisitionMetrics}=await import("../src/features/analytics/metrics.ts");
test("metrics are guarded, consent-attributed and avoid exposing raw questions",async()=>{
  const userIds=[],leadIds=[],eventIds=[];const visitor=randomUUID(),session=randomUUID();
  try{
    for(const role of ["MEMBER","SALES"]){const token=randomUUID();const user=await db.user.create({data:{name:"Metric test",email:token+"@example.test",passwordHash:"synthetic-test-only",role}});userIds.push(user.id);await db.session.create({data:{userId:user.id,tokenHash:createHash("sha256").update(token).digest("hex"),expiresAt:new Date(Date.now()+60000)}});globalThis.__phase2TestCookie=token;if(role==="MEMBER")await assert.rejects(()=>acquisitionMetrics(),/Unauthorized/);}
    const before=await acquisitionMetrics();
    const event=await db.analyticsEvent.create({data:{visitorId:visitor,sessionId:session,kind:"PAGE_VIEW",path:"/id/solutions",language:"id"}});eventIds.push(event.id);
    for(const attributed of [true,false]){const lead=await db.lead.create({data:{name:"Metric visitor",email:randomUUID()+"@example.test",source:"CONTACT",challenge:"Isolated metric test",...(attributed?{visitorId:visitor}:{})}});leadIds.push(lead.id);}
    const after=await acquisitionMetrics();assert.equal(after.visitors,before.visitors+1);assert.equal(after.convertedVisitors,before.convertedVisitors+1);assert.equal(after.leads,before.leads+2);
    assert.ok(!JSON.stringify(after).includes("@example.test"));
  }finally{await db.analyticsEvent.deleteMany({where:{id:{in:eventIds}}});await db.lead.deleteMany({where:{id:{in:leadIds}}});await db.user.deleteMany({where:{id:{in:userIds}}});globalThis.__phase2TestCookie=undefined;await db.$disconnect();}
});
