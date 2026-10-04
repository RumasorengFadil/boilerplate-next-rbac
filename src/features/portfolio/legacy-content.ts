import { z } from "zod";
import { detailsSchema, translationSchema } from "@/features/cms/schema";
import { plainTextToRichDocument, richDocumentSchema, richTextToPlainText, type RichNode } from "@/features/cms/rich-text";

export const legacyPortfolioKeys = ["industry", "challenge", "approach", "solution", "impact", "before", "after", "architecture", "capabilities", "technology"] as const;
const labels = {
  industry: { id: "Industri", en: "Industry" }, challenge: { id: "Tantangan bisnis", en: "Business challenge" },
  approach: { id: "Pendekatan", en: "Approach" }, solution: { id: "Solusi", en: "Solution" },
  impact: { id: "Dampak", en: "Impact" }, before: { id: "Sebelum", en: "Before" },
  after: { id: "Sesudah", en: "After" }, architecture: { id: "Arsitektur", en: "Architecture" },
  capabilities: { id: "Kemampuan", en: "Capabilities" }, technology: { id: "Teknologi", en: "Technology" },
};
const normalize = (text: string) => text.normalize("NFC").replace(/\s+/gu, " ").trim();
const contains = (document: RichNode, text: string) => (` ${normalize(richTextToPlainText(document))} `).includes(` ${normalize(text)} `);

// Pure converter: no reads/writes. Callers must validate all rows before applying.
export function convertLegacyPortfolioContent(raw: { translations: unknown; details: unknown }) {
  const translations = z.object({ id: translationSchema, en: translationSchema }).strict().parse(raw.translations);
  const originalDetails = z.record(z.string(), z.unknown()).parse(raw.details);
  const details = detailsSchema.parse(originalDetails);
  const converted = (locale: "id" | "en") => {
    const current = translations[locale];
    const document = structuredClone(current.richBody ?? plainTextToRichDocument(current.body));
    for (const key of legacyPortfolioKeys) {
      const value = details[key];
      const isList = Array.isArray(value);
      const values = isList ? value : [value[locale]];
      const missing: string[] = [];
      for (const text of values) if (text.trim() && !contains(document, text) && !missing.some(item => normalize(item) === normalize(text))) missing.push(text);
      if (!missing.length) continue;
      document.content!.push({ type: "heading", attrs: { level: 2 }, content: [{ type: "text", text: labels[key][locale] }] });
      if (isList) document.content!.push({ type: "bulletList", content: missing.map(text => ({ type: "listItem", content: [
        { type: "paragraph", content: [{ type: "text", text }] },
      ] })) });
      else document.content!.push(...plainTextToRichDocument(missing[0]).content!);
    }
    // Fail before cleanup if merging exceeds the editor's safety limits.
    return translationSchema.parse({ ...current, richBody: richDocumentSchema.parse(document) });
  };
  const result = {
    translations: { id: converted("id"), en: converted("en") },
    // detailsSchema validated every stored key above; retain only that known
    // non-narrative subset without adding default keys to existing records.
    details: Object.fromEntries(Object.entries(originalDetails).filter(([key]) => !legacyPortfolioKeys.some(legacy => legacy === key))) as Partial<Omit<z.infer<typeof detailsSchema>, typeof legacyPortfolioKeys[number]>>,
  };
  return { ...result, changed: JSON.stringify(result.translations) !== JSON.stringify(raw.translations) || JSON.stringify(result.details) !== JSON.stringify(raw.details) };
}
