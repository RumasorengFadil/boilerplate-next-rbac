import { z } from "zod";

export const seoLocaleSchema = z.enum(["id", "en"]);
export const seoPageKeys = ["home", "solutions", "work", "products", "insights", "about", "contact", "consultation"] as const;
export const seoPageKeySchema = z.enum(seoPageKeys);
// Paths exclude locale: callers cannot supply external URLs, queries or traversal.
const pagePath = z.string().regex(/^(?:\/(?:[a-z0-9]+(?:-[a-z0-9]+)*)(?:\/[a-z0-9]+(?:-[a-z0-9]+)*)*)?$/);
export const seoDocumentSchema = z.object({
  locale: seoLocaleSchema,
  path: pagePath,
  title: z.string().trim().min(2).max(220),
  headline: z.string().trim().min(2).max(220),
  description: z.string().trim().min(10).max(500),
  keywords: z.array(z.string().trim().min(1).max(200)).max(30),
  category: z.string().trim().min(1).max(100),
  pageType: z.enum(["WebPage", "AboutPage", "ContactPage", "CollectionPage"]),
  entityType: z.enum(["Article", "CreativeWork"]).optional(),
  authorName: z.string().trim().min(1).max(100).optional(),
  publishedAt: z.iso.datetime().optional(),
  modifiedAt: z.iso.datetime().optional(),
  illustrative: z.boolean().default(false),
}).strict();
export type SeoDocument = z.infer<typeof seoDocumentSchema>;
export type SeoPageKey = z.infer<typeof seoPageKeySchema>;
export const schemaItemSchema = z.object({
  type: z.enum(["Service", "Article", "CreativeWork"]),
  name: z.string().trim().min(1).max(220),
  description: z.string().trim().min(1).max(500),
  path: pagePath.optional(),
  concept: z.boolean().default(false),
}).strict().refine(item => !item.concept || item.type === "CreativeWork", "Only a CreativeWork can be labeled as a concept.");
export type SchemaItem = z.infer<typeof schemaItemSchema>;
