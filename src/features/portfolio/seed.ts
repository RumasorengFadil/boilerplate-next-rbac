import type { PrismaClient } from "@prisma/client";
import { website } from "../website/content";
import { portfolioInputSchema } from "./schema";
import type { RichNode } from "../cms/rich-text";

// Stable UUIDs identify seed ownership even after an administrator renames the slug.
export const portfolioExamples = [
  { id: "e16967a1-9e2d-44ee-a75b-4fddae4db486", slug: "platform-operasi-perusahaan-energi", legacy: "1" },
  { id: "9b7b418a-6bf3-40d2-9576-1b7fbed5d3e7", slug: "otomasi-dokumen-bisnis-distribusi", legacy: "2" },
  { id: "f52ef529-3c96-4ce2-868a-e7645715e1c0", slug: "pusat-pengetahuan-tim-layanan", legacy: "3" },
] as const;

export async function seedPortfolioExamples(client: PrismaClient) {
  return client.$transaction(async tx => {
    let created = 0, skipped = 0;
    for (const [index, sample] of portfolioExamples.entries()) {
      const previous = await tx.contentEntry.findUnique({ where: { id: sample.id } });
      if (previous && previous.kind !== "CASE_STUDY") throw new Error("Seed UUID is owned by another content kind.");
      if (!previous) {
        const project = website.projects[index];
        const approach = {
          id: "Kami memetakan alur kerja, titik pertukaran data, dan keputusan yang perlu didukung sistem sebelum merancang solusi.",
          en: "We mapped the workflows, data handoffs, and decisions the system needed to support before designing the solution.",
        };
        const translation = (locale: "id" | "en") => {
          const sections = [
            [locale === "id" ? "Tantangan bisnis" : "Business challenge", project.problem[locale]],
            [locale === "id" ? "Pendekatan" : "Approach", approach[locale]],
            [locale === "id" ? "Solusi" : "Solution", project.solution[locale]],
            [locale === "id" ? "Dampak" : "Impact", project.impact[locale]],
          ];
          const richBody: RichNode = { type: "doc", content: sections.flatMap(([heading, text]): RichNode[] => [
            { type: "heading", attrs: { level: 2 }, content: [{ type: "text", text: heading }] },
            { type: "paragraph", content: [{ type: "text", text }] },
          ]) };
          return { title: project.title[locale], excerpt: project.solution[locale], richBody };
        };
        const input = portfolioInputSchema.parse({
          kind: "CASE_STUDY", slug: sample.slug, status: "PUBLISHED",
          translations: { id: translation("id"), en: translation("en") },
          details: { industry: project.industry, capabilities: [...project.capabilities],
            verifiedProject: false, challenge: project.problem, approach, solution: project.solution, impact: project.impact,
            relatedServices: [index === 0 ? "software" : index === 1 ? "automation" : "ai"] },
        });
        await tx.contentEntry.create({ data: { id: sample.id, kind: input.kind, slug: input.slug, status: input.status,
          translations: input.translations, details: input.details, publishedAt: new Date("2026-10-04T00:00:00.000Z") } });
        created++;
      } else skipped++;
      // SQL reservation refuses conflicting ownership; the entire seed rolls back.
      await tx.$executeRaw`SELECT reserve_portfolio_route(${sample.legacy}, ${sample.id}::uuid)`;
    }
    return { created, skipped };
  });
}
