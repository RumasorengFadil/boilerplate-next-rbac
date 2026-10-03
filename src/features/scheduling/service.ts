import "server-only";
import { createHash,randomBytes } from "node:crypto";
import { z } from "zod";
import { db } from "@/lib/db";
import { requirePermission } from "@/server/authorization";
import { recordAudit } from "@/server/audit";
import { captureLeadInTransaction } from "@/features/leads/service";
import { bookingInputSchema,bookingMutationSchema,calendarAccessSchema,calendarInvitation,slotInputSchema } from "./schema";
export async function availableSlots() {
  const now=new Date();
  return db.consultationSlot.findMany({where:{enabled:true,startsAt:{gt:new Date(now.getTime()+3600000),lt:new Date(now.getTime()+90*86400000)},bookings:{none:{status:"CONFIRMED"}}},orderBy:{startsAt:"asc"},take:200,select:{id:true,startsAt:true,endsAt:true,service:true}});
}
export async function createSlot(raw:unknown) {
  const user=await requirePermission("operations:manage");
  const input=slotInputSchema.parse(raw);const startsAt=new Date(input.startsAt);
  if(startsAt.getTime()<Date.now()+3600000 || startsAt.getTime()>Date.now()+90*86400000)throw new Error("Choose a slot 1 hour to 90 days ahead.");
  return db.$transaction(async tx=>{
    const slot=await tx.consultationSlot.create({data:{startsAt,endsAt:new Date(startsAt.getTime()+input.duration*60000),service:input.service}});
    await recordAudit(tx,{actorId:user.id,module:"scheduling",recordId:slot.id,action:"slot.created",after:{startsAt:slot.startsAt.toISOString(),duration:input.duration,service:slot.service}});return slot;
  });
}
// Internal boundary: public action verifies origin, rate and consent; no model may auto-book.
export async function bookConsultation(raw:unknown,visitorId?:string) {
  const input=bookingInputSchema.parse(raw);if(visitorId)z.uuid().parse(visitorId);
  const token=randomBytes(32).toString("hex");
  const booking=await db.$transaction(async tx=>{
    // Serialize booking/disable against the same slot; partial unique index is a second guard.
    await tx.$queryRaw`SELECT id FROM "ConsultationSlot" WHERE id = ${input.slotId}::uuid FOR UPDATE`;
    const slot=await tx.consultationSlot.findUniqueOrThrow({where:{id:input.slotId}});
    if(!slot.enabled || slot.startsAt.getTime()<Date.now()+3600000 || (slot.service!=="any" && slot.service!==input.service))throw new Error("Slot unavailable.");
    if(await tx.consultationBooking.count({where:{slotId:slot.id,status:"CONFIRMED"}}))throw new Error("Slot already booked.");
    const lead=await captureLeadInTransaction(tx,{consent:true,name:input.name,company:input.company,email:input.email,phone:input.phone,challenge:input.topic,serviceInterest:input.service,source:"CONSULTATION",sourcePage:`/${input.language}/consultation`,language:input.language},visitorId);
    const result=await tx.consultationBooking.create({data:{slotId:slot.id,leadId:lead.id,timezone:input.timezone,topic:input.topic,tokenHash:createHash("sha256").update(token).digest("hex")}});
    await tx.leadActivity.create({data:{leadId:lead.id,action:"consultation.booked",details:{bookingId:result.id,startsAt:slot.startsAt.toISOString()}}});
    return {id:result.id,startsAt:slot.startsAt,endsAt:slot.endsAt,timezone:result.timezone};
  });
  return {...booking,calendarUrl:`/api/consultations/${booking.id}/calendar?token=${token}`};
}
export async function withdrawSlot(raw:unknown) {
  const user=await requirePermission("operations:manage");const id=z.uuid().parse(raw);
  return db.$transaction(async tx=>{
    await tx.$queryRaw`SELECT id FROM "ConsultationSlot" WHERE id = ${id}::uuid FOR UPDATE`;
    if(await tx.consultationBooking.count({where:{slotId:id,status:"CONFIRMED"}}))throw new Error("Cancel the booking first.");
    await tx.consultationSlot.update({where:{id},data:{enabled:false}});
    await recordAudit(tx,{actorId:user.id,module:"scheduling",recordId:id,action:"slot.withdrawn"});
  });
}
export async function cancelBooking(raw:unknown) {
  const user=await requirePermission("leads:write");const input=bookingMutationSchema.parse(raw);
  return db.$transaction(async tx=>{
    const before=await tx.consultationBooking.findUniqueOrThrow({where:{id:input.id}});
    const changed=await tx.consultationBooking.updateMany({where:{id:input.id,version:input.version,status:"CONFIRMED"},data:{status:"CANCELLED",version:{increment:1}}});
    if(!changed.count)throw new Error("Booking changed; reload.");
    await tx.leadActivity.create({data:{leadId:before.leadId,actorId:user.id,action:"consultation.cancelled",details:{bookingId:input.id}}});
    await recordAudit(tx,{actorId:user.id,module:"scheduling",recordId:input.id,action:"booking.cancelled"});
  });
}
export async function downloadCalendar(raw:unknown) {
  const input=calendarAccessSchema.parse(raw);
  const booking=await db.consultationBooking.findFirst({where:{id:input.id,tokenHash:createHash("sha256").update(input.token).digest("hex")},include:{slot:true}});
  if(!booking) return null;
  return calendarInvitation(booking);
}
