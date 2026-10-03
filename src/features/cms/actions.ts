"use server";
import { revalidatePath } from "next/cache";
import { requirePermission } from "@/server/authorization";
import { saveContent } from "./service";
import { contentInputSchema } from "./schema";

export type ContentState = { message: string; id?: string; success?: boolean };
export async function saveContentAction(_: ContentState, form: FormData): Promise<ContentState> {
  await requirePermission("content:write");
  const text = (name: string) => String(form.get(name) ?? "");
  const list = (name: string) => text(name).split(/[\n,]/).map(value => value.trim()).filter(Boolean);
  const localized = (name: string) => ({ id: text(`${name}.id`), en: text(`${name}.en`) });
  const translations = (locale: string) => Object.fromEntries(["title", "excerpt", "body", "seoTitle", "seoDescription"].map(field => [field, text(`${locale}.${field}`)]));
  const parsed = contentInputSchema.safeParse({
    ...(text("id") ? { id: text("id") } : {}), version: text("version") || 1,
    kind: text("kind"), slug: text("slug"), status: text("status"),
    publishedAt: text("publishedAt") ? text("publishedAt") + ":00.000Z" : null,
    translations: { id: translations("id"), en: translations("en") },
    details: { category: text("category"), tags: list("tags"), authorName: text("authorName"), image: text("image"),
      client: text("client"), verifiedProject: form.get("verifiedProject") === "on",
      industry: localized("industry"), challenge: localized("challenge"), approach: localized("approach"),
      solution: localized("solution"), impact: localized("impact"), before: localized("before"), after: localized("after"), architecture: localized("architecture"),
      features: list("features"), capabilities: list("capabilities"), technology: list("technology"), gallery: list("gallery"),
      relatedServices: list("relatedServices"), relatedCaseStudies: list("relatedCaseStudies"), productStatus: text("productStatus") || "COMING_SOON",
      ctaLabel: localized("ctaLabel"), ctaPath: text("ctaPath") || "/id/contact",
    },
  });
  if (!parsed.success) return { message: "Periksa kolom: " + parsed.error.issues.slice(0, 3).map(issue => issue.path.join(".")).join(", ") };
  try {
    const entry = await saveContent(parsed.data);
    revalidatePath("/dashboard/content");
    for (const locale of ["id", "en"]) revalidatePath(`/${locale}`, "layout");
    return { message: "Konten tersimpan. Reindex AI setelah perubahan publikasi.", id: entry.id, success: true };
  } catch { return { message: "Belum tersimpan. Periksa hak publikasi, transisi review, slug unik, waktu jadwal, atau muat ulang versi terbaru." }; }
}
