import { NextResponse } from "next/server";
import { cobrarCita } from "@/lib/db";

export const dynamic = "force-dynamic";

/** Marca la cita como atendida y la deja cargada como ingreso del día. */
export async function POST(req: Request) {
  const { cita_id } = await req.json().catch(() => ({ cita_id: null }));
  if (!cita_id) return NextResponse.json({ error: "Falta `cita_id`." }, { status: 400 });

  const res = cobrarCita(Number(cita_id));
  if (!res.ok) return NextResponse.json({ error: res.error }, { status: 404 });
  return NextResponse.json({ ok: true });
}
