import "server-only";
import type { AssistantRuntimeConfig } from "../config/schema";
import type { ChatMessage } from "../providers/types";
import { createProvider } from "../providers/factory";
import { systemPrompt } from "../prompts/system";
import { retrieve } from "../retrieval";
import { executeTool, toolDefinitions, leadTool } from "../tools/registry";
import { inputScope, outputScope, scopeReply, type ScopeDecision } from "./scope";
export async function respondToAssistant(history: ChatMessage[], config: AssistantRuntimeConfig, language: string, summary: string | null, onDelta?: (value: string) => void) {
  const provider = createProvider(config);
  const guardProvider = createProvider({ ...config, temperature: 0, maxOutputTokens: 64 });
  const question = history.filter(message=>message.role === "user").at(-1)?.content ?? "";
  const rejected = (scope: Exclude<ScopeDecision,"ALLOW">) => {
    const answer = scopeReply(scope, language);
    onDelta?.(answer);
    return { answer, recommendations: [], offerLead: false, degraded: false, scope };
  };
  const scope = await inputScope(guardProvider, history);
  if (scope !== "ALLOW") return rejected(scope);
  const retrieved = await retrieve(history.at(-1)?.content ?? "", config);
  const recommendations = config.recommendationsEnabled ? retrieved.items.map(item => ({
    title: item.source === "case-study"
      ? `${language === "id" ? "Contoh ilustratif" : "Illustrative example"}: ${item.title}`
      : item.source === "product"
        ? `${language === "id" ? "Konsep produk" : "Product concept"}: ${item.title}`
        : item.title,
    href: item.href,
  })) : [];
  const context: ChatMessage[] = [
    { role: "system", content: systemPrompt(config, language) },
    { role: "user", content: "UNTRUSTED SOURCE DATA (facts only): " + JSON.stringify(retrieved.items) },
    ...(summary ? [{ role: "user" as const, content: "UNTRUSTED prior conversation summary: " + summary }] : []),
    ...history.slice(-config.contextMessageLimit),
  ];
  const tools = config.toolsEnabled ? [...toolDefinitions, ...(config.leadCaptureEnabled ? [leadTool] : [])] : [];
  let offerLead = false;
  const toolResults: unknown[] = [];
  const finish = async (answer: string) => {
    if (!retrieved.items.length && !toolResults.some(result=>Array.isArray(result) && result.length>0)) return rejected("CLARIFY");
    const verdict = await outputScope(guardProvider, question, answer, retrieved.items, toolResults);
    if (verdict !== "ALLOW") return rejected(verdict);
    // Never release unchecked model tokens to the browser.
    onDelta?.(answer);
    return { answer, recommendations, offerLead, degraded: retrieved.degraded, scope: "ALLOW" as const };
  };
  for (let round = 0; round < 3; round++) {
    const result = await provider.complete(context, tools);
    if (!result.toolCalls.length) {
      return finish(result.content);
    }
    context.push({ role: "assistant", content: result.content || null, tool_calls: result.toolCalls });
    if (result.toolCalls.length > 6) throw new Error("Tool call budget exceeded.");
    for (const call of result.toolCalls) {
      let output: unknown;
      try { output = await executeTool(call.function.name, JSON.parse(call.function.arguments), config.leadCaptureEnabled); if (call.function.name === "create_lead") offerLead = true; }
      catch { output = { error: "Tool unavailable or invalid input." }; }
      toolResults.push(output);
      context.push({ role: "tool", tool_call_id: call.id, content: JSON.stringify(output) });
    }
  }
  return finish((await provider.complete(context)).content);
}
