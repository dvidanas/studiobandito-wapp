import { NextResponse } from "next/server";
import { getResumenDisponibilidad, duracionServicioMasCorto } from "@/lib/db";

export const dynamic = "force-dynamic";

/**
 * Turnos libres por fecha en un rango. La landing lo usa para deshabilitar en
 * el calendario los días sin disponibilidad ANTES de que el visitante los
 * clickee: mejor un instante sin poder elegir que ofrecer un turno que no
 * existe.
 */
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const desde = searchParams.get("desde");
  const hasta = searchParams.get("hasta");
  const fmt = /^\d{4}-\d{2}-\d{2}$/;
  if (!desde || !hasta || !fmt.test(desde) || !fmt.test(hasta)) {
    return NextResponse.json({ error: "Faltan `desde` y `hasta` (YYYY-MM-DD)." }, { status: 400 });
  }

  const num = (k: string) => (searchParams.get(k) ? Number(searchParams.get(k)) : undefined);
  const servicioId = num("servicio_id");

  const dias = getResumenDisponibilidad(desde, hasta, {
    servicioId,
    profesionalId: num("profesional_id"),
    sucursalId: num("sucursal_id"),
    duracionMin: servicioId ? undefined : duracionServicioMasCorto() ?? 30,
  });

  return NextResponse.json({ dias });
}
