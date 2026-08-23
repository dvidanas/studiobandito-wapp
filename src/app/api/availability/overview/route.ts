import { NextRequest, NextResponse } from "next/server";
import { getAvailabilityOverview, getBusinessHours } from "@/lib/db";
import { clientConfig } from "@/lib/client.config";

export const dynamic = "force-dynamic";

const MAX_DAYS = 62;

/**
 * Endpoint público que consume la landing.
 * - `weekly`: horario semanal del negocio, para el pie de página.
 * - `days`:   turnos libres por fecha, para deshabilitar días en el calendario.
 * Ambos salen de availability_slots, la misma fuente que da los turnos, así que
 * la landing no puede volver a desincronizarse del panel. Ver CLAUDE.md.
 */
export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const apptConfig = (clientConfig as Record<string, unknown>).appointments as
    | { defaultDuration: number }
    | undefined;
  const duration = Number(searchParams.get("duration") ?? apptConfig?.defaultDuration ?? 30);

  const today = new Date().toISOString().slice(0, 10);
  const from = searchParams.get("from") ?? today;
  const to = searchParams.get("to") ?? from;

  if (!/^\d{4}-\d{2}-\d{2}$/.test(from) || !/^\d{4}-\d{2}-\d{2}$/.test(to)) {
    return NextResponse.json({ error: "from/to deben tener formato YYYY-MM-DD" }, { status: 400 });
  }
  if (!Number.isFinite(duration) || duration <= 0) {
    return NextResponse.json({ error: "duration inválida" }, { status: 400 });
  }

  const spanDays = (Date.parse(to + "T12:00:00Z") - Date.parse(from + "T12:00:00Z")) / 86_400_000;
  if (spanDays < 0) {
    return NextResponse.json({ error: "to debe ser posterior o igual a from" }, { status: 400 });
  }
  if (spanDays > MAX_DAYS) {
    return NextResponse.json({ error: `El rango no puede superar ${MAX_DAYS} días` }, { status: 400 });
  }

  return NextResponse.json({
    from,
    to,
    duration,
    weekly: getBusinessHours().hours,
    days: getAvailabilityOverview(from, to, duration),
  });
}
