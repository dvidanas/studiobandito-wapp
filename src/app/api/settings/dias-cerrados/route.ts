import { NextResponse } from "next/server";
import { listDiasCerrados, addDiaCerrado, citasEnCierre } from "@/lib/db";

export const dynamic = "force-dynamic";

/**
 * Un día cerrado es un bloqueo con `profesional_id = NULL`: aplica a todo el
 * negocio, no a una persona. Los bloqueos individuales (vacaciones) se cargan
 * desde la ficha de cada profesional.
 *
 * Soporta rango (`desde`/`hasta`) y media jornada (`hora_desde`/`hora_hasta`).
 */
export async function GET() {
  return NextResponse.json(listDiasCerrados());
}

export async function POST(req: Request) {
  const b = await req.json().catch(() => null);
  const esFecha = (v: unknown) => typeof v === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v);

  if (!b || !esFecha(b.desde ?? b.fecha)) {
    return NextResponse.json({ error: "Fecha inválida (YYYY-MM-DD)." }, { status: 400 });
  }
  const desde: string = b.desde ?? b.fecha;
  if (b.hasta && !esFecha(b.hasta)) {
    return NextResponse.json({ error: "Fecha final inválida (YYYY-MM-DD)." }, { status: 400 });
  }

  const res = addDiaCerrado(
    desde,
    b.hasta,
    typeof b.motivo === "string" && b.motivo.trim() ? b.motivo.trim() : "Cerrado",
    b.hora_desde ?? null,
    b.hora_hasta ?? null
  );
  if (!res.ok) return NextResponse.json({ error: res.error }, { status: 400 });

  // Se devuelven los turnos que quedaron dentro del cierre. NO se cancelan:
  // el bloqueo solo frena reservas nuevas, y qué hacer con los que ya estaban
  // lo decide una persona desde la pantalla.
  const afectados = citasEnCierre(desde, b.hasta, b.hora_desde ?? null, b.hora_hasta ?? null);
  return NextResponse.json({ ok: true, id: res.id, afectados });
}
