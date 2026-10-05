import type { PrismaClient } from "@prisma/client";
import { website } from "../website/content";
import { productSummaryInputSchema } from "./summary-input";
import { productExamples } from "./examples";
export { productExamples } from "./examples";

export async function seedProductExamples(client: PrismaClient) {
  return client.$transaction(async tx => {
    let created = 0, skipped = 0;
    for (const [index, sample] of productExamples.entries()) {
      const previous = await tx.contentEntry.findUnique({ where: { id: sample.id } });
      if (previous && previous.kind !== "PRODUCT") throw new Error("Seed UUID belongs to another content kind.");
      const reservation = await tx.productRoute.findUnique({ where: { value: sample.slug }, select: { contentId: true } });
      // Existing canonical/renamed/archived products are never overwritten or duplicated.
      if (previous || reservation) { skipped++; continue; }
      const example = website.products[index];
      const translation = (locale: "id" | "en") => {
        // Keep the initial textarea concise; readiness labels describe the concept.
        return { title: example.name, excerpt: example.text[locale] };
      };
      const input = productSummaryInputSchema.parse({ kind: "PRODUCT", slug: sample.slug, status: "PUBLISHED",
        translations: { id: translation("id"), en: translation("en") },
        details: { productStatus: "COMING_SOON", productFeatures: { id: [...sample.features.id], en: [...sample.features.en] },
          productCta: { type: "internal", path: "/consultation" }, ctaLabel: { id: "Diskusikan produk", en: "Discuss this product" } } });
      const summary = (locale: "id" | "en") => { const { body, richBody, ...text } = input.translations[locale]; void body; void richBody; return text; };
      const { features, ...details } = input.details; void features;
      await tx.contentEntry.create({ data: { id: sample.id, kind: "PRODUCT", slug: input.slug, status: input.status,
        translations: { id: summary("id"), en: summary("en") }, details, publishedAt: new Date("2026-10-05T00:00:00.000Z") } });
      created++;
    }
    return { created, skipped };
  });
}
