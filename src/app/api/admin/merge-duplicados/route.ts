import { NextRequest, NextResponse } from "next/server";
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
 *
 * `excluir`/`excluirGrupos` saca grupos puntuales por nombre EXACTO (ej.
 * casos donde varios turnos el mismo día, creados segundos aparte, sugieren
 * una reserva grupal en vez de un cliente repetido).
 */

/** Dry-run: mismos grupos que fusionaría el POST, sin tocar nada. */
export async function GET(req: NextRequest) {
  const excluir = req.nextUrl.searchParams.get("excluir");
  const excluirNombres = excluir ? excluir.split(",").map((n) => n.trim()).filter(Boolean) : [];

  const candidatos = detectarDuplicadosSinTelefono(excluirNombres);
  return NextResponse.json({
    excluidos: excluirNombres,
    gruposCandidatos: candidatos.length,
    clientesQueBajarian: candidatos.reduce((acc, c) => acc + c.otrosIds.length, 0),
    candidatos,
  });
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const excluirNombres: string[] = Array.isArray(body?.excluirGrupos) ? body.excluirGrupos : [];

  const resultado = mergeClientesDuplicadosSinTelefono(excluirNombres);
  return NextResponse.json({ excluidos: excluirNombres, ...resultado });
}
