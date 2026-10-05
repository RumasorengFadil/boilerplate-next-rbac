import type { PrismaClient } from "@prisma/client";
import { website } from "../website/content";
import { plainTextToRichDocument } from "../cms/rich-text";
import { productInputSchema } from "./schema";
import { normalizeProductContent } from "./legacy-content";

export const productExamples = [
  { id: "5ad0c75f-8e38-4b0c-9e24-0aa0d3cc598e", slug: "enterprise-chat" },
  { id: "a7d40ab3-3222-48b5-b789-f5895b4c268e", slug: "ai-cashflow" },
] as const;

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
        const richBody = plainTextToRichDocument(example.text[locale]);
        return { title: example.name, excerpt: example.text[locale], richBody };
      };
      const input = productInputSchema.parse({ kind: "PRODUCT", slug: sample.slug, status: "PUBLISHED",
        translations: { id: translation("id"), en: translation("en") },
        details: { productStatus: "COMING_SOON", features: [...example.items],
          productCta: { type: "internal", path: "/consultation" }, ctaLabel: { id: "Diskusikan produk", en: "Discuss this product" } } });
      await tx.contentEntry.create({ data: { id: sample.id, kind: "PRODUCT", slug: input.slug, status: input.status,
        ...normalizeProductContent(input), publishedAt: new Date("2026-10-05T00:00:00.000Z") } });
      created++;
    }
    return { created, skipped };
  });
}
