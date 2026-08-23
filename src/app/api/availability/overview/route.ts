import { NextRequest, NextResponse } from "next/server";
import {
  getAvailabilityOverview,
  getBusinessHours,
  lastSlotStart,
  shortestServiceDuration,
} from "@/lib/db";
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

  // Cada día lleva `last_start`: el último horario en el que se puede EMPEZAR un
  // turno, no el cierre de la ventana. Se calcula con el servicio activo más
  // corto (el caso más favorable) y con la misma regla que usa el calendario, así
  // que se recalcula solo si cambian los horarios o la duración de los servicios.
  const referenceDuration = shortestServiceDuration() ?? duration;
  const hours = getBusinessHours().hours;
  const weekly = Object.fromEntries(
    Object.entries(hours).map(([day, slot]) => [
      day,
      slot
        ? { ...slot, last_start: lastSlotStart(slot.open, slot.close, referenceDuration) }
        : null,
    ])
  );

  return NextResponse.json({
    from,
    to,
    duration,
    reference_duration: referenceDuration,
    weekly,
    days: getAvailabilityOverview(from, to, duration),
  });
}
