import { NextResponse } from "next/server";
import { getNegocio, listServicios, listSucursales, listPromotions, getBusinessHours } from "@/lib/db";

export const dynamic = "force-dynamic";

/**
 * Todo lo que la landing necesita para armarse, en una sola llamada: datos del
 * negocio, servicios activos, sucursales y promos. La landing NO hardcodea
 * nada de esto — si el CRM no responde, no muestra el dato en lugar de
 * inventarlo.
 */
export async function GET() {
  const negocio = getNegocio();
  return NextResponse.json({
    // La envolvente de `disponibilidad`: a que hora hay efectivamente alguien
    // atendiendo cada dia de la semana. NO es `horario_negocio`, que es el
    // techo de hasta donde se PUEDE cargar agenda y a proposito no se le
    // muestra a ningun cliente. Es la misma fuente que usa el prompt del bot,
    // asi que la landing y WhatsApp contestan lo mismo.
    horarios: getBusinessHours().hours,
    negocio: negocio
      ? {
          nombre: negocio.nombre,
          rubro: negocio.rubro,
          whatsapp: negocio.whatsapp,
          direccion: negocio.direccion,
          logo_url: negocio.logo_url,
        }
      : null,
    servicios: listServicios().map((s) => ({
      id: s.id,
      nombre: s.nombre,
      descripcion: s.descripcion,
      duracion_min: s.duracion_min,
      precio: s.precio,
    })),
    sucursales: listSucursales().map((s) => ({
      id: s.id,
      nombre: s.nombre,
      direccion: s.direccion,
    })),
    promociones: listPromotions().map((p) => ({
      id: p.id,
      titulo: p.title,
      descripcion: p.description,
      descuento: p.discount,
    })),
  });
}
