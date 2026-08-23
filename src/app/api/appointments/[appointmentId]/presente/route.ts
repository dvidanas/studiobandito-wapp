import { NextRequest, NextResponse } from "next/server";
import { setAppointmentPresente } from "@/lib/db";

export const dynamic = "force-dynamic";

/**
 * Marca si el cliente ya llegó.
 * Sin body (o sin `presente`) alterna el valor; con `{"presente": true|false}`
 * lo fija explícitamente.
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ appointmentId: string }> }
) {
  const { appointmentId } = await params;
  const id = Number(appointmentId);
  if (isNaN(id)) return NextResponse.json({ error: "ID inválido" }, { status: 400 });

  let body: { presente?: unknown } = {};
  try {
    body = await req.json();
  } catch {
    // Sin body: se interpreta como alternar.
  }

  if (body.presente !== undefined && typeof body.presente !== "boolean") {
    return NextResponse.json({ error: "`presente` debe ser booleano" }, { status: 400 });
  }

  const resultado = setAppointmentPresente(id, body.presente as boolean | undefined);
  if (!resultado.ok) {
    return NextResponse.json({ error: resultado.error }, { status: 404 });
  }
  return NextResponse.json({ ok: true, presente: resultado.presente });
}
