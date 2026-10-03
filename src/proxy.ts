import { NextRequest, NextResponse } from "next/server";

export function proxy(request: NextRequest) {
  const hasSession = Boolean(request.cookies.get("session")?.value);
  const { pathname } = request.nextUrl;
  if (pathname.startsWith("/dashboard") && !hasSession) return NextResponse.redirect(new URL("/login", request.url));
  if ((pathname === "/login" || pathname === "/register") && hasSession) return NextResponse.redirect(new URL("/dashboard", request.url));
  // Always overwrite inbound values: locale is derived from the URL, not the client.
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-lunabiner-locale", pathname === "/en" || pathname.startsWith("/en/") ? "en" : "id");
  return NextResponse.next({ request: { headers: requestHeaders } });
}

export const config = { matcher: ["/((?!api(?:/|$)|_next/|images/|fonts/|favicon.ico|sitemap.xml|robots.txt).*)"] };
