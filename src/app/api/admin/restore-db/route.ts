import { NextRequest, NextResponse } from "next/server";
import Database from "better-sqlite3";
import fs from "node:fs";
import path from "node:path";

export const dynamic = "force-dynamic";

const DB_PATH = process.env.DB_PATH || path.join(process.cwd(), "data", "messages.db");

/**
 * Bootstrap de UNA sola vez para sembrar el volumen persistente de un
 * deploy nuevo, sin acceso SSH/filesystem al servidor — mismo problema que
 * resolvió /api/backup (bajar la base real) pero al revés (subir una base
 * ya migrada a un volumen vacío).
 *
 * Protegido por dos capas, no solo la sesión que ya exige el middleware:
 *   1. ALLOW_DB_RESTORE=true tiene que estar seteado en el entorno. Sin esa
 *      variable, este endpoint no hace nada aunque alguien adivine la URL
 *      y tenga sesión válida — es deliberado que quede inerte por defecto
 *      una vez terminada la migración, no una puerta trasera permanente.
 *   2. Si el archivo actual en DB_PATH ya tiene citas cargadas, se rechaza
 *      salvo ?force=true. Pensado para correr una única vez contra un
 *      volumen recién creado (vacío), no para pisar actividad real que
 *      alguien haya cargado después en el panel de prueba.
 *
 * IMPORTANTE — usar solo inmediatamente después de un deploy/restart, antes
 * de que cualquier otro request abra la conexión compartida a la base: este
 * endpoint escribe el archivo en disco, pero no fuerza a que el proceso ya
 * corriendo suelte una conexión que tuviera cacheada. Después de usarlo,
 * reiniciar el servicio una vez más en EasyPanel para que arranque limpio
 * contra el archivo nuevo.
 */
export async function POST(req: NextRequest) {
  if (process.env.ALLOW_DB_RESTORE !== "true") {
    return NextResponse.json(
      { error: "Deshabilitado. Falta ALLOW_DB_RESTORE=true en el entorno." },
      { status: 403 }
    );
  }

  const force = req.nextUrl.searchParams.get("force") === "true";

  if (fs.existsSync(DB_PATH)) {
    try {
      const actual = new Database(DB_PATH, { readonly: true });
      const hayTablaCitas = actual
        .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='citas'")
        .get();
      const n = hayTablaCitas
        ? (actual.prepare("SELECT COUNT(*) n FROM citas").get() as { n: number }).n
        : 0;
      actual.close();
      if (n > 0 && !force) {
        return NextResponse.json(
          { error: `El archivo actual ya tiene ${n} citas cargadas. Pasá ?force=true si de verdad querés reemplazarlo.` },
          { status: 409 }
        );
      }
    } catch {
      // Si no abre como base SQLite válida, se trata igual que "vacío": se
      // permite escribir encima.
    }
  }

  const buffer = Buffer.from(await req.arrayBuffer());
  if (buffer.length === 0) {
    return NextResponse.json({ error: "Body vacío — mandá el .db como raw body." }, { status: 400 });
  }

  // Escribe a un archivo temporal primero y valida integridad ANTES de
  // pisar el archivo real: un upload cortado o corrupto no debe dejar
  // DB_PATH en un estado peor del que tenía.
  const tmpPath = DB_PATH + ".uploading";
  fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
  fs.writeFileSync(tmpPath, buffer);

  try {
    const prueba = new Database(tmpPath, { readonly: true });
    const check = prueba.pragma("integrity_check") as Array<{ integrity_check: string }>;
    const citasN = (prueba.prepare("SELECT COUNT(*) n FROM citas").get() as { n: number }).n;
    const clientesN = (prueba.prepare("SELECT COUNT(*) n FROM clientes").get() as { n: number }).n;
    prueba.close();

    if (check[0]?.integrity_check !== "ok") {
      fs.unlinkSync(tmpPath);
      return NextResponse.json({ error: "El archivo subido no pasó integrity_check.", detalle: check }, { status: 400 });
    }

    // Reintento corto: en Windows (solo en pruebas locales — el contenedor
    // real es Linux) un archivo recién escrito puede quedar momentáneamente
    // bloqueado (antivirus/indexado) y el rename inmediato falla con EBUSY.
    let ultimoError: unknown;
    let hecho = false;
    for (let intento = 0; intento < 5 && !hecho; intento++) {
      try {
        fs.renameSync(tmpPath, DB_PATH);
        hecho = true;
      } catch (e) {
        ultimoError = e;
        await new Promise((r) => setTimeout(r, 150));
      }
    }
    if (!hecho) throw ultimoError;

    return NextResponse.json({ ok: true, citas: citasN, clientes: clientesN });
  } catch (err) {
    try { fs.unlinkSync(tmpPath); } catch { /* ya no está */ }
    return NextResponse.json({ error: "El archivo subido no abre como SQLite válido.", detalle: String(err) }, { status: 400 });
  }
}
