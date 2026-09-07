import crypto from "node:crypto";
import type { NextRequest } from "next/server";

export const COOKIE_NAME = "session";
export const COOKIE_MAX_AGE = 60 * 60 * 24 * 30; // 30 días

function getSecret() {
  const s = process.env.AUTH_SECRET;
  if (!s) throw new Error("AUTH_SECRET no configurado");
  return s;
}

export function createSessionCookie(): string {
  const payload = `auth:${Date.now()}`;
  const hmac = crypto
    .createHmac("sha256", getSecret())
    .update(payload)
    .digest("hex");
  return `${payload}.${hmac}`;
}

export function verifySessionCookie(value: string): boolean {
  try {
    const lastDot = value.lastIndexOf(".");
    if (lastDot === -1) return false;
    const payload = value.slice(0, lastDot);
    const provided = value.slice(lastDot + 1);
    const expected = crypto
      .createHmac("sha256", getSecret())
      .update(payload)
      .digest("hex");
    if (provided.length !== expected.length) return false;
    return crypto.timingSafeEqual(
      Buffer.from(provided, "hex"),
      Buffer.from(expected, "hex")
    );
  } catch {
    return false;
  }
}

/**
 * ¿Hay una sesión de staff válida en este request? Los endpoints públicos
 * (/api/publico/*, el puente de compatibilidad de la landing vieja) siguen
 * siendo alcanzables sin sesión, pero si alguien los usa logueado (staff
 * probando la landing, por ejemplo) hay que tratarlo como carga manual, no
 * como reserva de un desconocido — mismo criterio que `usuario` en
 * 034_pastalovers/04_dashboard_900/src/app/api/reservas/route.ts.
 */
export function hasValidSession(req: NextRequest): boolean {
  const cookie = req.cookies.get(COOKIE_NAME)?.value;
  return !!cookie && verifySessionCookie(cookie);
}
