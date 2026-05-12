import crypto from "node:crypto";

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
