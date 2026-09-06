import { NextResponse } from "next/server";
import { getCajaDia, getCajaRango, createMovimientoCaja, hoyEnArgentina } from "@/lib/db";

export const dynamic = "force-dynamic";

/**
 * Con `fecha`: la caja de ese día. Autocarga los ingresos de las citas
 * atendidas que todavía no pasaron por caja (es idempotente).
 *
 * Con `desde`/`hasta`: el resumen del rango, que NO autocarga. Hacerlo en loop
 * escribiría un mes de movimientos por el solo hecho de abrir la pantalla; en
 * su lugar el resumen devuelve `sin_cargar` con los días que faltan cerrar.
 */
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const esFecha = (v: string | null) => (v && /^\d{4}-\d{2}-\d{2}$/.test(v) ? v : null);

  const desde = esFecha(searchParams.get("desde"));
  const hasta = esFecha(searchParams.get("hasta"));
  if (desde && hasta) {
    if (desde > hasta) {
      return NextResponse.json({ error: "`desde` no puede ser posterior a `hasta`." }, { status: 400 });
    }
    return NextResponse.json(getCajaRango(desde, hasta));
  }

  const fecha = searchParams.get("fecha") ?? hoyEnArgentina();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(fecha)) {
    return NextResponse.json({ error: "`fecha` debe ser YYYY-MM-DD." }, { status: 400 });
  }
  return NextResponse.json(getCajaDia(fecha));
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  if (!body?.concepto?.trim()) {
    return NextResponse.json({ error: "El concepto no puede estar vacío." }, { status: 400 });
  }
  if (body.tipo !== "ingreso" && body.tipo !== "egreso") {
    return NextResponse.json({ error: "`tipo` debe ser ingreso o egreso." }, { status: 400 });
  }
  const monto = Number(body.monto);
  if (!Number.isFinite(monto) || monto <= 0) {
    return NextResponse.json({ error: "El monto tiene que ser mayor a cero." }, { status: 400 });
  }

  const id = createMovimientoCaja({
    fecha: body.fecha ?? hoyEnArgentina(),
    tipo: body.tipo,
    concepto: body.concepto.trim(),
    monto,
  });
  return NextResponse.json({ ok: true, id });
}
