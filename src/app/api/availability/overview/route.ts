import { NextRequest, NextResponse } from "next/server";
import { getBusinessHours, getResumenDisponibilidad, duracionServicioMasCorto } from "@/lib/db";

export const dynamic = "force-dynamic";

const MAX_DAYS = 62;

// getBusinessHours() de Corte usa claves en español (ver DIAS en db.ts); la
// landing vieja espera claves en inglés. Es la única traducción real de este
// puente, todo lo demás es solo re-empaquetar.
const DIA_KEY_A_INGLES: Record<string, string> = {
  domingo: "sunday",
  lunes: "monday",
  martes: "tuesday",
  miercoles: "wednesday",
  jueves: "thursday",
  viernes: "friday",
  sabado: "saturday",
};

function timeToMinutes(t: string): number {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
}
function minutesToTime(mins: number): string {
  const h = Math.floor(mins / 60).toString().padStart(2, "0");
  const m = (mins % 60).toString().padStart(2, "0");
  return `${h}:${m}`;
}
/** Copiado tal cual del db.ts viejo de Bandito — Corte no tiene equivalente. */
function lastSlotStart(open: string, close: string, durationMinutes: number): string | null {
  const start = timeToMinutes(open);
  const end = timeToMinutes(close);
  if (!Number.isFinite(durationMinutes) || durationMinutes <= 0) return null;
  if (start + durationMinutes > end) return null;
  const steps = Math.floor((end - start - durationMinutes) / durationMinutes);
  return minutesToTime(start + steps * durationMinutes);
}

/**
 * PUENTE DE COMPATIBILIDAD — ver el comentario en /api/settings/services.
 * Traduce getBusinessHours() + getResumenDisponibilidad() (schema de Corte)
 * al shape en inglés con last_start que la landing vieja ya sabe leer.
 */
export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const duration = Number(searchParams.get("duration") ?? 30);
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

  const referenceDuration = duracionServicioMasCorto() ?? duration;
  const horasEs = getBusinessHours().hours;
  const weekly: Record<string, { open: string; close: string; last_start: string | null } | null> = {};
  for (const [diaEs, slot] of Object.entries(horasEs)) {
    const key = DIA_KEY_A_INGLES[diaEs];
    if (!key) continue;
    weekly[key] = slot
      ? { open: slot.open, close: slot.close, last_start: lastSlotStart(slot.open, slot.close, referenceDuration) }
      : null;
  }

  return NextResponse.json({
    from,
    to,
    duration,
    reference_duration: referenceDuration,
    weekly,
    days: getResumenDisponibilidad(from, to, { duracionMin: referenceDuration }),
  });
}
