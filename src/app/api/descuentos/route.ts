import { NextResponse } from "next/server";
import { listDescuentos, createDescuento } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json(listDescuentos());
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  if (!body?.codigo?.trim()) {
    return NextResponse.json({ error: "El código no puede estar vacío." }, { status: 400 });
  }
  if (body.tipo !== "porcentaje" && body.tipo !== "monto") {
    return NextResponse.json({ error: "`tipo` debe ser porcentaje o monto." }, { status: 400 });
  }
  const valor = Number(body.valor);
  if (!Number.isFinite(valor) || valor <= 0) {
    return NextResponse.json({ error: "El valor tiene que ser mayor a cero." }, { status: 400 });
  }
  if (body.tipo === "porcentaje" && valor > 100) {
    return NextResponse.json({ error: "Un porcentaje no puede superar 100." }, { status: 400 });
  }

  try {
    const id = createDescuento({
      codigo: body.codigo,
      tipo: body.tipo,
      valor,
      vigencia_desde: body.vigencia_desde || null,
      vigencia_hasta: body.vigencia_hasta || null,
      usos_max: body.usos_max ? Number(body.usos_max) : null,
    });
    return NextResponse.json({ ok: true, id });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    // El código es UNIQUE: dos promos con el mismo código serían ambiguas.
    if (msg.includes("UNIQUE")) {
      return NextResponse.json({ error: "Ya existe un código con ese nombre." }, { status: 409 });
    }
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
