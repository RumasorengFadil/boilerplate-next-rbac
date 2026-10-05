import { z } from "zod";
import { contentInputSchema } from "../cms/schema";

export const productStatuses = ["DRAFT", "PUBLISHED", "SCHEDULED"] as const;
export const productReadiness = ["COMING_SOON", "BETA", "LIVE"] as const;
export const productSlugSchema = z.string().trim().min(2).max(120).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
  .refine(value => !/^\d+$/.test(value) && !z.uuid().safeParse(value).success, "Gunakan slug deskriptif, bukan nomor atau UUID.");
export const productRouteSchema = z.string().min(1).max(120).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
export const productInputSchema = contentInputSchema.superRefine((input, context) => {
  if (input.kind !== "PRODUCT") context.addIssue({ code: "custom", path: ["kind"], message: "Produk membutuhkan PRODUCT." });
  if (!productStatuses.includes(input.status as typeof productStatuses[number]))
    context.addIssue({ code: "custom", path: ["status"], message: "Pilih DRAFT, PUBLISHED atau SCHEDULED. Arsip melalui aksi terpisah." });
  if (!productSlugSchema.safeParse(input.slug).success)
    context.addIssue({ code: "custom", path: ["slug"], message: "Gunakan slug produk deskriptif." });
});
export const productLifecycleSchema = z.object({ id: z.uuid(), version: z.number().int().min(1), operation: z.enum(["archive", "restore"]) }).strict();
export type ProductInput = z.infer<typeof productInputSchema>;

export function productValidationErrors(issues: z.ZodError["issues"]) {
  const errors: Record<string, string> = {};
  for (const issue of issues) {
    const [root, locale, property] = issue.path;
    let field = String(root ?? "form"), label = "Data produk";
    if (root === "translations" && (locale === "id" || locale === "en")) {
      const name = property === "body" || property === "richBody" ? "richBody" : String(property ?? "richBody");
      field = `${locale}.${name}`;
      label = `${({ title: "Judul", excerpt: "Ringkasan", richBody: "Konten detail", seoTitle: "Judul SEO", seoDescription: "Deskripsi SEO" } as Record<string, string>)[name] ?? "Konten"} ${locale === "id" ? "Bahasa Indonesia" : "Bahasa Inggris"}`;
    } else if (root === "details") {
      field = String(locale ?? "form");
      label = ({ productStatus: "Kesiapan produk", productCta: "Tujuan CTA", ctaLabel: "Label CTA", image: "Cover", category: "Kategori", tags: "Tags" } as Record<string, string>)[field] ?? "Metadata produk";
    } else label = ({ slug: "Slug", status: "Status publikasi", publishedAt: "Jadwal publikasi" } as Record<string, string>)[field] ?? label;
    if (errors[field]) continue;
    errors[field] = issue.code === "custom" && issue.params?.publicationMinimum
      ? `${label} minimal ${issue.params.publicationMinimum} karakter${property === "body" ? " teks" : ""} untuk publikasi.`
      : field === "slug" ? "Gunakan slug deskriptif dengan huruf kecil, angka dan tanda hubung; bukan nomor atau UUID."
      : field === "status" ? "Pilih DRAFT, PUBLISHED atau SCHEDULED. Gunakan tombol Arsipkan untuk mengarsipkan produk."
      : field === "productCta" ? "Pilih konsultasi internal atau masukkan URL HTTPS yang valid tanpa kredensial."
      : field === "publishedAt" ? "Pilih tanggal dan waktu publikasi yang valid (UTC) untuk SCHEDULED."
      : `${label} belum valid. Periksa format dan panjang isinya sebelum menyimpan.`;
  }
  return errors;
}
