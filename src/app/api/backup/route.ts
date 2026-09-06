import { NextResponse, type NextRequest } from "next/server";
import fs from "node:fs";
import {
  listLocalBackups,
  getBackupFilePath,
  runFullBackup,
} from "@/lib/backup";

export const dynamic = "force-dynamic";

// GET /api/backup          → lista backups + estado de config
// GET /api/backup?file=... → descarga ese archivo
// POST /api/backup         → ejecuta backup ahora
export async function GET(req: NextRequest) {
  const file = req.nextUrl.searchParams.get("file");

  if (file) {
    // Sanitize: solo letras, números, guiones y puntos
    if (!/^[\w.-]+$/.test(file) || !file.endsWith(".db")) {
      return NextResponse.json({ error: "Archivo inválido" }, { status: 400 });
    }
    const filePath = getBackupFilePath(file);
    if (!fs.existsSync(filePath)) {
      return NextResponse.json({ error: "No encontrado" }, { status: 404 });
    }
    const buffer = fs.readFileSync(filePath);
    return new Response(buffer, {
      headers: {
        "Content-Type": "application/x-sqlite3",
        "Content-Disposition": `attachment; filename="${file}"`,
        "Content-Length": String(buffer.length),
      },
    });
  }

  const backups = listLocalBackups();
  const driveConfigured = !!(
    process.env.GOOGLE_SERVICE_ACCOUNT_KEY && process.env.GOOGLE_DRIVE_BACKUP_FOLDER_ID
  );

  return NextResponse.json({
    backups,
    driveConfigured,
    lastBackup: backups[0] ?? null,
  });
}

export async function POST() {
  const result = await runFullBackup();
  return NextResponse.json(result, { status: result.ok ? 200 : 500 });
}
