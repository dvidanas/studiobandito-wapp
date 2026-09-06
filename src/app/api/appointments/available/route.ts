import { NextRequest, NextResponse } from "next/server";
import { getSlotsDisponibles, hoyEnArgentina } from "@/lib/db";

export const dynamic = "force-dynamic";

/**
 * PUENTE DE COMPATIBILIDAD — ver el comentario en /api/settings/services.
 * La landing filtra por duración, no por servicio_id (no lo conoce), así que
 * no puede pedir "profesionales que hacen este servicio". Hoy no hace falta:
 * Sol es la única profesional activa y hace todos los servicios activos (ver
 * el backfill de profesional_servicios documentado en la migración).
 */
export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const date = searchParams.get("date") ?? new Date().toISOString().slice(0, 10);
  const duration = Number(searchParams.get("duration") ?? 30);

  if (date < hoyEnArgentina()) {
    return NextResponse.json({ date, duration, slots: [] });
  }

  const slots = getSlotsDisponibles(date, { duracionMin: duration }).map((s) => ({
    resource_id: s.profesional_id,
    resource_name: s.profesional_nombre,
    time_start: s.hora_inicio,
    time_end: s.hora_fin,
  }));

  return NextResponse.json({ date, duration, slots });
}
