import { NextResponse } from "next/server";
import { createAssistantLead } from "@/features/assistant/tools/create-lead";
import { getAssistantRuntimeConfig } from "@/features/assistant/config/runtime";
import { consentedVisitorId } from "@/features/analytics/service";
import { assertOrigin, rateLimit, readBody, RequestError, session, friendlyError } from "@/features/assistant/security";
export async function POST(request: Request) {
  try {
    assertOrigin(request); const owner = await session(); if (!owner) throw new RequestError(403);
    const config = await getAssistantRuntimeConfig(); if (!config.leadCaptureEnabled) throw new RequestError(403);
    await rateLimit(request, 5, owner);
    const lead = await createAssistantLead(await readBody(request), owner, await consentedVisitorId());
    return NextResponse.json({ id: lead.id, status: lead.status });
  } catch (error) { return NextResponse.json({ error: friendlyError() }, { status: error instanceof RequestError ? error.status : 400 }); }
}
