// Plain text only. Uploaded cover/legacy metadata never come from this form.
export function parseProductForm(form: FormData) {
  const text = (name: string) => {
    const value = form.get(name);
    if (value !== null && typeof value !== "string") throw new Error("Expected text field.");
    return value ?? "";
  };
  const translation = (locale: "id" | "en") => Object.fromEntries(
    ["title", "excerpt", "seoTitle", "seoDescription"].map(field => [field, text(`${locale}.${field}`)]));
  const features = (locale: "id" | "en") => form.getAll(`${locale}.feature`).map(value => {
    if (typeof value !== "string") throw new Error("Expected text field.");
    return value;
  });
  const schedule = text("publishedAt");
  const publishedAt = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2})?$/.test(schedule)
    ? schedule + (schedule.length === 16 ? ":00.000Z" : ".000Z") : schedule;
  return { ...(text("id") ? { id: text("id") } : {}), version: text("version") || 1,
    kind: "PRODUCT", slug: text("slug"), status: text("status"), publishedAt: schedule ? publishedAt : null,
    translations: { id: translation("id"), en: translation("en") },
    details: { category: text("category"), tags: text("tags").split(",").map(value => value.trim()).filter(Boolean), authorName: text("authorName"),
      productStatus: text("productStatus"), productFeatures: { id: features("id"), en: features("en") }, ctaLabel: { id: text("ctaLabel.id"), en: text("ctaLabel.en") },
      productCta: text("ctaType") === "external" ? { type: "external", url: text("ctaUrl") }
        : { type: text("ctaType"), path: text("ctaInternalPath") || "/consultation" },
    } };
}
