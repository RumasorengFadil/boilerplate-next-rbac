import "server-only";
import { createHash, randomUUID } from "crypto";
import { cookies } from "next/headers";
import { z } from "zod";
import { db } from "@/lib/db";
import { getAssistantEnv } from "./config/env";
export class RequestError extends Error { constructor(public status: number) { super("Assistant request rejected."); } }
export function assertOrigin(request: Request) {
  const origin = request.headers.get("origin");
  if (!origin || new URL(origin).host !== request.headers.get("host")) throw new RequestError(403);
}
export async function readBody(request: Request) {
  const text = await request.text();
  if (text.length > 12000) throw new RequestError(413);
  try { return JSON.parse(text); } catch { throw new RequestError(400); }
}
export async function session(create = false) {
  const store = await cookies(); const raw = store.get("ai_session")?.value;
  if (z.string().uuid().safeParse(raw).success) return raw!;
  if (!create) return null;
  const id = randomUUID();
  store.set("ai_session", id, { httpOnly: true, secure: getAssistantEnv().secureCookie, sameSite: "strict", path: "/", maxAge: 86400 * 90 });
  return id;
}
export async function rateLimit(request: Request, limit: number, owner: string) {
  const minute = Math.floor(Date.now() / 60000);
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  // Requires the deployment reverse proxy to overwrite forwarded headers.
  for (const identity of [owner, ip]) {
    const id = createHash("sha256").update(identity + ":" + minute).digest("hex");
    const row = await db.aiRateBucket.upsert({ where: { id }, create: { id, expiresAt: new Date((minute + 1) * 60000) }, update: { count: { increment: 1 } } });
    if (row.count > limit) throw new RequestError(429);
  }
}
export function friendlyError(language = "id") {
  return language === "en" ? "The assistant is unavailable right now. Please retry or contact LunaBiner." : "Assistant sedang tidak tersedia. Coba kembali atau hubungi LunaBiner.";
}
