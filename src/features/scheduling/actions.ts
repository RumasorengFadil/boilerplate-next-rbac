"use server";
import { revalidatePath } from "next/cache";
import { requirePermission } from "@/server/authorization";
import { limitPublicSubmission } from "@/server/public-rate-limit";
import { consentedVisitorId } from "@/features/analytics/service";
import { bookingInputSchema } from "./schema";
import { formPayload } from "@/server/form-data";
import { bookConsultation,createSlot,cancelBooking,withdrawSlot } from "./service";
export type BookingState={message:string;success?:boolean;calendarUrl?:string;startsAt?:string;timezone?:string;form?:{name:string;company?:string;email:string;phone?:string;topic:string}};
export async function bookConsultationAction(previous:BookingState,form:FormData):Promise<BookingState>{
  if(previous.success)return previous;
  const parsed=bookingInputSchema.safeParse({...formPayload(form),consent:form.get("consent")==="on"});
  if(!parsed.success)return {message:form.get("language")==="en"?"Please check the selected slot and required fields.":"Periksa slot dan informasi wajib."};
  const en=parsed.data.language==="en";
  try{
    await limitPublicSubmission("booking");
    const booking=await bookConsultation(parsed.data,await consentedVisitorId());
    revalidatePath(`/${parsed.data.language}/consultation`);revalidatePath("/dashboard/consultations");
    return {success:true,message:en?"Your consultation is reserved. Save the calendar invitation; the team will follow up with meeting details.":"Jadwal konsultasi tersimpan. Simpan undangan kalender; tim akan menghubungi Anda untuk detail pertemuan.",calendarUrl:booking.calendarUrl,startsAt:booking.startsAt.toISOString(),timezone:booking.timezone};
  }catch{return {message:en?"The slot could not be reserved. Refresh availability and retry.":"Slot belum dapat dipesan. Muat ulang ketersediaan dan coba kembali.",form:{name:parsed.data.name,company:parsed.data.company,email:parsed.data.email,phone:parsed.data.phone,topic:parsed.data.topic}};}
}
export async function createSlotAction(_:BookingState,form:FormData):Promise<BookingState>{
  await requirePermission("operations:manage");
  try{await createSlot({startsAt:new Date(String(form.get("startsAt"))+"Z").toISOString(),duration:form.get("duration"),service:form.get("service")});revalidatePath("/dashboard/consultations");revalidatePath("/[locale]/consultation","page");return {success:true,message:"Slot ditambahkan."};}
  catch{return {message:"Slot tidak valid atau bertumpang tindih. Gunakan UTC, 1 jam–90 hari ke depan."};}
}
export async function cancelBookingAction(_:BookingState,form:FormData):Promise<BookingState>{
  await requirePermission("leads:write");
  try{await cancelBooking(formPayload(form));revalidatePath("/dashboard/consultations");revalidatePath("/[locale]/consultation","page");return {success:true,message:"Booking dibatalkan; slot kembali tersedia."};}catch{return {message:"Booking berubah atau tidak tersedia. Muat ulang."};}
}
export async function withdrawSlotAction(_:BookingState,form:FormData):Promise<BookingState>{
  await requirePermission("operations:manage");
  try{await withdrawSlot(form.get("id"));revalidatePath("/dashboard/consultations");revalidatePath("/[locale]/consultation","page");return {success:true,message:"Slot ditarik."};}catch{return {message:"Slot dengan booking aktif tidak dapat ditarik."};}
}
