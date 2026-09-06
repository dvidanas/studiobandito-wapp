import { NextResponse } from "next/server";
import { removeDiaCerrado } from "@/lib/db";

export const dynamic = "force-dynamic";

/**
 * Se borra por id y no por fecha: desde que un cierre puede ser un rango o
 * media jornada, la fecha ya no identifica una fila sola.
 */
export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const n = Number(id);
  if (!Number.isInteger(n)) {
    return NextResponse.json({ error: "Id inválido." }, { status: 400 });
  }
  removeDiaCerrado(n);
  return NextResponse.json({ ok: true });
}
