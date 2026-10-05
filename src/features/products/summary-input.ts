import { z } from "zod";
import { detailsSchema } from "../cms/schema";
import { productSlugSchema, productStatuses } from "./schema";
import { productSummaryContentSchema, productFeaturesSchema, validateProductSummaryPublication } from "./summary-content";

export const productSummaryInputSchema = z.object({
  id: z.uuid().optional(), version: z.coerce.number().int().min(1).default(1),
  kind: z.literal("PRODUCT"), slug: productSlugSchema, status: z.enum(productStatuses),
  publishedAt: z.iso.datetime().nullable().default(null),
  translations: productSummaryContentSchema.shape.translations,
  details: detailsSchema.extend({ productFeatures: productFeaturesSchema }),
}).strict().superRefine((input, context) => {
  if (input.status === "PUBLISHED" || input.status === "SCHEDULED") {
    try { validateProductSummaryPublication({ translations: input.translations, productFeatures: input.details.productFeatures }); }
    catch (error) { if (error instanceof z.ZodError) for (const issue of error.issues)
      context.addIssue({ code: "custom", path: issue.path, message: issue.message, params: { publicationMinimum: 10 } }); else throw error; }
  }
  if (input.status === "SCHEDULED" && !input.publishedAt)
    context.addIssue({ code: "custom", path: ["publishedAt"], message: "Pilih jadwal UTC." });
}).transform(input => ({ ...input, translations: {
  id: { ...input.translations.id, body: "", richBody: undefined },
  en: { ...input.translations.en, body: "", richBody: undefined },
} }));
