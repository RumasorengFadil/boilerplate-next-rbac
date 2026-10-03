import "./server-loader.mjs";
import test from "node:test";
import assert from "node:assert/strict";
import {randomUUID,createHash} from "node:crypto";
const {db}=await import("../src/lib/db.ts");
const {availableSlots,createSlot,bookConsultation,downloadCalendar,cancelBooking,withdrawSlot}=await import("../src/features/scheduling/service.ts");
test("slot overlap and concurrent booking prevent conflicts; lead capture is atomic and permission protected",async()=>{
  const users=[],slots=[],tokens={},fixtureEmail=randomUUID()+"@example.test";let bookingIds=[];
  try{
    for(const role of ["ADMIN","SALES","MEMBER"]){const token=randomUUID();const user=await db.user.create({data:{name:"Scheduling test",email:token+"@example.test",passwordHash:"synthetic",role}});users.push(user.id);tokens[role]=token;await db.session.create({data:{userId:user.id,tokenHash:createHash("sha256").update(token).digest("hex"),expiresAt:new Date(Date.now()+60000)}});}
    const startsAt=new Date(Date.now()+5*86400000).toISOString();
    globalThis.__phase2TestCookie=tokens.SALES;await assert.rejects(()=>createSlot({startsAt,duration:30,service:"ai"}),/Unauthorized/);
    globalThis.__phase2TestCookie=tokens.ADMIN;const slot=await createSlot({startsAt,duration:30,service:"ai"});slots.push(slot.id);
    await assert.rejects(()=>createSlot({startsAt:new Date(new Date(startsAt).getTime()+60000).toISOString(),duration:30,service:"any"}));
    const input={slotId:slot.id,service:"ai",timezone:"America/New_York",topic:"Schedule a discussion about AI workflows",name:"Test Visitor",email:fixtureEmail,language:"en",consent:true};
    await assert.rejects(()=>bookConsultation({...input,service:"data"}),/unavailable/);
    const results=await Promise.allSettled([bookConsultation(input),bookConsultation(input)]);
    assert.equal(results.filter(result=>result.status==="fulfilled").length,1);
    const booking=results.find(result=>result.status==="fulfilled").value;bookingIds.push(booking.id);
    assert.match(booking.id,/^[0-9a-f-]{36}$/);assert.equal(await db.lead.count({where:{email:fixtureEmail}}),1);
    const lead=await db.lead.findFirstOrThrow({where:{email:fixtureEmail}});assert.equal(lead.source,"CONSULTATION");assert.equal(lead.scoreDetails.observed.consultation,true);
    assert.ok(!(await availableSlots()).some(item=>item.id===slot.id));
    const token=new URL(booking.calendarUrl,"http://localhost").searchParams.get("token");assert.ok((await downloadCalendar({id:booking.id,token})).includes("STATUS:CONFIRMED"));
    assert.equal(await downloadCalendar({id:booking.id,token:"0".repeat(64)}),null);
    assert.notEqual((await db.consultationBooking.findUniqueOrThrow({where:{id:booking.id}})).tokenHash,token);
    await assert.rejects(()=>withdrawSlot(slot.id),/Cancel/);
    globalThis.__phase2TestCookie=tokens.MEMBER;await assert.rejects(()=>cancelBooking({id:booking.id,version:1}),/Unauthorized/);
    globalThis.__phase2TestCookie=tokens.SALES;await cancelBooking({id:booking.id,version:1});await assert.rejects(()=>cancelBooking({id:booking.id,version:1}),/changed/);
    assert.ok((await downloadCalendar({id:booking.id,token})).includes("STATUS:CANCELLED"));
    assert.ok((await availableSlots()).some(item=>item.id===slot.id));
    globalThis.__phase2TestCookie=tokens.ADMIN;await withdrawSlot(slot.id);assert.ok(!(await availableSlots()).some(item=>item.id===slot.id));
  }finally{
    const bookings=await db.consultationBooking.findMany({where:{slotId:{in:slots}},select:{id:true}});bookingIds=bookings.map(row=>row.id);
    await db.auditEvent.deleteMany({where:{OR:[{recordId:{in:slots}},{recordId:{in:bookingIds}}]}});
    await db.consultationBooking.deleteMany({where:{slotId:{in:slots}}});await db.lead.deleteMany({where:{email:fixtureEmail}});await db.consultationSlot.deleteMany({where:{id:{in:slots}}});await db.user.deleteMany({where:{id:{in:users}}});globalThis.__phase2TestCookie=undefined;await db.$disconnect();
  }
});
