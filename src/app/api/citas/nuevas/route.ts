import { NextResponse } from "next/server";
import { listCitasNuevas } from "@/lib/db";

export const dynamic = "force-dynamic";

/** Citas creadas después de `desde` (epoch en segundos). Alimenta el aviso del panel. */
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const desde = Number(searchParams.get("desde") ?? 0);
  if (!Number.isFinite(desde)) {
    return NextResponse.json({ error: "`desde` inválido." }, { status: 400 });
  }
  return NextResponse.json(listCitasNuevas(desde));
}
