export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { getAssistantEnv } = await import("./features/assistant/config/env");
    getAssistantEnv();
  }
}
