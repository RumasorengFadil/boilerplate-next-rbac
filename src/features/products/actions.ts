"use server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requirePermission } from "@/server/authorization";
import { parseProductForm } from "./form";
import { productLifecycleSchema, productValidationErrors } from "./schema";
import { productSummaryInputSchema } from "./summary-input";
import { saveProduct, changeProductLifecycle, ProductMutationError } from "./service";

export type ProductState = { message: string; success?: boolean; id?: string; version?: number; fieldErrors?: Record<string, string> };
function invalidateProduct(id: string) {
  revalidatePath("/dashboard/products");
  revalidatePath(`/dashboard/products/${id}`);
  revalidatePath("/dashboard/content");
  revalidatePath("/sitemap.xml");
  for (const locale of ["id", "en"]) revalidatePath(`/${locale}`, "layout");
}
function feedback(error: unknown): ProductState {
  if (error instanceof z.ZodError) {
    const fieldErrors = productValidationErrors(error.issues, true);
    return { message: "Produk belum tersimpan. " + Object.values(fieldErrors).join(" "), fieldErrors };
  }
  if (error instanceof ProductMutationError) return { message: error.message + " Isi form tetap dipertahankan.",
    ...(error.code === "SCHEDULE" ? { fieldErrors: { publishedAt: error.message } } : {}) };
  const databaseError = error as { code?: string; message?: string };
  if (databaseError?.code === "P2002" || databaseError?.message?.includes("Product route is reserved"))
    return { message: "Slug ini sudah digunakan atau dicadangkan produk lain. Gunakan slug berbeda.", fieldErrors: { slug: "Slug sudah digunakan atau dicadangkan. Gunakan nama berbeda." } };
  return { message: "Produk belum tersimpan karena gangguan penyimpanan. Coba lagi; isi form tetap dipertahankan." };
}
export async function saveProductAction(_: ProductState, form: FormData): Promise<ProductState> {
  await requirePermission("content:write");
  let raw: unknown;
  try { raw = parseProductForm(form); } catch { return { message: "Form harus berisi teks. Periksa kedua bahasa sebelum menyimpan." }; }
  const parsed = productSummaryInputSchema.safeParse(raw);
  if (!parsed.success) return feedback(parsed.error);
  let saved: Awaited<ReturnType<typeof saveProduct>>;
  try { saved = await saveProduct(raw, { summary: true }); } catch (error) { return feedback(error); }
  // Mutation is committed; revalidation failure must not prompt a duplicate create.
  try { invalidateProduct(saved.id); } catch {
    return { success: true, id: saved.id, version: saved.version, message: "Produk tersimpan. Muat ulang halaman untuk memperbarui tampilan." };
  }
  return { success: true, id: saved.id, version: saved.version, message: "Produk tersimpan." };
}
export async function productLifecycleAction(_: ProductState, form: FormData): Promise<ProductState> {
  await requirePermission("content:publish");
  const parsed = productLifecycleSchema.safeParse({ id: form.get("id"), version: Number(form.get("version")), operation: form.get("operation") });
  if (!parsed.success) return { message: "Permintaan arsip/pulihkan tidak valid. Muat ulang halaman." };
  let saved: Awaited<ReturnType<typeof changeProductLifecycle>>;
  try { saved = await changeProductLifecycle(parsed.data); } catch (error) { return feedback(error); }
  try { invalidateProduct(saved.id); } catch { /* Commit remains successful; client refreshes. */ }
  return { success: true, id: saved.id, version: saved.version,
    message: parsed.data.operation === "archive" ? "Produk diarsipkan dan ditarik dari publikasi." : "Produk dipulihkan sebagai DRAFT; belum dipublikasikan." };
}
