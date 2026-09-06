import { NextResponse } from "next/server";
import { listProfesionales, listProfesionalesPorServicio, listSucursales } from "@/lib/db";

export const dynamic = "force-dynamic";

/**
 * Paso 2 del flujo de reserva. Con `servicio_id` devuelve SOLO los
 * profesionales que hacen ese servicio (vía profesional_servicios); sin él,
 * todos los activos.
 */
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const servicioId = searchParams.get("servicio_id");

  const profesionales = servicioId
    ? listProfesionalesPorServicio(Number(servicioId))
    : listProfesionales();

  const sucursales = new Map(listSucursales(true).map((s) => [s.id, s.nombre]));

  return NextResponse.json(
    profesionales.map((p) => ({
      id: p.id,
      nombre: p.nombre,
      foto_url: p.foto_url,
      sucursal_id: p.sucursal_id,
      sucursal_nombre: p.sucursal_id ? sucursales.get(p.sucursal_id) ?? null : null,
    }))
  );
}
