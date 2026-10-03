import assert from "node:assert/strict";
import {spawn} from "node:child_process";
import {randomUUID,randomBytes,createHash} from "node:crypto";
import {PrismaClient} from "@prisma/client";
assert.ok(process.env.DATABASE_URL?.includes(":55439/"),"Use isolated test DB only");
const db=new PrismaClient(),base="http://127.0.0.1:55443",users=[];let slotId,leadId,bookingId;
const app=spawn(process.execPath,["node_modules/next/dist/bin/next","start","--hostname","127.0.0.1","--port","55443"],{env:{...process.env,AI_ASSISTANT_ENABLED:"false"},stdio:"ignore"});
try{
  for(let i=0;i<60;i++){try{await fetch(base+"/id");break;}catch{await new Promise(resolve=>setTimeout(resolve,500));}}
  const startsAt=new Date(Date.now()+8*86400000);
  const slot=await db.consultationSlot.create({data:{startsAt,endsAt:new Date(startsAt.getTime()+1800000),service:"any"}});slotId=slot.id;
  for(const locale of ["id","en"]){const html=await(await fetch(base+`/${locale}/consultation`)).text();assert.ok(html.includes('name="timezone"'));assert.ok(html.includes('name="service"'));assert.ok(html.includes('name="consent"'));assert.ok(!html.includes("@example.test"));const contact=await(await fetch(base+`/${locale}/contact`)).text();assert.ok(contact.includes(`/${locale}/consultation`));}
  const lead=await db.lead.create({data:{name:"Scheduling HTTP fixture",email:randomUUID()+"@example.test",challenge:"Synthetic booking test",source:"CONSULTATION"}});leadId=lead.id;
  const token=randomBytes(32).toString("hex");const booking=await db.consultationBooking.create({data:{slotId,leadId,timezone:"Asia/Jakarta",topic:"Synthetic scheduling HTTP topic",tokenHash:createHash("sha256").update(token).digest("hex")}});bookingId=booking.id;
  for(const role of ["ADMIN","SALES","CONTENT_EDITOR","MEMBER"]){const sessionToken=randomUUID();const user=await db.user.create({data:{name:"Scheduling HTTP "+role,email:sessionToken+"@example.test",passwordHash:"synthetic",role}});users.push(user.id);await db.session.create({data:{userId:user.id,tokenHash:createHash("sha256").update(sessionToken).digest("hex"),expiresAt:new Date(Date.now()+60000)}});const response=await fetch(base+"/dashboard/consultations",{headers:{Cookie:"session="+sessionToken},redirect:"manual"});assert.equal(response.status,["ADMIN","SALES"].includes(role)?200:307);if(response.status===200){const html=await response.text();assert.ok(html.includes("Scheduling HTTP fixture"));assert.equal(html.includes("Tambah ketersediaan"),role==="ADMIN");}}
  assert.equal((await fetch(base+`/api/consultations/${bookingId}/calendar`)).status,404);
  assert.equal((await fetch(base+`/api/consultations/${bookingId}/calendar?token=${"0".repeat(64)}`)).status,404);
  const invitation=await fetch(base+`/api/consultations/${bookingId}/calendar?token=${token}`);assert.equal(invitation.status,200);assert.ok(invitation.headers.get("cache-control").includes("no-store"));assert.ok(invitation.headers.get("content-type").includes("text/calendar"));const ics=await invitation.text();assert.ok(ics.includes("STATUS:CONFIRMED"));assert.ok(!ics.includes(lead.email));
  console.log("PASS: localized scheduling, admin/sales role guards, contact CTA and private calendar invitation.");
}finally{app.kill("SIGTERM");if(bookingId)await db.consultationBooking.delete({where:{id:bookingId}});if(leadId)await db.lead.delete({where:{id:leadId}});if(slotId)await db.consultationSlot.delete({where:{id:slotId}});await db.user.deleteMany({where:{id:{in:users}}});await db.$disconnect();}
