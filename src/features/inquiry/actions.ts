"use server";

import { inquirySchema } from "./schema";
import { APP_CONFIG } from "@/config/app-config";

export type InquiryState = { success: boolean; message: string; redirectUrl?: string };

export async function submitInquiry(_: InquiryState, formData: FormData): Promise<InquiryState> {
  const result = inquirySchema.safeParse(Object.fromEntries(formData));
  if (!result.success) return { success: false, message: "Mohon periksa kembali informasi yang wajib diisi." };
  const inquiry = result.data;
  const message = [
    "Halo LunaBiner, saya ingin berdiskusi tentang kebutuhan bisnis.",
    `Nama: ${inquiry.name}`,
    inquiry.company && `Perusahaan: ${inquiry.company}`,
    `Email: ${inquiry.email}`,
    inquiry.whatsapp && `WhatsApp: ${inquiry.whatsapp}`,
    `Kebutuhan: ${inquiry.need}`,
    `Tantangan: ${inquiry.challenge}`,
    inquiry.timeline && `Timeline: ${inquiry.timeline}`,
    inquiry.budget && `Budget: ${inquiry.budget}`,
  ].filter(Boolean).join("\n");
  return { success: true, message: "Mengarahkan Anda ke WhatsApp LunaBiner…", redirectUrl: `https://wa.me/${APP_CONFIG.whatsapp}?text=${encodeURIComponent(message)}` };
}
