"use server";
import { revalidatePath } from "next/cache";
import { requirePermission } from "@/server/authorization";
import { parseContentForm } from "@/features/cms/form";
import type { ContentState } from "@/features/cms/actions";
import { portfolioInputSchema, portfolioLifecycleSchema } from "./schema";
import { savePortfolio, changePortfolioLifecycle } from "./service";
import { randomUUID } from "node:crypto";
import { coverOperationSchema } from "./cover-schema";
import { normalizeCover, storeCover, discardUncommittedCover, InvalidCoverError } from "./cover-storage";

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
  const operation = coverOperationSchema.safeParse(form.get("coverOperation") ?? "keep");
  if (!operation.success) return { message: "Pilihan cover tidak valid." };
  let uploaded: Awaited<ReturnType<typeof storeCover>> | undefined;
  let saved: Awaited<ReturnType<typeof savePortfolio>>;
  try {
    const contentId = parsed.data.id ?? randomUUID();
    if (operation.data === "replace") uploaded = await storeCover(contentId, await normalizeCover(form.get("coverFile")));
    saved = await savePortfolio(parsed.data, { preservePortfolioDetails: true, ...(!parsed.data.id ? { createPortfolioId: contentId } : {}),
      portfolioCover: { operation: operation.data, ...(uploaded ? { path: uploaded.path } : {}) } });
  } catch (error) {
    if (uploaded) {
      // An uncertain DB commit must never delete an asset already referenced.
      const { db } = await import("@/lib/db");
      try {
        const attached = await db.contentEntry.findFirst({ where: { id: uploaded.contentId, details: { path: ["image"], equals: uploaded.path } }, select: { id: true } });
        if (!attached) await discardUncommittedCover({ contentId: uploaded.contentId, assetId: uploaded.assetId });
      } catch { /* Retain private orphan if DB/storage state cannot be confirmed. */ }
    }
    if (error instanceof InvalidCoverError) return { message: error.message, fields: ["coverFile"] };
    return { message: "Belum tersimpan. Periksa izin publikasi, transisi REVIEW, slug yang sudah dicadangkan, jadwal UTC, atau muat ulang versi terbaru. Isi form Anda tetap dipertahankan." };
  }
  // DB commit is complete; cache failures must not remove the committed cover.
  invalidatePortfolio(saved.id);
  return { success: true, id: saved.id, version: saved.version, message: "Portfolio tersimpan." };
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
