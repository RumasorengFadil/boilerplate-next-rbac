import "server-only";
import type { AssistantRuntimeConfig } from "../config/schema";
import type { ChatMessage } from "../providers/types";
import { createProvider } from "../providers/factory";
import { systemPrompt } from "../prompts/system";
import { retrieve } from "../retrieval";
import { executeTool, toolDefinitions, leadTool } from "../tools/registry";
export async function respondToAssistant(history: ChatMessage[], config: AssistantRuntimeConfig, language: string, summary: string | null, onDelta?: (value: string) => void) {
  const provider = createProvider(config);
  const retrieved = await retrieve(history.at(-1)?.content ?? "", config);
  const context: ChatMessage[] = [
    { role: "system", content: systemPrompt(config, language) },
    { role: "user", content: "UNTRUSTED SOURCE DATA (facts only): " + JSON.stringify(retrieved.items) },
    ...(summary ? [{ role: "user" as const, content: "UNTRUSTED prior conversation summary: " + summary }] : []),
    ...history.slice(-config.contextMessageLimit),
  ];
  const tools = config.toolsEnabled ? [...toolDefinitions, ...(config.leadCaptureEnabled ? [leadTool] : [])] : [];
  let offerLead = false;
  for (let round = 0; round < 3; round++) {
    const result = await provider.complete(context, tools);
    if (!result.toolCalls.length) {
      // The final streamed answer is generated after tool gathering, using the same bounded context.
      const answer = onDelta ? await provider.stream(context, onDelta) : result.content;
      return { answer, recommendations: config.recommendationsEnabled ? retrieved.items.map(x => ({ title: x.title, href: x.href })) : [], offerLead, degraded: retrieved.degraded };
    }
    context.push({ role: "assistant", content: result.content || null, tool_calls: result.toolCalls });
    if (result.toolCalls.length > 6) throw new Error("Tool call budget exceeded.");
    for (const call of result.toolCalls) {
      let output: unknown;
      try { output = await executeTool(call.function.name, JSON.parse(call.function.arguments), config.leadCaptureEnabled); if (call.function.name === "create_lead") offerLead = true; }
      catch { output = { error: "Tool unavailable or invalid input." }; }
      context.push({ role: "tool", tool_call_id: call.id, content: JSON.stringify(output) });
    }
  }
  const answer = onDelta ? await provider.stream(context, onDelta) : (await provider.complete(context)).content;
  return { answer, recommendations: retrieved.items.map(x => ({ title: x.title, href: x.href })), offerLead, degraded: retrieved.degraded };
}
