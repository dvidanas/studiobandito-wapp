import { NextResponse, type NextRequest } from "next/server";
import { verifySignature } from "@/lib/ycloud/verify";
import { processWebhookPayload } from "@/lib/ycloud/handler";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  console.log("[webhook] SKIP_CHECK:", process.env.SKIP_SIGNATURE_CHECK);

  const raw = await req.text();

  if (process.env.SKIP_SIGNATURE_CHECK !== "true") {
    const sig =
      req.headers.get("x-ycloud-signature-256") ??
      req.headers.get("x-ycloud-signature");

    const secret =
      process.env.YCLOUD_WEBHOOK_SECRET ?? process.env.YCLOUD_API_KEY!;

    console.log("[webhook] header firma:", sig?.slice(0, 20) ?? "ausente");

    const ok = verifySignature(raw, sig, secret);
    if (!ok) {
      console.error("[webhook] firma inválida. Header recibido:", sig);
      return new NextResponse("invalid signature", { status: 401 });
    }
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
