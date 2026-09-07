import { NextResponse } from "next/server";
import { detectarDuplicadosSinTelefono, mergeClientesDuplicadosSinTelefono } from "@/lib/db";

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

/** Dry-run: mismos grupos que fusionaría el POST, sin tocar nada. */
export async function GET() {
  const candidatos = detectarDuplicadosSinTelefono();
  return NextResponse.json({
    gruposCandidatos: candidatos.length,
    clientesQueBajarian: candidatos.reduce((acc, c) => acc + c.otrosIds.length, 0),
    candidatos,
  });
}

export async function POST() {
  const resultado = mergeClientesDuplicadosSinTelefono();
  return NextResponse.json(resultado);
}
