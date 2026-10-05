import "server-only";
import { db } from "@/lib/db";
import { hasPermission } from "@/lib/permissions";
import { requirePermission } from "@/server/authorization";
import { recordAudit } from "@/server/audit";
import { publicContentWhere } from "@/features/cms/service";
import { productInputSchema, productLifecycleSchema, productRouteSchema } from "./schema";
import { normalizeProductContent } from "./legacy-content";

export class ProductMutationError extends Error {
  constructor(public readonly code: "NOT_FOUND" | "ARCHIVED" | "KIND" | "RICH_CONTENT" | "PERMISSION" | "SCHEDULE" | "VERSION" | "LIFECYCLE", message: string) { super(message); }
}
export function presentProduct(entry: Awaited<ReturnType<typeof db.contentEntry.findUniqueOrThrow>>) {
  if (entry.kind !== "PRODUCT") throw new ProductMutationError("KIND", "Data ini bukan produk.");
  return { ...entry, ...normalizeProductContent(entry) };
}

export async function saveProduct(raw: unknown) {
  const user = await requirePermission("content:write");
  const input = productInputSchema.parse(raw);
  return db.$transaction(async tx => {
    const previous = input.id ? await tx.contentEntry.findUnique({ where: { id: input.id } }) : null;
    if (input.id && !previous) throw new ProductMutationError("NOT_FOUND", "Produk tidak ditemukan.");
    if (previous && previous.kind !== "PRODUCT") throw new ProductMutationError("KIND", "Jenis konten tidak dapat diubah.");
    if (previous?.deletedAt) throw new ProductMutationError("ARCHIVED", "Pulihkan produk dari arsip sebelum mengedit.");
    if (!hasPermission(user.role, "content:publish") && (["PUBLISHED", "SCHEDULED"].includes(input.status) || previous && ["PUBLISHED", "SCHEDULED"].includes(previous.status)))
      throw new ProductMutationError("PERMISSION", "Akun Anda tidak memiliki izin publikasi produk.");
    if (previous) {
      const stored = previous.translations as { id: { richBody?: unknown }; en: { richBody?: unknown } };
      for (const locale of ["id", "en"] as const) if (stored[locale].richBody && !input.translations[locale].richBody)
        throw new ProductMutationError("RICH_CONTENT", "Gunakan editor produk agar konten detail tidak hilang.");
    }
    // Generic legacy writes cannot silently clear a new CTA they do not understand.
    const rawDetails = (raw as { details: Record<string, unknown> }).details;
    const cta = input.details.productCta ?? (previous ? normalizeProductContent(previous).details.productCta
      : Object.hasOwn(rawDetails, "ctaPath") ? normalizeProductContent(input).details.productCta : { type: "internal" as const, path: "/consultation" });
    const normalized = normalizeProductContent({ translations: input.translations,
      details: { ...input.details, productCta: cta } });
    const publishedAt = input.status === "PUBLISHED"
      ? previous?.status === "PUBLISHED" ? previous.publishedAt ?? new Date() : new Date()
      : input.status === "SCHEDULED" ? new Date(input.publishedAt!) : null;
    if (input.status === "SCHEDULED" && publishedAt! <= new Date())
      throw new ProductMutationError("SCHEDULE", "Jadwal publikasi harus berada di masa depan (UTC).");
    const data = { kind: input.kind, slug: input.slug, status: input.status, ...normalized, publishedAt };
    if (previous) {
      const result = await tx.contentEntry.updateMany({ where: { id: previous.id, kind: "PRODUCT", version: input.version, deletedAt: null }, data: { ...data, version: { increment: 1 } } });
      if (!result.count) throw new ProductMutationError("VERSION", "Produk telah berubah. Muat ulang versi terbaru sebelum menyimpan.");
    }
    const saved = previous ? await tx.contentEntry.findUniqueOrThrow({ where: { id: previous.id } }) : await tx.contentEntry.create({ data: { ...data, authorId: user.id } });
    const snapshot = (row: typeof saved) => ({ slug: row.slug, status: row.status, version: row.version, productStatus: presentProduct(row).details.productStatus });
    await recordAudit(tx, { actorId: user.id, module: "cms", action: previous ? "product.update" : "product.create", recordId: saved.id,
      ...(previous ? { before: snapshot(previous) } : {}), after: snapshot(saved) });
    return saved;
  });
}

// Live, uncached foundation query; HTTP redirect/metadata is implemented in Task 5.
export async function resolvePublishedProduct(raw: unknown) {
  const parsed = productRouteSchema.safeParse(raw);
  if (!parsed.success) return null;
  const route = await db.productRoute.findUnique({ where: { value: parsed.data }, select: { contentId: true } });
  if (!route) return null;
  const row = await db.contentEntry.findFirst({ where: { ...publicContentWhere("PRODUCT"), id: route.contentId } });
  if (!row) return null;
  return { entry: presentProduct(row), canonicalSlug: row.slug, redirect: parsed.data !== row.slug };
}

export async function changeProductLifecycle(raw: unknown) {
  const user = await requirePermission("content:publish");
  const input = productLifecycleSchema.parse(raw);
  return db.$transaction(async tx => {
    const previous = await tx.contentEntry.findFirst({ where: { id: input.id, kind: "PRODUCT" } });
    if (!previous) throw new ProductMutationError("NOT_FOUND", "Produk tidak ditemukan.");
    if (input.operation === "restore" ? !previous.deletedAt : Boolean(previous.deletedAt))
      throw new ProductMutationError("LIFECYCLE", "Status arsip produk telah berubah. Muat ulang halaman.");
    const result = await tx.contentEntry.updateMany({ where: { id: input.id, kind: "PRODUCT", version: input.version, deletedAt: previous.deletedAt },
      data: { deletedAt: input.operation === "archive" ? new Date() : null, status: input.operation === "archive" ? "ARCHIVED" : "DRAFT", publishedAt: null, version: { increment: 1 } } });
    if (!result.count) throw new ProductMutationError("VERSION", "Produk telah berubah. Muat ulang versi terbaru sebelum menyimpan.");
    const saved = await tx.contentEntry.findUniqueOrThrow({ where: { id: input.id } });
    await recordAudit(tx, { actorId: user.id, module: "cms", action: `product.${input.operation}`, recordId: saved.id,
      before: { status: previous.status, version: previous.version, deletedAt: previous.deletedAt?.toISOString() ?? null },
      after: { status: saved.status, version: saved.version, deletedAt: saved.deletedAt?.toISOString() ?? null } });
    return saved;
  });
}
