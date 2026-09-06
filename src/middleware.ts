export const runtime = "nodejs";

import { NextResponse, type NextRequest } from "next/server";
import { verifySessionCookie } from "@/lib/auth";

// Todo lo nuevo que consume la landing cuelga de /api/publico. Al ser un solo
// prefijo, sumar un endpoint público no obliga a acordarse de tocar esta
// lista: alcanza con crearlo ahí adentro. Los CORS de next.config.ts usan el
// mismo prefijo.
//
// Las cuatro rutas de abajo (appointments, appointments/available,
// availability/overview, settings/services) son el PUENTE DE COMPATIBILIDAD
// con la landing vieja (03_landing_014) — ver el comentario en cada route.ts.
// Sacar de acá cuando la landing se migre a /api/publico/*.
const PUBLIC_PATHS = [
  "/login",
  "/api/auth/login",
  "/api/webhook",
  "/api/publico",
  "/api/appointments",
  "/api/availability/overview",
  "/api/settings/services",
];

export function middleware(req: NextRequest) {
  if (req.method === "OPTIONS") {
    return NextResponse.next();
  }
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
