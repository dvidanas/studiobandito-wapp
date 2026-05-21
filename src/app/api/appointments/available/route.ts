import { NextRequest, NextResponse } from "next/server";
import { getAvailableSlots } from "@/lib/db";
import { clientConfig } from "@/lib/client.config";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const date = searchParams.get("date") ?? new Date().toISOString().slice(0, 10);
  const apptConfig = (clientConfig as Record<string, unknown>).appointments as
    | { defaultDuration: number }
    | undefined;
  const duration = Number(searchParams.get("duration") ?? apptConfig?.defaultDuration ?? 30);
  const excludeIdStr = searchParams.get("excludeAppointmentId");
  const excludeId = excludeIdStr ? Number(excludeIdStr) : undefined;

  const slots = getAvailableSlots(date, duration, excludeId && !isNaN(excludeId) ? excludeId : undefined);
  return NextResponse.json({ date, duration, slots });
}
