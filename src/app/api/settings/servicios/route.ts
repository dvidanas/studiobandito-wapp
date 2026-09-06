import { NextResponse } from "next/server";
import { listServicios, createServicio } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const incluirInactivos = searchParams.get("todos") === "1";
  return NextResponse.json(listServicios(incluirInactivos));
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  if (!body?.nombre?.trim()) {
    return NextResponse.json({ error: "El nombre es obligatorio." }, { status: 400 });
  }
  const duracion = Number(body.duracion_min);
  const precio = Number(body.precio);
  if (!Number.isFinite(duracion) || duracion <= 0) {
    return NextResponse.json({ error: "La duración tiene que ser mayor a cero." }, { status: 400 });
  }
  if (!Number.isFinite(precio) || precio < 0) {
    return NextResponse.json({ error: "El precio no puede ser negativo." }, { status: 400 });
  }

  const id = createServicio({
    nombre: body.nombre.trim(),
    descripcion: body.descripcion?.trim() || null,
    duracion_min: duracion,
    precio,
  });
  return NextResponse.json({ ok: true, id });
}
