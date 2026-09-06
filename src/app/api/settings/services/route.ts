import { NextResponse } from "next/server";
import { listServicios } from "@/lib/db";

export const dynamic = "force-dynamic";

/**
 * PUENTE DE COMPATIBILIDAD — la landing pública (03_landing_014) todavía
 * llama a esta ruta vieja de Bandito, no a /api/publico/catalogo. Traduce el
 * catálogo real (servicios) al shape que la landing ya sabe leer, para no
 * tener que tocarla en este corte. Sacar cuando se adapte la landing a los
 * endpoints nativos de Corte — ver CLAUDE.md.
 */
export async function GET() {
  const servicios = listServicios();
  return NextResponse.json(
    servicios.map((s) => ({
      id: s.id,
      name: s.nombre,
      description: s.descripcion,
      price: s.precio,
      duration_minutes: s.duracion_min,
      active: s.activo,
    }))
  );
}
