import { NextResponse } from "next/server";
import { updateCitaEstado, getCitaById } from "@/lib/db";

export const dynamic = "force-dynamic";

/**
 * Cancela en lote los turnos que quedaron dentro de un cierre.
 *
 * Se llama SOLO desde el botón de la pantalla, con los ids elegidos a mano.
 * Cerrar un día nunca cancela nada por su cuenta: el cliente que ya reservó
 * merece que alguien decida y le avise, no que su turno desaparezca solo.
 *
 * Devuelve los datos necesarios para el aviso (nombre y teléfono), porque
 * después de cancelar la pantalla ya no los tiene a mano.
 */
export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const ids: unknown = body?.ids;
  if (!Array.isArray(ids) || ids.length === 0 || !ids.every((n) => Number.isInteger(n))) {
    return NextResponse.json({ error: "Falta la lista de turnos a cancelar." }, { status: 400 });
  }

  const cancelados: Array<{ id: number; cliente_nombre: string | null; cliente_telefono: string | null; fecha: string; hora_inicio: string }> = [];
  const noEncontrados: number[] = [];

  for (const id of ids as number[]) {
    const cita = getCitaById(id);
    if (!cita) { noEncontrados.push(id); continue; }
    updateCitaEstado(id, "cancelada");
    cancelados.push({
      id,
      cliente_nombre: cita.cliente_nombre ?? null,
      cliente_telefono: cita.cliente_telefono ?? null,
      fecha: cita.fecha,
      hora_inicio: cita.hora_inicio,
    });
  }

  return NextResponse.json({ ok: true, cancelados, no_encontrados: noEncontrados });
}
