import "./server-loader.mjs";
import test from "node:test";
import assert from "node:assert/strict";
import {randomUUID} from "node:crypto";
const {bookingInputSchema,slotInputSchema,calendarInvitation,timezoneSchema}=await import("../src/features/scheduling/schema.ts");
const {formPayload}=await import("../src/server/form-data.ts");
test("scheduling rejects invalid input and ICS stores UTC without contact information",()=>{
  assert.equal(timezoneSchema.safeParse("Asia/Jakarta").success,true);assert.equal(timezoneSchema.safeParse("unknown/timezone").success,false);
  const input={slotId:randomUUID(),service:"ai",timezone:"Asia/Jakarta",topic:"Discuss invoice workflows",name:"Visitor",email:"visitor@example.test",language:"en",consent:true,website:""};
  assert.equal(bookingInputSchema.safeParse(input).success,true);
  const form=new FormData();for(const[key,value]of Object.entries(input))form.set(key,String(value));form.set("$ACTION_REF_1","");form.set("$ACTION_1:0","transport-only");form.set("$ACTION_KEY","transport-only");
  assert.equal(bookingInputSchema.safeParse({...formPayload(form),consent:true}).success,true);
  form.set("score","100");assert.equal(bookingInputSchema.safeParse({...formPayload(form),consent:true}).success,false);
  for(const bad of [{...input,consent:false},{...input,slotId:"1"},{...input,website:"bot"},{...input,score:100},{...input,timezone:"invalid"}])assert.equal(bookingInputSchema.safeParse(bad).success,false);
  assert.equal(slotInputSchema.safeParse({startsAt:"tomorrow",duration:30,service:"any"}).success,false);
  const calendar=calendarInvitation({id:input.slotId,slot:{startsAt:new Date("2026-10-04T03:00:00Z"),endsAt:new Date("2026-10-04T03:30:00Z"),service:"ai"},createdAt:new Date("2026-10-03T00:00:00Z"),status:"CONFIRMED"});
  assert.ok(calendar.includes("DTSTART:20261004T030000Z"));assert.ok(calendar.includes("BEGIN:VEVENT"));assert.ok(!calendar.includes(input.email));
  assert.ok(calendar.split("\r\n").every(line=>Buffer.byteLength(line)<=75));
});
