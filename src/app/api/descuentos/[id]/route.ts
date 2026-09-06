import { NextResponse } from "next/server";
import { updateDescuento, deleteDescuento } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Body inválido." }, { status: 400 });

  try {
    updateDescuento(Number(id), {
      ...(body.codigo !== undefined && { codigo: body.codigo }),
      ...(body.tipo !== undefined && { tipo: body.tipo }),
      ...(body.valor !== undefined && { valor: Number(body.valor) }),
      ...(body.vigencia_desde !== undefined && { vigencia_desde: body.vigencia_desde || null }),
      ...(body.vigencia_hasta !== undefined && { vigencia_hasta: body.vigencia_hasta || null }),
      ...(body.usos_max !== undefined && { usos_max: body.usos_max ? Number(body.usos_max) : null }),
      ...(body.activo !== undefined && { activo: Number(body.activo) }),
    });
    return NextResponse.json({ ok: true });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    if (msg.includes("UNIQUE")) {
      return NextResponse.json({ error: "Ya existe un código con ese nombre." }, { status: 409 });
    }
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const res = deleteDescuento(Number(id));
  // Si ya se usó en citas se desactiva en vez de borrarse: borrarlo dejaría
  // esas citas apuntando a un descuento inexistente.
  return NextResponse.json({ ok: true, aviso: res.error ?? null });
}
