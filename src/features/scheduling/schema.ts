import { z } from "zod";
export const consultationServices=["software","automation","ai","data","unsure"] as const;
export const timezoneSchema=z.string().min(1).max(80).refine(value=>{try{new Intl.DateTimeFormat("en",{timeZone:value});return true;}catch{return false;}},"Unknown timezone");
export const slotInputSchema=z.object({startsAt:z.iso.datetime(),duration:z.coerce.number().int().min(15).max(120),service:z.enum([...consultationServices,"any"])}).strict();
export const bookingInputSchema=z.object({
  slotId:z.uuid(),service:z.enum(consultationServices),timezone:timezoneSchema,topic:z.string().trim().min(10).max(2000),
  name:z.string().trim().min(2).max(100),company:z.string().trim().max(120).optional(),email:z.string().trim().email().max(254),
  phone:z.string().trim().max(30).optional(),language:z.enum(["id","en"]),consent:z.literal(true),website:z.literal("").optional(),
}).strict();
export const bookingMutationSchema=z.object({id:z.uuid(),version:z.coerce.number().int().min(1)}).strict();
export const calendarAccessSchema=z.object({id:z.uuid(),token:z.string().regex(/^[a-f0-9]{64}$/)}).strict();
export function calendarInvitation(booking:{id:string;slot:{startsAt:Date;endsAt:Date;service:string};status:"CONFIRMED"|"CANCELLED";createdAt:Date}) {
  const stamp=(date:Date)=>date.toISOString().replace(/[-:]/g,"").replace(/\.\d{3}/,"");
  return ["BEGIN:VCALENDAR","VERSION:2.0","PRODID:-//LunaBiner//Consultation//EN","CALSCALE:GREGORIAN","METHOD:PUBLISH","BEGIN:VEVENT",`UID:${booking.id}@lunabiner.com`,`DTSTAMP:${stamp(booking.createdAt)}`,`DTSTART:${stamp(booking.slot.startsAt)}`,`DTEND:${stamp(booking.slot.endsAt)}`,"SUMMARY:LunaBiner Consultation",`STATUS:${booking.status==="CONFIRMED"?"CONFIRMED":"CANCELLED"}`,"DESCRIPTION:Discuss your business requirements with LunaBiner. The team will confirm meeting details separately.","END:VEVENT","END:VCALENDAR",""].map(line=>line.match(/.{1,74}/g)?.join("\r\n ") ?? "").join("\r\n");
}
