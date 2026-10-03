import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { assertOrigin } from "@/server/http";
export async function DELETE(request: Request) {
  try { assertOrigin(request); const store = await cookies(); for (const key of ["analytics_visitor", "analytics_session", "analytics_consent"]) store.delete(key); return NextResponse.json({ success: true }); }
  catch { return NextResponse.json({ error: "Consent change rejected." }, { status: 403 }); }
}
