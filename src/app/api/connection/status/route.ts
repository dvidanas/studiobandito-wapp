import { NextResponse } from "next/server";
import { getBaileysStatus } from "@/lib/baileys/client";
import QRCode from "qrcode";

export const dynamic = "force-dynamic";

export async function GET() {
  const required = ["GEMINI_API_KEY"];
  const missing = required.filter((k) => !process.env[k]);

  if (missing.length > 0) {
    return NextResponse.json(
      { status: "missing_config", missing },
      { headers: { "Cache-Control": "no-store" } }
    );
  }

  const { status, qr, phone } = getBaileysStatus();

  if (status === "open") {
    console.log(`[status] conectado → +${phone}`);
    return NextResponse.json(
      { status: "connected", phone },
      { headers: { "Cache-Control": "no-store" } }
    );
  }

  if (status === "qr_pending") {
    let qrDataUrl: string | null = null;
    if (qr) {
      try {
        qrDataUrl = await QRCode.toDataURL(qr, { width: 300, margin: 2 });
      } catch {}
    }
    return NextResponse.json(
      { status: "qr_pending", qr: qrDataUrl ?? qr },
      { headers: { "Cache-Control": "no-store" } }
    );
  }

  return NextResponse.json(
    { status },
    { headers: { "Cache-Control": "no-store" } }
  );
}
