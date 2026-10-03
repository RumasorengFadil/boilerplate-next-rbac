"use server";
import { revalidatePath } from "next/cache";
import { requirePermission } from "@/server/authorization";
import { scoreSignals, scoringMutationSchema } from "./scoring-schema";
import { saveScoringConfig, recalculateLeadScore } from "./scoring";
import type { LeadState } from "./actions";
export async function saveScoringAction(_: LeadState, form: FormData): Promise<LeadState> {
  await requirePermission("operations:manage");
  const result=scoringMutationSchema.safeParse({version:Number(form.get("version")),rules:{enabled:form.get("enabled")==="on",problemMinChars:Number(form.get("problemMinChars")),timelineDays:Number(form.get("timelineDays")),behaviorDays:Number(form.get("behaviorDays")),weights:Object.fromEntries(scoreSignals.map(key=>[key,Number(form.get(key))]))}});
  if (!result.success) return {message:"Aturan tidak valid. Periksa batas angka."};
  try {await saveScoringConfig(result.data);revalidatePath("/dashboard/leads/scoring");return {success:true,message:"Aturan tersimpan. Score lead lama tidak diubah otomatis."};}
  catch {return {message:"Belum tersimpan. Muat ulang konfigurasi terbaru."};}
}
export async function recalculateScoringAction(_:LeadState,form:FormData):Promise<LeadState> {
  await requirePermission("leads:write");
  try {await recalculateLeadScore(Object.fromEntries(form));revalidatePath("/dashboard/leads");revalidatePath(`/dashboard/leads/${form.get("id")}`);return {success:true,message:"Score dihitung ulang dan dicatat pada timeline."};}
  catch {return {message:"Belum diperbarui. Muat ulang lead terbaru."};}
}
