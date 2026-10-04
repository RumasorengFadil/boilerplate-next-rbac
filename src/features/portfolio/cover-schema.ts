import { z } from "zod";

export const MAX_COVER_BYTES = 5 * 1024 * 1024;
export const coverMimeTypes = ["image/jpeg", "image/png", "image/webp"] as const;
export const coverOperationSchema = z.enum(["keep", "replace", "remove"]);
export const coverIdsSchema = z.object({ contentId: z.uuid(), assetId: z.uuid() }).strict();
export function coverPath(contentId: string, assetId: string) {
  const ids = coverIdsSchema.parse({ contentId, assetId });
  return `/media/portfolio/${ids.contentId}/${ids.assetId}`;
}
export function parseCoverPath(value: string) {
  const match = /^\/media\/portfolio\/([^/]+)\/([^/]+)$/.exec(value);
  if (!match) return null;
  const parsed = coverIdsSchema.safeParse({ contentId: match[1], assetId: match[2] });
  return parsed.success ? parsed.data : null;
}
export const coverFileSchema = z.instanceof(File).refine(file => file.size > 0 && file.size <= MAX_COVER_BYTES, "Cover maksimal 5 MB.")
  .refine(file => coverMimeTypes.some(type => type === file.type), "Gunakan JPG, PNG atau WebP.");
