// Pure form boundary shared by the generic CMS and portfolio Server Actions.
export function parseContentForm(form: FormData, portfolio = false) {
  const text = (name: string) => String(form.get(name) ?? "");
  const list = (name: string) => text(name).split(/[\n,]/).map(value => value.trim()).filter(Boolean);
  const localized = (name: string) => ({ id: text(`${name}.id`), en: text(`${name}.en`) });
  const translations = (locale: string) => {
    const fields = Object.fromEntries(["title", "excerpt", "body", "seoTitle", "seoDescription"].map(field => [field, text(`${locale}.${field}`)]));
    if (!portfolio) return fields;
    const rich = text(`${locale}.richBody`);
    if (!rich || rich.length > 200000) throw new Error("Invalid rich content payload.");
    return { ...fields, richBody: JSON.parse(rich) as unknown };
  };
  const scheduled = text("publishedAt");
  const utc = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2})?$/.test(scheduled)
    ? scheduled + (scheduled.length === 16 ? ":00.000Z" : ".000Z") : scheduled;
  return {
    ...(text("id") ? { id: text("id") } : {}), version: text("version") || 1,
    kind: portfolio ? "CASE_STUDY" : text("kind"), slug: text("slug"), status: text("status"), publishedAt: scheduled ? utc : null,
    translations: { id: translations("id"), en: translations("en") },
    details: { category: text("category"), tags: list("tags"), authorName: text("authorName"), image: text("image"),
      client: text("client"), verifiedProject: form.get("verifiedProject") === "on",
      industry: localized("industry"), challenge: localized("challenge"), approach: localized("approach"),
      solution: localized("solution"), impact: localized("impact"), before: localized("before"), after: localized("after"), architecture: localized("architecture"),
      features: list("features"), capabilities: list("capabilities"), technology: list("technology"), gallery: list("gallery"),
      relatedServices: list("relatedServices"), relatedCaseStudies: list("relatedCaseStudies"), productStatus: text("productStatus") || "COMING_SOON",
      ctaLabel: localized("ctaLabel"), ctaPath: text("ctaPath") || "/id/contact",
    },
  };
}
