import { z } from "zod";
import { contentInputSchema } from "../cms/schema";

export const portfolioSlugSchema = z.string().trim().min(2).max(120)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
  .refine(value => !/^\d+$/.test(value) && !z.uuid().safeParse(value).success, "Use a descriptive slug, not a number/UUID.");
export const portfolioRouteSchema = z.string().min(1).max(120).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
export const portfolioInputSchema = contentInputSchema.superRefine((input, context) => {
  if (input.kind !== "CASE_STUDY") context.addIssue({ code: "custom", path: ["kind"], message: "Portfolio requires CASE_STUDY." });
  if (!portfolioSlugSchema.safeParse(input.slug).success) context.addIssue({ code: "custom", path: ["slug"], message: "Use a descriptive portfolio slug." });
});
export const portfolioLifecycleSchema = z.object({ id: z.uuid(), version: z.number().int().min(1), operation: z.enum(["archive", "restore"]) }).strict();

// Return form field names and safe editorial guidance, never raw Zod paths/messages.
export function portfolioValidationErrors(issues: z.ZodError["issues"]) {
  const errors: Record<string, string> = {};
  for (const issue of issues) {
    const [root, locale, property] = issue.path;
    let field = typeof root === "string" ? root : "form";
    let label = "Data portfolio";
    if (root === "translations" && (locale === "id" || locale === "en")) {
      const name = property === "body" || property === "richBody" ? "richBody" : String(property ?? "richBody");
      field = `${locale}.${name}`;
      label = `${({ title: "Judul", excerpt: "Ringkasan", richBody: "Konten detail", seoTitle: "Judul SEO", seoDescription: "Deskripsi SEO" } as Record<string, string>)[name] ?? "Konten"} ${locale === "id" ? "Bahasa Indonesia" : "Bahasa Inggris"}`;
    } else if (root === "details") {
      field = typeof locale === "string" ? locale : "form";
      label = ({ category: "Kategori", tags: "Tags", authorName: "Nama penulis", image: "Cover" } as Record<string, string>)[field] ?? "Metadata portfolio";
    } else label = ({ slug: "Slug", publishedAt: "Jadwal publikasi", status: "Status publikasi", id: "Portfolio", version: "Versi portfolio" } as Record<string, string>)[field] ?? label;
    if (errors[field]) continue;
    if (issue.code === "custom" && issue.params?.publicationMinimum) {
      errors[field] = `${label} minimal ${issue.params.publicationMinimum} karakter${property === "body" ? " teks" : ""} untuk publikasi.`;
    } else if (issue.code === "too_small" && issue.origin === "string") {
      errors[field] = `${label} minimal ${issue.minimum} karakter.`;
    } else if (issue.code === "too_big" && issue.origin === "string") {
      errors[field] = `${label} maksimal ${issue.maximum} karakter.`;
    } else if (field === "slug") {
      errors[field] = "Slug harus berupa nama deskriptif dengan huruf kecil, angka, dan tanda hubung; bukan nomor saja atau UUID.";
    } else if (field === "publishedAt") {
      errors[field] = "Pilih tanggal dan waktu publikasi yang valid (UTC) untuk status SCHEDULED.";
    } else if (field.endsWith(".richBody")) {
      errors[field] = `${label} belum valid. Periksa format, tautan, dan panjang teks (maksimal 30.000 karakter).`;
    } else errors[field] = `${label} belum valid. Periksa kembali sebelum menyimpan.`;
  }
  return errors;
}
