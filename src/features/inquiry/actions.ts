"use server";

import { inquirySchema } from "./schema";
import { APP_CONFIG } from "@/config/app-config";
import { captureLead } from "@/features/leads/service";
import { limitPublicSubmission } from "@/server/public-rate-limit";
import { consentedVisitorId } from "@/features/analytics/service";

export type InquiryState = { success: boolean; message: string; redirectUrl?: string };

export async function submitInquiry(_: InquiryState, formData: FormData): Promise<InquiryState> {
  if (_.success) return _;
  const result = inquirySchema.safeParse({ ...Object.fromEntries(formData), consent: formData.get("consent") === "on" });
  if (!result.success) return { success: false, message: "Mohon periksa kembali informasi yang wajib diisi." };
  const inquiry = result.data;
  try {
    await limitPublicSubmission("contact");
    await captureLead({ consent: inquiry.consent, name: inquiry.name, company: inquiry.company, email: inquiry.email,
      phone: inquiry.whatsapp, challenge: inquiry.challenge, serviceInterest: inquiry.need, budget: inquiry.budget,
      timeline: inquiry.timeline, companySize: inquiry.companySize, targetDate: inquiry.targetDate, language: inquiry.language, source: "CONTACT", sourcePage: `/${inquiry.language}/contact` }, await consentedVisitorId());
  } catch { return { success: false, message: inquiry.language === "en" ? "Your request could not be saved. Please retry shortly." : "Kebutuhan belum tersimpan. Coba kembali beberapa saat lagi." }; }
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
  return { success: true, message: inquiry.language === "en" ? "Your request has been saved. You can continue via WhatsApp." : "Kebutuhan Anda sudah tersimpan. Anda dapat melanjutkan melalui WhatsApp.", redirectUrl: `https://wa.me/${APP_CONFIG.whatsapp}?text=${encodeURIComponent(message)}` };
}
