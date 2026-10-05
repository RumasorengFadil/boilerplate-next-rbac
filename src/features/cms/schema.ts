import { z } from "zod";
import { richDocumentSchema, richTextToPlainText } from "./rich-text";
import { parseCoverPath } from "../portfolio/cover-schema";
import { parseProductCoverPath } from "../products/cover-schema";
import { productCtaSchema } from "../products/cta-schema";

export const contentKinds = ["ARTICLE", "CASE_STUDY", "PRODUCT"] as const;
export const contentStatuses = ["DRAFT", "REVIEW", "SCHEDULED", "PUBLISHED", "ARCHIVED"] as const;
const localized = z.object({ id: z.string().trim().max(12000).default(""), en: z.string().trim().max(12000).default("") }).strict();
export const translationSchema = z.object({
  title: z.string().trim().min(2).max(180), excerpt: z.string().trim().max(400).default(""),
  body: z.string().trim().max(30000).default(""), seoTitle: z.string().trim().max(70).default(""),
  seoDescription: z.string().trim().max(180).default(""),
  richBody: richDocumentSchema.optional(),
}).strict().transform(input => input.richBody ? { ...input, body: richTextToPlainText(input.richBody) } : input)
  .superRefine((input, context) => {
    if (input.body.length > 30000) context.addIssue({ code: "custom", path: ["body"], message: "Plain-text representation is too long." });
  });
const internalImage = z.string().trim().max(500).refine(value => !value || /^\/images\/[\w./-]+$/.test(value) && !value.includes(".."), "Use an existing /images/ asset.");
const lines = z.array(z.string().trim().min(1).max(200)).max(30).default([]);
export const detailsSchema = z.object({
  category: z.string().trim().max(100).default(""), tags: lines,
  authorName: z.string().trim().max(100).default(""), image: z.string().trim().max(500).refine(value => internalImage.safeParse(value).success || Boolean(parseCoverPath(value)) || Boolean(parseProductCoverPath(value)), "Use a valid internal cover.").default(""),
  industry: localized.default({ id: "", en: "" }), client: z.string().trim().max(180).default(""),
  verifiedProject: z.boolean().default(false), challenge: localized.default({ id: "", en: "" }),
  approach: localized.default({ id: "", en: "" }), solution: localized.default({ id: "", en: "" }),
  impact: localized.default({ id: "", en: "" }), before: localized.default({ id: "", en: "" }),
  after: localized.default({ id: "", en: "" }), architecture: localized.default({ id: "", en: "" }),
  features: lines, capabilities: lines, technology: lines, gallery: z.array(internalImage).max(12).default([]),
  relatedServices: z.array(z.enum(["software", "automation", "ai", "data"])).max(4).default([]),
  relatedCaseStudies: z.array(z.uuid()).max(6).default([]),
  productStatus: z.enum(["COMING_SOON", "BETA", "LIVE"]).default("COMING_SOON"),
  productCta: productCtaSchema.optional(),
  productFeatures: z.object({ id: lines, en: lines }).strict().optional(),
  ctaLabel: localized.default({ id: "", en: "" }), ctaPath: z.string().max(200).regex(/^\/(?:id|en)\/[a-z0-9/-]*$/).default("/id/contact"),
}).strict();
export const contentInputSchema = z.object({
  id: z.uuid().optional(), version: z.coerce.number().int().min(1).default(1),
  kind: z.enum(contentKinds), slug: z.string().trim().min(2).max(120).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  status: z.enum(contentStatuses), publishedAt: z.iso.datetime().nullable().default(null),
  translations: z.object({ id: translationSchema, en: translationSchema }).strict(), details: detailsSchema,
}).strict().superRefine((input, context) => {
  if (input.kind !== "PRODUCT" && parseProductCoverPath(input.details.image))
    context.addIssue({ code: "custom", path: ["details", "image"], message: "Uploaded product covers require PRODUCT." });
  if (input.kind !== "CASE_STUDY" && parseCoverPath(input.details.image))
    context.addIssue({ code: "custom", path: ["details", "image"], message: "Uploaded covers are portfolio-only." });
  if (input.kind === "CASE_STUDY" && (/^\d+$/.test(input.slug) || z.uuid().safeParse(input.slug).success))
    context.addIssue({ code: "custom", path: ["slug"], message: "Use a descriptive case-study slug." });
  if (input.kind === "ARTICLE" && (input.translations.id.richBody || input.translations.en.richBody))
    context.addIssue({ code: "custom", path: ["translations"], message: "Rich body is limited to case studies and products." });
  if (input.kind !== "PRODUCT" && input.details.productCta)
    context.addIssue({ code: "custom", path: ["details", "productCta"], message: "Product CTA requires PRODUCT." });
  if (input.kind !== "PRODUCT" && input.details.productFeatures)
    context.addIssue({ code: "custom", path: ["details", "productFeatures"], message: "Product features require PRODUCT." });
  if (input.status === "PUBLISHED" || input.status === "SCHEDULED") {
    for (const locale of ["id", "en"] as const) {
      if (input.translations[locale].body.length < 30)
        context.addIssue({ code: "custom", path: ["translations", locale, "body"], params: { publicationMinimum: 30 }, message: "Published content needs at least 30 text characters." });
      if (input.translations[locale].excerpt.length < 10)
        context.addIssue({ code: "custom", path: ["translations", locale, "excerpt"], params: { publicationMinimum: 10 }, message: "Published content needs at least 10 excerpt characters." });
    }
  }
  if (input.status === "SCHEDULED" && !input.publishedAt) context.addIssue({ code: "custom", path: ["publishedAt"], message: "Scheduled publication needs a date." });
});
export type ContentInput = z.infer<typeof contentInputSchema>;

const transitions: Record<typeof contentStatuses[number], readonly typeof contentStatuses[number][]> = {
  DRAFT: ["REVIEW", "ARCHIVED"], REVIEW: ["DRAFT", "SCHEDULED", "PUBLISHED", "ARCHIVED"],
  SCHEDULED: ["DRAFT", "REVIEW", "PUBLISHED", "ARCHIVED"], PUBLISHED: ["DRAFT", "REVIEW", "ARCHIVED"], ARCHIVED: ["DRAFT"],
};
export function canTransition(from: typeof contentStatuses[number], to: typeof contentStatuses[number]) {
  return from === to || transitions[from].includes(to);
}
export function isPublicStatus(status: typeof contentStatuses[number], publishedAt: Date | null, now = new Date()) {
  return (status === "PUBLISHED" || status === "SCHEDULED") && publishedAt !== null && publishedAt <= now;
}
