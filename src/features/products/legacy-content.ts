import { detailsSchema, translationSchema } from "../cms/schema";
import { plainTextToRichDocument } from "../cms/rich-text";
import { productCtaSchema } from "./cta-schema";

// Read adapter only: preserve stored plain text/features and valid configured CTA.
// It never changes publication/readiness or writes legacy rows during GET/build.
export function normalizeProductContent(entry: { translations: unknown; details: unknown }) {
  const source = entry.translations as { id: unknown; en: unknown };
  const translation = (locale: "id" | "en") => {
    const parsed = translationSchema.parse(source[locale]);
    return translationSchema.parse({ ...parsed, richBody: parsed.richBody ?? plainTextToRichDocument(parsed.body) });
  };
  const details = detailsSchema.parse(entry.details);
  const configured = entry.details as Record<string, unknown>;
  const legacyPath = Object.hasOwn(configured, "ctaPath") ? details.ctaPath.replace(/^\/(id|en)/, "") : "/consultation";
  return {
    translations: { id: translation("id"), en: translation("en") },
    details: { ...details, productCta: details.productCta ?? productCtaSchema.parse({ type: "internal", path: legacyPath }) },
  };
}
