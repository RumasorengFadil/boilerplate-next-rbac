"use server";
import { revalidatePath } from "next/cache";
import { requirePermission } from "@/server/authorization";
import { updateLead, addLeadNote } from "./service";
import { leadMutationSchema, leadNoteSchema } from "./schema";
import { formPayload } from "@/server/form-data";
export type LeadState = { message: string; success?: boolean };
export async function updateLeadAction(_: LeadState, form: FormData): Promise<LeadState> {
  await requirePermission("leads:write");
  const input = leadMutationSchema.safeParse(formPayload(form));
  if (!input.success) return { message: "Status, owner, atau ID tidak valid." };
  try { await updateLead(input.data); revalidatePath("/dashboard/leads"); revalidatePath(`/dashboard/leads/${input.data.id}`); return { message: "Lead diperbarui.", success: true }; }
  catch { return { message: "Belum tersimpan. Muat ulang versi terbaru dan pastikan owner memiliki akses sales." }; }
}
export async function addNoteAction(_: LeadState, form: FormData): Promise<LeadState> {
  await requirePermission("leads:write");
  const input = leadNoteSchema.safeParse(formPayload(form));
  if (!input.success) return { message: "Catatan harus berisi 2–4000 karakter." };
  try { await addLeadNote(input.data); revalidatePath(`/dashboard/leads/${input.data.id}`); return { message: "Catatan ditambahkan.", success: true }; }
  catch { return { message: "Catatan belum tersimpan. Coba kembali." }; }
}
