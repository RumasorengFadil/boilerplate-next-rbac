// Temporary, isolated fixtures for manual browser QA. SIGTERM removes fixtures.
import assert from "node:assert/strict";
import {spawn} from "node:child_process";
import {randomUUID} from "node:crypto";
import bcrypt from "bcryptjs";
import {PrismaClient} from "@prisma/client";
assert.ok(process.env.DATABASE_URL?.includes(":55439/"),"Use isolated test DB only");
const db=new PrismaClient(),slots=[];let userId;const email="review-"+randomUUID()+"@example.test";
const app=spawn(process.execPath,["node_modules/next/dist/bin/next","start","--hostname","127.0.0.1","--port","55444"],{env:{...process.env,AI_ASSISTANT_ENABLED:"false"},stdio:"inherit"});
try{
  const user=await db.user.create({data:{name:"Review Admin",email,passwordHash:await bcrypt.hash("ReviewOnly!2026",10),role:"ADMIN"}});userId=user.id;
  for(const day of [2,3]){const startsAt=new Date(Date.now()+day*86400000);startsAt.setUTCHours(3,0,0,0);const slot=await db.consultationSlot.create({data:{startsAt,endsAt:new Date(startsAt.getTime()+1800000),service:"any"}});slots.push(slot.id);}
  console.log("Isolated browser QA: http://127.0.0.1:55444/id/consultation",email,"ReviewOnly!2026");
  await new Promise(resolve=>{process.once("SIGTERM",resolve);process.once("SIGINT",resolve);});
}finally{
  app.kill("SIGTERM");
  const bookings=await db.consultationBooking.findMany({where:{slotId:{in:slots}},select:{id:true,leadId:true}});
  await db.auditEvent.deleteMany({where:{OR:[{actorId:userId ?? "no-fixture"},{recordId:{in:bookings.map(item=>item.id)}}]}});
  await db.consultationBooking.deleteMany({where:{slotId:{in:slots}}});await db.lead.deleteMany({where:{id:{in:bookings.map(item=>item.leadId)}}});await db.consultationSlot.deleteMany({where:{id:{in:slots}}});if(userId)await db.user.delete({where:{id:userId}});await db.$disconnect();
}
