import { NextResponse } from "next/server";
import { recordPublicEvent } from "@/features/analytics/service";
import { assertOrigin, readBody, RequestError } from "@/server/http";
import { RateLimitError } from "@/server/public-rate-limit";
export async function POST(request: Request) {
  try { assertOrigin(request); await recordPublicEvent(await readBody(request), request); return NextResponse.json({ success: true }, { headers: { "Cache-Control": "no-store" } }); }
  catch (error) { return NextResponse.json({ error: "Event could not be recorded." }, { status: error instanceof RequestError ? error.status : error instanceof RateLimitError ? 429 : error instanceof Error && error.name === "ZodError" ? 400 : 503 }); }
}
