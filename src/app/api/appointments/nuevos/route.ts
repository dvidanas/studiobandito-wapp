import { NextRequest, NextResponse } from "next/server";
import { listAppointmentsNuevos } from "@/lib/db";

export const dynamic = "force-dynamic";

/**
 * Turnos creados después de `desde`, para el aviso de turno nuevo del panel.
 *
 * `desde` es un timestamp UNIX en **segundos** (entero), porque en esta base
 * `appointments.created_at` es INTEGER (unixepoch()). El proyecto del que se
 * portó este patrón usa un texto "YYYY-MM-DD HH:MM:SS" — acá no aplica.
 *
 * Sin gate de roles: Bandito tiene un único login por PIN y el middleware ya
 * exige sesión para todo lo que no sea público.
 */
export async function GET(req: NextRequest) {
  const desdeRaw = req.nextUrl.searchParams.get("desde");
  const desde = Number(desdeRaw);

  // Ojo con la cadena vacía: Number("") es 0, así que sin este chequeo
  // `?desde=` pasaría la validación y devolvería el histórico completo.
  if (desdeRaw === null || desdeRaw.trim() === "" || !Number.isInteger(desde) || desde <= 0) {
    return NextResponse.json(
      { error: "Falta o es inválido el parámetro 'desde' (timestamp UNIX en segundos)" },
      { status: 400 }
    );
  }

  return NextResponse.json({ appointments: listAppointmentsNuevos(desde) });
}
