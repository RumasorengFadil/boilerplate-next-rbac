import "server-only";
import { randomUUID } from "crypto";
import { cookies } from "next/headers";
import { z } from "zod";
import { db } from "@/lib/db";
import { analyticsInputSchema } from "./schema";
import { rateLimit } from "@/server/public-rate-limit";

export async function recordPublicEvent(raw: unknown, request: Request) {
  const input = analyticsInputSchema.parse(raw);
  const store = await cookies();
  const uuid = (key: string, seconds: number) => {
    const current = store.get(key)?.value;
    const value = z.uuid().safeParse(current).success ? current! : randomUUID();
    store.set(key, value, { httpOnly: true, sameSite: "strict", secure: process.env.NODE_ENV === "production", path: "/", maxAge: seconds });
    return value;
  };
  const visitorId = uuid("analytics_visitor", 86400*90);
  const sessionId = uuid("analytics_session", 1800);
  store.set("analytics_consent", "accepted", { httpOnly: true, sameSite: "strict", secure: process.env.NODE_ENV === "production", path: "/", maxAge: 86400*90 });
  await rateLimit(request, 60, visitorId, "analytics");
  const { consent, ...event } = input;
  if (!consent) throw new Error("Consent required.");
  await db.analyticsEvent.create({ data: { ...event, visitorId, sessionId } });
}
export async function consentedVisitorId() {
  const store = await cookies();
  if (store.get("analytics_consent")?.value !== "accepted") return undefined;
  const visitor = store.get("analytics_visitor")?.value;
  return z.uuid().safeParse(visitor).success ? visitor : undefined;
}
