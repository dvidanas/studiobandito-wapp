import { NextResponse } from "next/server";
import { citasEnCierre } from "@/lib/db";

export const dynamic = "force-dynamic";

/**
 * Turnos confirmados que caerían dentro de un cierre, ANTES de crearlo.
 *
 * La pantalla lo consulta mientras el usuario elige las fechas, para poder
 * avisar antes de apretar el botón en vez de después.
 */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const desde = url.searchParams.get("desde");
  if (!desde || !/^\d{4}-\d{2}-\d{2}$/.test(desde)) {
    return NextResponse.json({ error: "Falta 'desde' (YYYY-MM-DD)." }, { status: 400 });
  }
  return NextResponse.json({
    afectados: citasEnCierre(
      desde,
      url.searchParams.get("hasta") ?? undefined,
      url.searchParams.get("hora_desde"),
      url.searchParams.get("hora_hasta")
    ),
  });
}
