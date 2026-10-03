import "server-only";
import { z } from "zod";
import type { AssistantRuntimeConfig } from "../config/schema";
import type { ChatMessage, LlmProvider, ToolDefinition } from "./types";
const resultSchema = z.object({ choices: z.array(z.object({ message: z.object({
  content: z.string().nullable().optional(),
  tool_calls: z.array(z.object({ id: z.string(), type: z.literal("function"), function: z.object({ name: z.string(), arguments: z.string() }) })).optional(),
}) })).min(1) });
export class OpenAiCompatibleProvider implements LlmProvider {
  constructor(private config: { baseUrl: string; apiKey?: string }, private runtime: AssistantRuntimeConfig) {}
  private async request(messages: ChatMessage[], tools?: ToolDefinition[], stream = false) {
    for (let attempt = 0; ; attempt++) {
      try {
        const response = await fetch(this.config.baseUrl, {
          method: "POST", headers: { "Content-Type": "application/json", ...(this.config.apiKey ? { Authorization: `Bearer ${this.config.apiKey}` } : {}) },
          body: JSON.stringify({ model: this.runtime.activeModel, messages, temperature: this.runtime.temperature,
            max_tokens: this.runtime.maxOutputTokens, stream, ...(tools?.length ? { tools } : {}) }),
          signal: AbortSignal.timeout(this.runtime.timeoutMs), cache: "no-store",
        });
        if (response.ok) return response;
        if (attempt >= this.runtime.maxRetries || (response.status !== 429 && response.status < 500)) throw new Error("Provider unavailable.");
      } catch { if (attempt >= this.runtime.maxRetries) throw new Error("Provider unavailable."); }
      await new Promise(resolve => setTimeout(resolve, 250 * 2 ** attempt));
    }
  }
  async complete(messages: ChatMessage[], tools?: ToolDefinition[]) {
    const response = await this.request(messages, tools);
    const parsed = resultSchema.safeParse(await response.json());
    if (!parsed.success) throw new Error("Invalid provider response.");
    const message = parsed.data.choices[0].message;
    if (!message.content && !message.tool_calls?.length) throw new Error("Empty provider response.");
    return { content: message.content ?? "", toolCalls: message.tool_calls ?? [] };
  }
  async stream(messages: ChatMessage[], onDelta: (value: string) => void) {
    const response = await this.request(messages, undefined, true);
    if (!response.body) throw new Error("Empty provider stream.");
    const reader = response.body.getReader(); const decoder = new TextDecoder();
    let pending = ""; let answer = "";
    while (true) {
      const { done, value } = await reader.read(); if (done) break;
      pending += decoder.decode(value, { stream: true });
      const lines = pending.split("\n"); pending = lines.pop() ?? "";
      for (const line of lines) {
        if (!line.startsWith("data: ") || line.slice(6).trim() === "[DONE]") continue;
        const event = JSON.parse(line.slice(6));
        const delta = event.choices?.[0]?.delta?.content;
        if (typeof delta === "string") { answer += delta; onDelta(delta); }
      }
    }
    if (!answer) throw new Error("Empty provider stream.");
    return answer;
  }
}
