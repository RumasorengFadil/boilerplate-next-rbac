import "server-only";
import { randomUUID } from "crypto";
import { cookies } from "next/headers";
import { z } from "zod";
import { rateLimit as sharedRateLimit, RateLimitError } from "@/server/public-rate-limit";
import { getAssistantEnv } from "./config/env";
import { RequestError } from "@/server/http";
export { RequestError, assertOrigin, readBody } from "@/server/http";
export async function session(create = false) {
  const store = await cookies(); const raw = store.get("ai_session")?.value;
  if (z.string().uuid().safeParse(raw).success) return raw!;
  if (!create) return null;
  const id = randomUUID();
  store.set("ai_session", id, { httpOnly: true, secure: getAssistantEnv().secureCookie, sameSite: "strict", path: "/", maxAge: 86400 * 90 });
  return id;
}
export async function rateLimit(request: Request, limit: number, owner: string) {
  try { await sharedRateLimit(request, limit, owner); }
  catch (error) { if (error instanceof RateLimitError) throw new RequestError(429); throw error; }
}
export function friendlyError(language = "id") {
  return language === "en" ? "The assistant is unavailable right now. Please retry or contact LunaBiner." : "Assistant sedang tidak tersedia. Coba kembali atau hubungi LunaBiner.";
}
