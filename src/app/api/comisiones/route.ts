import { NextResponse } from "next/server";
import { getComisionesRango, listComisionesConfig, setComisionConfig, hoyEnArgentina } from "@/lib/db";

export const dynamic = "force-dynamic";

/**
 * `desde` y `hasta` en YYYY-MM-DD. El resumen solo cuenta citas 'atendida': una
 * confirmada todavía puede cancelarse, y pagar comisión por adelantado sería
 * regalar plata.
 *
 * Sin rango cae en el mes en curso, que es lo que devolvía antes de que la
 * pantalla pudiera pedir una semana.
 */
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const esFecha = (v: string | null) => (v && /^\d{4}-\d{2}-\d{2}$/.test(v) ? v : null);
  const hoy = hoyEnArgentina();
  const desde = esFecha(searchParams.get("desde")) ?? `${hoy.slice(0, 7)}-01`;
  const hasta = esFecha(searchParams.get("hasta")) ?? hoy;
  if (desde > hasta) {
    return NextResponse.json({ error: "`desde` no puede ser posterior a `hasta`." }, { status: 400 });
  }

  const resumen = getComisionesRango(desde, hasta);
  return NextResponse.json({
    desde,
    hasta,
    config: listComisionesConfig(),
    resumen,
    total_a_pagar: resumen.reduce((acc, r) => acc + (r.comision_a_pagar ?? 0), 0),
    total_facturado: resumen.reduce((acc, r) => acc + (r.facturacion_total ?? 0), 0),
  });
}

export async function PUT(req: Request) {
  const body = await req.json().catch(() => null);
  if (!body?.profesional_id || !body?.tipo || body?.valor === undefined) {
    return NextResponse.json(
      { error: "Faltan `profesional_id`, `tipo` y `valor`." },
      { status: 400 }
    );
  }
  if (body.tipo !== "porcentaje" && body.tipo !== "monto_fijo") {
    return NextResponse.json({ error: "`tipo` debe ser porcentaje o monto_fijo." }, { status: 400 });
  }

  const valor = Number(body.valor);
  if (!Number.isFinite(valor) || valor < 0) {
    return NextResponse.json({ error: "`valor` tiene que ser un número positivo." }, { status: 400 });
  }
  if (body.tipo === "porcentaje" && valor > 100) {
    return NextResponse.json({ error: "Un porcentaje no puede superar 100." }, { status: 400 });
  }

  setComisionConfig(Number(body.profesional_id), body.tipo, valor);
  return NextResponse.json({ ok: true });
}
