import { NextResponse } from "next/server";
import { updateCitaEstado, cobrarCita } from "@/lib/db";
import { ESTADOS } from "@/components/panel/types";

export const dynamic = "force-dynamic";

/**
 * Cambia el estado de una cita.
 *
 * Pasar a 'atendida' es lo que dispara el ingreso en la caja del día, así que
 * ese caso va por `cobrarCita`, que además hace el autocargado. El resto de
 * los estados no tocan caja.
 *
 * Sigue aceptando los cuatro estados de la base, 'no_show' incluido: a nivel
 * producto es el motivo de una cancelación, no un estado aparte, pero se
 * guarda ahí. Ver `EstadoVisible` en components/panel/types.ts.
 */
export async function PUT(req: Request, { params }: { params: Promise<{ citaId: string }> }) {
  const { citaId } = await params;
  const { estado } = await req.json().catch(() => ({ estado: null }));

  if (!ESTADOS.includes(estado)) {
    return NextResponse.json(
      { error: `Estado inválido. Válidos: ${ESTADOS.join(", ")}.` },
      { status: 400 }
    );
  }

  if (estado === "atendida") {
    const res = cobrarCita(Number(citaId));
    if (!res.ok) return NextResponse.json({ error: res.error }, { status: 404 });
    return NextResponse.json({ ok: true, cargadaEnCaja: true });
  }

  updateCitaEstado(Number(citaId), estado);
  return NextResponse.json({ ok: true });
}
