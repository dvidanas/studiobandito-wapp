import { NextResponse } from "next/server";
import { getSlotsDisponibles, hoyEnArgentina } from "@/lib/db";

export const dynamic = "force-dynamic";

/**
 * Paso 4 del flujo: horarios libres de una fecha.
 *
 * La duración sale del servicio elegido, no del cliente: pedir un turno de 30
 * minutos para un color de 90 dejaría la agenda pisada.
 */
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const fecha = searchParams.get("fecha");
  if (!fecha || !/^\d{4}-\d{2}-\d{2}$/.test(fecha)) {
    return NextResponse.json({ error: "Falta el parámetro `fecha` (YYYY-MM-DD)." }, { status: 400 });
  }
  if (fecha < hoyEnArgentina()) {
    return NextResponse.json([]);
  }

  const num = (k: string) => (searchParams.get(k) ? Number(searchParams.get(k)) : undefined);

  const slots = getSlotsDisponibles(fecha, {
    servicioId: num("servicio_id"),
    profesionalId: num("profesional_id"),
    sucursalId: num("sucursal_id"),
  });

  return NextResponse.json(slots);
}
