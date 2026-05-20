import { NextResponse, type NextRequest } from "next/server";
import crypto from "node:crypto";
import { createSessionCookie, COOKIE_NAME, COOKIE_MAX_AGE } from "@/lib/auth";
import { clientConfig } from "@/lib/client.config";

export async function POST(req: NextRequest) {
  const { pin } = await req.json();
  const validPin = clientConfig.loginPin;

  const pBuf = Buffer.from(pin ?? "");
  const vpBuf = Buffer.from(validPin);
  const match = pBuf.length === vpBuf.length && crypto.timingSafeEqual(pBuf, vpBuf);

  if (!match) {
    return NextResponse.json({ error: "PIN incorrecto" }, { status: 401 });
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
