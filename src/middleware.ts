export const runtime = "nodejs";

import { NextResponse, type NextRequest } from "next/server";
import { verifySessionCookie } from "@/lib/auth";

const PUBLIC_PATHS = ["/login", "/api/auth/login", "/api/webhook"];

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  if (PUBLIC_PATHS.some((p) => pathname.startsWith(p))) {
    return NextResponse.next();
  }
  const session = req.cookies.get("session")?.value;
  if (!session || !verifySessionCookie(session)) {
    const loginUrl = new URL("/login", req.url);
    loginUrl.searchParams.set("from", pathname);
    return NextResponse.redirect(loginUrl);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
