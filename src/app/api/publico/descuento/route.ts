import { NextResponse } from "next/server";
import { getServicioById, validarDescuento } from "@/lib/db";

export const dynamic = "force-dynamic";

/**
 * Previsualiza un código antes de confirmar, para que el visitante vea el
 * precio con descuento. NO consume un uso: eso pasa recién al reservar.
 */
export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  if (!body?.codigo || !body?.servicio_id || !body?.fecha) {
    return NextResponse.json({ error: "Faltan `codigo`, `servicio_id` y `fecha`." }, { status: 400 });
  }

  const servicio = getServicioById(Number(body.servicio_id));
  if (!servicio) return NextResponse.json({ error: "El servicio no existe." }, { status: 404 });

  const val = validarDescuento(body.codigo, servicio.precio, body.fecha);
  if (!val.ok) return NextResponse.json({ ok: false, error: val.error }, { status: 200 });

  return NextResponse.json({
    ok: true,
    codigo: val.descuento.codigo,
    precio_original: servicio.precio,
    precio_final: val.precioFinal,
    ahorro: val.ahorro,
  });
}
