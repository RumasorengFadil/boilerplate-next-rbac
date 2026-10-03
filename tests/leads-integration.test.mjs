import "./server-loader.mjs";
import test from "node:test";
import assert from "node:assert/strict";
import { randomUUID, createHash } from "node:crypto";
const { db } = await import("../src/lib/db.ts");
const { captureLead, updateLead, addLeadNote } = await import("../src/features/leads/service.ts");
const { submitInquiry } = await import("../src/features/inquiry/actions.ts");
test("contact persists consent, lead ownership/status/notes and transactional audit", async () => {
  const userIds = [], leadIds = [], tokens = {}, roleIds = {};
  const email = randomUUID()+"@example.test";
  try {
    for (const role of ["SALES", "CONTENT_EDITOR"]) {
      const token = randomUUID();
      const user = await db.user.create({ data: { name: "Lead test " + role, email: token+"@example.test", passwordHash: "synthetic-test-only", role } });
      userIds.push(user.id); tokens[role] = token; roleIds[role] = user.id;
      await db.session.create({ data: { userId: user.id, tokenHash: createHash("sha256").update(token).digest("hex"), expiresAt: new Date(Date.now()+60000) } });
    }
    const input = { name: "Test Visitor", email, challenge: "A real problem described for isolated testing", source: "CONTACT", consent: true };
    await assert.rejects(()=>captureLead({ ...input, consent: false }));
    const form = new FormData(); for (const [key,value] of Object.entries({ name: input.name, email, challenge: input.challenge, company: "Test organization", need: "automation", language: "en", consent: "on", website: "", budget: "Discuss later", timeline: "This quarter" })) form.set(key,value);
    globalThis.__phase2TestIp = randomUUID();
    const submitted = await submitInquiry({ success:false,message:"" },form);
    assert.equal(submitted.success,true);
    const lead = await db.lead.findFirstOrThrow({ where: { email } }); leadIds.push(lead.id);
    assert.equal(lead.source,"CONTACT");assert.equal(lead.sourcePage,"/en/contact");assert.equal(lead.budget,"Discuss later");
    assert.equal(await db.leadActivity.count({where:{leadId:lead.id}}),1);
    globalThis.__phase2TestCookie = tokens.CONTENT_EDITOR;
    await assert.rejects(()=>updateLead({id:lead.id,version:1,status:"CONTACTED",ownerId:""}),/Unauthorized/);
    globalThis.__phase2TestCookie = tokens.SALES;
    await assert.rejects(()=>updateLead({id:lead.id,version:1,status:"CONTACTED",ownerId:roleIds.CONTENT_EDITOR}),/Owner/);
    const updated=await updateLead({id:lead.id,version:1,status:"CONTACTED",ownerId:roleIds.SALES});
    assert.equal(updated.ownerId,roleIds.SALES);
    await assert.rejects(()=>updateLead({id:lead.id,version:1,status:"WON",ownerId:roleIds.SALES}),/changed/);
    await addLeadNote({id:lead.id,body:"Internal follow-up note"});
    assert.equal(await db.leadNote.count({where:{leadId:lead.id}}),1);
    const audit=await db.auditEvent.findMany({where:{recordId:lead.id}});
    assert.equal(audit.length,2);assert.ok(!JSON.stringify(audit).includes(email));
    assert.ok(!JSON.stringify(audit).includes("Internal follow-up note"));
    const bot = new FormData(); for(const [key,value]of form)bot.set(key,value);bot.set("website","spam.invalid");
    assert.equal((await submitInquiry({success:false,message:""},bot)).success,false);
  } finally {
    const found = await db.lead.findMany({where:{email},select:{id:true}});leadIds.push(...found.map(row=>row.id));
    await db.auditEvent.deleteMany({where:{recordId:{in:leadIds}}});
    await db.lead.deleteMany({where:{id:{in:leadIds}}});
    await db.user.deleteMany({where:{id:{in:userIds}}});
    globalThis.__phase2TestCookie=undefined;globalThis.__phase2SubmissionCookie=undefined;globalThis.__phase2TestIp=undefined;
    await db.$disconnect();
  }
});
