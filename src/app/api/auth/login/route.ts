import { NextResponse, type NextRequest } from "next/server";
import crypto from "node:crypto";
import { createSessionCookie, COOKIE_NAME, COOKIE_MAX_AGE } from "@/lib/auth";

export async function POST(req: NextRequest) {
  const { username, password } = await req.json();
  const validUser = process.env.DASHBOARD_USER ?? "";
  const validPass = process.env.DASHBOARD_PASSWORD ?? "";

  if (!validUser || !validPass) {
    return NextResponse.json(
      { error: "DASHBOARD_USER o DASHBOARD_PASSWORD no configurados" },
      { status: 500 }
    );
  }

  const uBuf = Buffer.from(username ?? "");
  const pBuf = Buffer.from(password ?? "");
  const vuBuf = Buffer.from(validUser);
  const vpBuf = Buffer.from(validPass);

  const uMatch =
    uBuf.length === vuBuf.length && crypto.timingSafeEqual(uBuf, vuBuf);
  const pMatch =
    pBuf.length === vpBuf.length && crypto.timingSafeEqual(pBuf, vpBuf);

  if (!uMatch || !pMatch) {
    return NextResponse.json(
      { error: "Credenciales incorrectas" },
      { status: 401 }
    );
  }

  const res = NextResponse.json({ ok: true });
  res.cookies.set(COOKIE_NAME, createSessionCookie(), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: COOKIE_MAX_AGE,
    path: "/",
  });
  return res;
}
