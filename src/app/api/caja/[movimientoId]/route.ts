import { NextResponse } from "next/server";
import { deleteMovimientoCaja } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ movimientoId: string }> }
) {
  const { movimientoId } = await params;
  const res = deleteMovimientoCaja(Number(movimientoId));
  // Un movimiento con origen 'cita' no se borra suelto: volvería a aparecer en
  // el próximo autocargado. Hay que cambiar el estado de la cita.
  if (!res.ok) return NextResponse.json({ error: res.error }, { status: 409 });
  return NextResponse.json({ ok: true });
}
