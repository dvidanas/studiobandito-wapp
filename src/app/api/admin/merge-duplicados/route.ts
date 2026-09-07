import { NextResponse } from "next/server";
import { mergeClientesDuplicadosSinTelefono } from "@/lib/db";

export const dynamic = "force-dynamic";

/**
 * Uso único post-migración: fusiona clientes duplicados generados por la
 * migración de schema (Corte Inglés) — ver mergeClientesDuplicadosSinTelefono()
 * en src/lib/db.ts para el criterio exacto. Protegido solo por sesión (ya la
 * exige el middleware, esta ruta no está en PUBLIC_PATHS); no hace falta un
 * flag de entorno porque no reemplaza nada, consolida filas duplicadas con
 * la misma garantía que deleteCliente() (reasigna turnos antes de borrar).
 * Sacar este endpoint una vez usado.
 */
export async function POST() {
  const resultado = mergeClientesDuplicadosSinTelefono();
  return NextResponse.json(resultado);
}
