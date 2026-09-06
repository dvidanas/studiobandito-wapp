import { NextResponse } from "next/server";
import { getMetrics } from "@/lib/db";

export const dynamic = "force-dynamic";

/**
 * `desde` y `hasta` en YYYY-MM-DD. Sin ellos, getMetrics cae en los últimos 30
 * días — el comportamiento que tenía esta ruta antes del selector de rango.
 */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const esFecha = (v: string | null) => (v && /^\d{4}-\d{2}-\d{2}$/.test(v) ? v : undefined);
  return NextResponse.json(
    getMetrics(esFecha(url.searchParams.get("desde")), esFecha(url.searchParams.get("hasta")))
  );
}
