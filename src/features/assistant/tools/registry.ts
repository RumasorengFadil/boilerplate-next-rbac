import "server-only";
import { z } from "zod";
import { getKnowledge } from "../retrieval/knowledge";
import type { ToolDefinition } from "../providers/types";
const sources = { search_services: "service", search_case_studies: "case-study", search_products: "product", search_insights: "insight" } as const;
export const searchInput = z.object({ query: z.string().trim().min(2).max(1000) }).strict();
export const toolDefinitions: ToolDefinition[] = Object.keys(sources).map(name => ({
  type: "function", function: { name, description: "Search published LunaBiner knowledge. Illustrative case studies do not prove completed work.",
    parameters: { type: "object", properties: { query: { type: "string" } }, required: ["query"], additionalProperties: false } },
}));
export const leadTool: ToolDefinition = { type: "function", function: { name: "create_lead", description: "Offer the separate human consent form. This tool never writes contacts or creates a lead by itself.", parameters: { type: "object", properties: {}, additionalProperties: false } } };
export async function executeTool(name: string, input: unknown, leadEnabled: boolean) {
  if (name === "create_lead" && leadEnabled) { z.object({}).strict().parse(input); return { action: "open_consent_form" }; }
  if (!(name in sources)) throw new Error("Tool not allowed.");
  const { query } = searchInput.parse(input);
  const source = sources[name as keyof typeof sources];
  const terms = query.toLowerCase().split(/\s+/).filter(x => x.length > 2);
  return getKnowledge().filter(x => x.source === source && terms.some(term => (x.title + " " + x.content).toLowerCase().includes(term))).slice(0, 6);
}
