import { coverIdsSchema } from "../portfolio/cover-schema";
export { coverIdsSchema, coverFileSchema, coverOperationSchema, coverMimeTypes, MAX_COVER_BYTES } from "../portfolio/cover-schema";

export function productCoverPath(contentId: string, assetId: string) {
  const ids = coverIdsSchema.parse({ contentId, assetId });
  return `/media/products/${ids.contentId}/${ids.assetId}`;
}
export function parseProductCoverPath(value: string) {
  const match = /^\/media\/products\/([^/]+)\/([^/]+)$/.exec(value);
  if (!match) return null;
  const parsed = coverIdsSchema.safeParse({ contentId: match[1], assetId: match[2] });
  return parsed.success ? parsed.data : null;
}
