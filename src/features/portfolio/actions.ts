"use server";
import { revalidatePath } from "next/cache";
import { requirePermission } from "@/server/authorization";
import { parseContentForm } from "@/features/cms/form";
import type { ContentState } from "@/features/cms/actions";
import { portfolioInputSchema, portfolioLifecycleSchema } from "./schema";
import { savePortfolio, changePortfolioLifecycle } from "./service";

function invalidatePortfolio(id: string) {
  revalidatePath("/dashboard/portfolio");
  revalidatePath(`/dashboard/portfolio/${id}`);
  revalidatePath("/dashboard/content");
  revalidatePath("/sitemap.xml");
  for (const locale of ["id", "en"]) revalidatePath(`/${locale}`, "layout");
}
export async function savePortfolioAction(_: ContentState, form: FormData): Promise<ContentState> {
  await requirePermission("content:write");
  let raw: unknown;
  try { raw = parseContentForm(form, true); }
  catch { return { message: "Konten editor tidak valid atau terlalu panjang. Periksa kedua bahasa." }; }
  const parsed = portfolioInputSchema.safeParse(raw);
  if (!parsed.success) {
    const fields = [...new Set(parsed.error.issues.map(issue => issue.path.join(".")))].slice(0, 6);
    return { message: `Periksa kolom: ${fields.join(", ")}. Publikasi membutuhkan isi dan ringkasan lengkap ID/EN.`, fields };
  }
  try {
    const saved = await savePortfolio(parsed.data, { preservePortfolioDetails: true });
    invalidatePortfolio(saved.id);
    return { success: true, id: saved.id, version: saved.version, message: "Portfolio tersimpan." };
  } catch {
    return { message: "Belum tersimpan. Periksa izin publikasi, transisi REVIEW, slug yang sudah dicadangkan, jadwal UTC, atau muat ulang versi terbaru. Isi form Anda tetap dipertahankan." };
  }
}
export async function portfolioLifecycleAction(_: ContentState, form: FormData): Promise<ContentState> {
  await requirePermission("content:publish");
  const parsed = portfolioLifecycleSchema.safeParse({ id: form.get("id"), version: Number(form.get("version")), operation: form.get("operation") });
  if (!parsed.success) return { message: "Permintaan arsip/pulihkan tidak valid." };
  try {
    const saved = await changePortfolioLifecycle(parsed.data);
    invalidatePortfolio(saved.id);
    return { success: true, id: saved.id, version: saved.version,
      message: parsed.data.operation === "archive" ? "Portfolio diarsipkan dan ditarik dari publikasi." : "Portfolio dipulihkan sebagai DRAFT; belum dipublikasikan." };
  } catch { return { message: "Belum berhasil. Portfolio mungkin sudah berubah. Muat ulang sebelum mencoba lagi." }; }
}
