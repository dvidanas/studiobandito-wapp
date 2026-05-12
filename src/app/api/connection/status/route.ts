import { NextResponse } from "next/server";
import { getPhoneNumberInfo } from "@/lib/ycloud/client";

export const dynamic = "force-dynamic";

export async function GET() {
  console.log("[status] verificando conexión...");

  const required = ["YCLOUD_API_KEY", "YCLOUD_PHONE_NUMBER", "GEMINI_API_KEY"];
  const missing = required.filter((k) => !process.env[k]);

  if (missing.length > 0) {
    console.log("[status] faltan variables de entorno:", missing);
    return NextResponse.json(
      { status: "missing_config", missing },
      { headers: { "Cache-Control": "no-store" } }
    );
  }

  try {
    const info = await getPhoneNumberInfo();
    console.log("[status] conectado →", info.display_phone_number, "quality:", info.status);
    return NextResponse.json(
      {
        status: "connected",
        phone: info.display_phone_number,
        quality: info.status,
      },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[status] error al verificar conexión con YCloud:");
    console.error("[status]", message);
    return NextResponse.json(
      { status: "error", message },
      { headers: { "Cache-Control": "no-store" } }
    );
  }
}
