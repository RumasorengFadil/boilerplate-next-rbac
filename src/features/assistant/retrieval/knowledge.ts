import { website } from "@/features/website/content";
export type KnowledgeItem = { source: "service" | "case-study" | "product" | "insight" | "company" | "faq"; title: string; content: string; href: string };
export function getKnowledge(): KnowledgeItem[] {
  return [
    ...website.services.map(item => ({ source: "service" as const, title: item.title.en,
      content: item.title.id + ". " + item.body.id + " " + item.body.en + " " + item.capabilities.join(", "), href: "/en/solutions" })),
    ...website.projects.map((item, index) => ({ source: "case-study" as const, title: item.title.en,
      content: "ILLUSTRATIVE SOLUTION EXAMPLE ONLY. Not a verified completed LunaBiner project or client. " + item.problem.id + " " + item.problem.en + " " + item.solution.en,
      href: "/en/work/" + (index + 1) })),
    ...website.articles.map(item => ({ source: "insight" as const, title: item.title.en, content: item.title.id + " " + item.excerpt.id + " " + item.excerpt.en, href: "/en/insights/" + item.slug })),
    ...website.products.map(item => ({ source: "product" as const, title: item.name,
      content: "Concept preview; not currently a live product. " + item.text.id + " " + item.text.en + " " + item.items.join(", "), href: "/en/products" })),
    { source: "company", title: "LunaBiner", content: website.companyDescription, href: "/en/about" },
    ...website.faq.map(item => ({ source: "faq" as const, title: item.question, content: item.answer, href: "/en/contact" })),
  ];
}
