import { z } from "zod";

export const productInternalPathSchema = z.string().max(200).regex(/^\/(?:[a-z0-9-]+(?:\/[a-z0-9-]+)*\/?)?$/)
  .refine(value => !/^\/(id|en)(?:\/|$)/.test(value), "Gunakan path tanpa prefix bahasa.");
export const productExternalUrlSchema = z.string().trim().max(2000).refine(value => {
  if (/[\s\\\u0000-\u001f\u007f]/.test(value)) return false;
  try {
    const url = new URL(value);
    return value.startsWith("https://") && url.protocol === "https:" && Boolean(url.hostname) && !url.username && !url.password;
  } catch { return false; }
}, "Gunakan URL HTTPS tanpa kredensial.");
export const productCtaSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("internal"), path: productInternalPathSchema.default("/consultation") }).strict(),
  z.object({ type: z.literal("external"), url: productExternalUrlSchema }).strict(),
]);
export type ProductCta = z.infer<typeof productCtaSchema>;

export function productCtaHref(cta: ProductCta, locale: "id" | "en") {
  const validated = productCtaSchema.parse(cta);
  return validated.type === "external" ? validated.url : `/${locale}${validated.path}`;
}
