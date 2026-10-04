"use server";
import { revalidatePath } from "next/cache";
import { requirePermission } from "@/server/authorization";
import { saveContent } from "./service";
import { contentInputSchema } from "./schema";
import { parseContentForm } from "./form";

export type ContentState = { message: string; id?: string; success?: boolean; version?: number; fields?: string[] };
export async function saveContentAction(_: ContentState, form: FormData): Promise<ContentState> {
  await requirePermission("content:write");
  const parsed = contentInputSchema.safeParse(parseContentForm(form));
  if (!parsed.success) return { message: "Periksa kolom: " + parsed.error.issues.slice(0, 3).map(issue => issue.path.join(".")).join(", ") };
  try {
    const entry = await saveContent(parsed.data);
    revalidatePath("/dashboard/content");
    for (const locale of ["id", "en"]) revalidatePath(`/${locale}`, "layout");
    return { message: "Konten tersimpan. Reindex AI setelah perubahan publikasi.", id: entry.id, version: entry.version, success: true };
  } catch { return { message: "Belum tersimpan. Periksa hak publikasi, transisi review, slug unik, waktu jadwal, atau muat ulang versi terbaru." }; }
}
