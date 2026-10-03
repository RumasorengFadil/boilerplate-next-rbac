export type ToolCall = { id: string; type: "function"; function: { name: string; arguments: string } };
export type ChatMessage = { role: "system" | "user" | "assistant" | "tool"; content: string | null; tool_call_id?: string; tool_calls?: ToolCall[] };
export type ToolDefinition = { type: "function"; function: { name: string; description: string; parameters: Record<string, unknown> } };
export type ChatResult = { content: string; toolCalls: ToolCall[] };
export interface LlmProvider {
  complete(messages: ChatMessage[], tools?: ToolDefinition[]): Promise<ChatResult>;
  stream(messages: ChatMessage[], onDelta: (value: string) => void): Promise<string>;
}
