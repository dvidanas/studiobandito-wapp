import { NextResponse } from "next/server";
import { getDetalleComision, hoyEnArgentina } from "@/lib/db";

export const dynamic = "force-dynamic";

/**
 * Las citas que componen la comisión de una persona en un rango.
 *
 * El total que devuelve se calcula igual que el del resumen, así que la suma
 * del detalle y la fila de la tabla son el mismo número. Si divergieran, el
 * barbero vería un monto y cobraría otro.
 */
export async function GET(
  req: Request,
  { params }: { params: Promise<{ profesionalId: string }> }
) {
  const { profesionalId } = await params;
  const id = Number(profesionalId);
  if (!Number.isInteger(id) || id <= 0) {
    return NextResponse.json({ error: "Profesional inválido." }, { status: 400 });
  }

  const { searchParams } = new URL(req.url);
  const esFecha = (v: string | null) => (v && /^\d{4}-\d{2}-\d{2}$/.test(v) ? v : null);
  const hoy = hoyEnArgentina();
  const desde = esFecha(searchParams.get("desde")) ?? `${hoy.slice(0, 7)}-01`;
  const hasta = esFecha(searchParams.get("hasta")) ?? hoy;
  if (desde > hasta) {
    return NextResponse.json({ error: "`desde` no puede ser posterior a `hasta`." }, { status: 400 });
  }

  return NextResponse.json({ desde, hasta, ...getDetalleComision(id, desde, hasta) });
}
