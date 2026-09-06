import { NextResponse } from "next/server";
import { getHorarioNegocio, setHorarioNegocio, conflictosConTecho } from "@/lib/db";

export const dynamic = "force-dynamic";

/**
 * El techo horario del negocio: hasta dónde se puede cargar disponibilidad.
 *
 * No confundir con GET /api/settings/business, que devuelve `hours`: eso es la
 * envolvente de lo que la gente realmente trabaja y es lo que se le muestra al
 * cliente. Esto es el límite editable, y solo se usa para validar.
 */
export async function GET() {
  return NextResponse.json({ horario: getHorarioNegocio() });
}

/**
 * PUT con `{ horario, recortar? }`.
 *
 * Sin `recortar`, si hay disponibilidad que quedaría fuera devuelve 409 con la
 * lista. Recortar la agenda de alguien es una decisión de una persona, no un
 * efecto lateral de guardar.
 */
export async function PUT(req: Request) {
  const body = await req.json().catch(() => null);
  if (!body || typeof body.horario !== "object" || body.horario === null) {
    return NextResponse.json({ error: "Falta el horario." }, { status: 400 });
  }

  const res = setHorarioNegocio(body.horario, { recortar: body.recortar === true });
  if (!res.ok) {
    return NextResponse.json(
      res.status === 409
        ? { error: res.error, conflictos: res.conflictos }
        : { error: res.error, dias: res.dias },
      { status: res.status }
    );
  }
  return NextResponse.json({ ok: true });
}

/**
 * Simulación: qué quedaría afuera con un techo dado, sin guardarlo. La pantalla
 * lo usa para avisar antes de que el usuario apriete guardar.
 */
export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  if (!body || typeof body.horario !== "object" || body.horario === null) {
    return NextResponse.json({ error: "Falta el horario." }, { status: 400 });
  }
  return NextResponse.json({ conflictos: conflictosConTecho(body.horario) });
}
