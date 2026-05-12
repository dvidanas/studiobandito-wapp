import { NextResponse, type NextRequest } from "next/server";
import { verifySignature } from "@/lib/ycloud/verify";
import { processWebhookPayload } from "@/lib/ycloud/handler";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const raw = await req.text();
  const sig = req.headers.get("x-ycloud-signature-256");
  const skip =
    process.env.SKIP_SIGNATURE_CHECK === "true" &&
    process.env.NODE_ENV !== "production";

  if (!skip) {
    const ok = verifySignature(raw, sig, process.env.YCLOUD_API_KEY!);
    if (!ok) return new NextResponse("invalid signature", { status: 401 });
  }

  let payload: unknown;
  try {
    payload = JSON.parse(raw);
  } catch {
    return new NextResponse("bad json", { status: 400 });
  }

  void processWebhookPayload(payload).catch((err) =>
    console.error("[webhook] error:", err)
  );

  return NextResponse.json({ ok: true });
}
