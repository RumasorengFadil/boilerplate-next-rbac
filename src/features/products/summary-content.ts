import { z } from "zod";
import { translationSchema } from "../cms/schema";
import { plainTextToRichDocument, richDocumentSchema } from "../cms/rich-text";
import { PRODUCT_TEXT_MAX } from "./schema";

export const PRODUCT_FEATURE_MAX = 100;
export const PRODUCT_FEATURE_COUNT_MAX = 12;
export function productJsonFingerprint(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(productJsonFingerprint).join(",")}]`;
  if (value && typeof value === "object") return `{${Object.entries(value).sort(([a], [b]) => a.localeCompare(b)).map(([key, item]) => `${JSON.stringify(key)}:${productJsonFingerprint(item)}`).join(",")}}`;
  return JSON.stringify(value);
}
const featureList = z.array(z.string().trim().min(1).max(PRODUCT_FEATURE_MAX)).max(PRODUCT_FEATURE_COUNT_MAX);
export const productFeaturesSchema = z.object({ id: featureList, en: featureList }).strict();
const summaryTranslation = z.object({
  title: z.string().trim().min(2).max(180),
  excerpt: z.string().trim().max(PRODUCT_TEXT_MAX),
  seoTitle: z.string().trim().max(70).default(""),
  seoDescription: z.string().trim().max(180).default(""),
}).strict();

// Content contract only; publication/readiness/authorization remain in the service.
export const productSummaryContentSchema = z.object({
  translations: z.object({ id: summaryTranslation, en: summaryTranslation }).strict(),
  productFeatures: productFeaturesSchema,
}).strict();
export type ProductSummaryContent = z.infer<typeof productSummaryContentSchema>;
export function validateProductSummaryPublication(content: ProductSummaryContent) {
  const issues: z.ZodError["issues"] = [];
  for (const locale of ["id", "en"] as const) if (content.translations[locale].excerpt.length < 10)
    issues.push({ code: "custom", path: ["translations", locale, "excerpt"], message: "Ringkasan minimal 10 karakter untuk publikasi.", params: { publicationMinimum: 10 } });
  if (issues.length) throw new z.ZodError(issues);
}

// Read compatibility is intentionally wider than new input: never truncate legacy.
const legacyFeatures = z.array(z.string().trim().min(1).max(200)).max(30);
const localizedLegacyFeatures = z.object({ id: legacyFeatures, en: legacyFeatures }).strict();
const sourceSchema = z.object({
  kind: z.literal("PRODUCT"),
  translations: z.object({ id: translationSchema, en: translationSchema }).strict(),
  details: z.object({ features: legacyFeatures.optional(), productFeatures: localizedLegacyFeatures.optional() }).passthrough(),
}).passthrough();

export function readProductSummaryContent(raw: unknown) {
  const source = sourceSchema.parse(raw);
  const translation = (locale: "id" | "en") => {
    const { title, excerpt, seoTitle, seoDescription } = source.translations[locale];
    return { title, excerpt, seoTitle, seoDescription };
  };
  const legacy = source.details.features ?? [];
  return { translations: { id: translation("id"), en: translation("en") },
    // Literal fallback, not a claim that arbitrary legacy text was translated.
    productFeatures: source.details.productFeatures ?? { id: [...legacy], en: [...legacy] } };
}

// Pure preflight for the later backed-up data migration. No database writes.
export function previewProductSummaryConversion(raw: unknown) {
  const source = sourceSchema.parse(raw);
  const content = readProductSummaryContent(source);
  const conflicts: string[] = [];
  for (const locale of ["id", "en"] as const) {
    const previous = source.translations[locale];
    if (!previous.excerpt && previous.body.length <= PRODUCT_TEXT_MAX)
      content.translations[locale].excerpt = previous.body;
    const summary = content.translations[locale].excerpt;
    if (previous.body && previous.body !== summary) conflicts.push(`${locale}.distinctBody`);
    // Even matching text may carry meaningful formatting; require explicit review.
    if (previous.richBody && productJsonFingerprint(previous.richBody) !== productJsonFingerprint(richDocumentSchema.parse(plainTextToRichDocument(previous.body))))
      conflicts.push(`${locale}.richFormatting`);
  }
  const parsed = productSummaryContentSchema.safeParse(content);
  if (!parsed.success) for (const issue of parsed.error.issues) conflicts.push(issue.path.join("."));
  return { ready: conflicts.length === 0, content, conflicts: [...new Set(conflicts)] };
}
