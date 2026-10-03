import "server-only";
import { createHash, randomUUID } from "crypto";
import { cookies, headers } from "next/headers";
import { z } from "zod";
import { db } from "@/lib/db";

export class RateLimitError extends Error {}
export async function rateLimit(request: Request, limit: number, owner: string, scope = "assistant") {
  const minute = Math.floor(Date.now() / 60000);
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  // Deployment reverse proxy must replace forwarding headers, never append client input.
  for (const identity of [owner, ip]) {
    const id = createHash("sha256").update(`${scope}:${identity}:${minute}`).digest("hex");
    const row = await db.aiRateBucket.upsert({ where: { id }, create: { id, expiresAt: new Date((minute + 1) * 60000) }, update: { count: { increment: 1 } } });
    if (row.count > limit) throw new RateLimitError("Request limit exceeded.");
  }
}
export async function limitPublicSubmission(scope: string, limit = 5) {
  const store = await cookies();
  const raw = store.get("public_submission")?.value;
  const owner = z.uuid().safeParse(raw).success ? raw! : randomUUID();
  if (raw !== owner) store.set("public_submission", owner, { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "strict", path: "/", maxAge: 3600 });
  await rateLimit(new Request("http://localhost", { headers: await headers() }), limit, owner, scope);
}
