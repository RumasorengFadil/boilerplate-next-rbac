import { db } from "@/lib/db";
import { requirePermission } from "@/server/authorization";
import { isPublicStatus } from "@/features/cms/schema";
import { coverIdsSchema, productCoverPath } from "@/features/products/cover-schema";
import { readCover } from "@/features/products/cover-storage";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const headers = { "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff", "X-Robots-Tag": "noindex" };
export async function GET(_request: Request, { params }: { params: Promise<{ contentId: string; assetId: string }> }) {
  const parsed = coverIdsSchema.safeParse(await params);
  if (!parsed.success) return new Response(null, { status: 404, headers });
  try {
    const image = productCoverPath(parsed.data.contentId, parsed.data.assetId);
    const entry = await db.contentEntry.findFirst({ where: { id: parsed.data.contentId, kind: "PRODUCT", details: { path: ["image"], equals: image } } });
    if (!entry) return new Response(null, { status: 404, headers });
    if (entry.deletedAt || !isPublicStatus(entry.status, entry.publishedAt)) {
      try { await requirePermission("content:read"); } catch { return new Response(null, { status: 404, headers }); }
    }
    const bytes = await readCover(parsed.data);
    return new Response(new Uint8Array(bytes), { headers: { ...headers, "Content-Type": "image/webp", "Content-Length": String(bytes.length) } });
  } catch { return new Response(null, { status: 503, headers }); }
}
