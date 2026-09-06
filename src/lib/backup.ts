import Database from "better-sqlite3";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

const DB_PATH = process.env.DB_PATH || path.join(process.cwd(), "data", "messages.db");
const BACKUP_DIR = path.join(path.dirname(DB_PATH), "backups");
const MAX_LOCAL_BACKUPS = 30;

export interface BackupInfo {
  filename: string;
  createdAt: string;
  sizeBytes: number;
}

export interface BackupResult {
  ok: boolean;
  filename?: string;
  driveFileId?: string;
  error?: string;
}

// ── Local backup ────────────────────────────────────────────────────────────

export async function createLocalBackup(): Promise<{ filename: string; filePath: string }> {
  fs.mkdirSync(BACKUP_DIR, { recursive: true });

  const timestamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
  const filename = `backup-${timestamp}.db`;
  const filePath = path.join(BACKUP_DIR, filename);

  const src = new Database(DB_PATH, { readonly: true });
  await src.backup(filePath);
  src.close();

  return { filename, filePath };
}

export function listLocalBackups(): BackupInfo[] {
  if (!fs.existsSync(BACKUP_DIR)) return [];

  return fs
    .readdirSync(BACKUP_DIR)
    .filter((f) => f.startsWith("backup-") && f.endsWith(".db"))
    .map((filename) => {
      const stat = fs.statSync(path.join(BACKUP_DIR, filename));
      return { filename, createdAt: stat.mtime.toISOString(), sizeBytes: stat.size };
    })
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export function getBackupFilePath(filename: string): string {
  return path.join(BACKUP_DIR, filename);
}

export function cleanOldBackups(): void {
  const backups = listLocalBackups();
  for (const b of backups.slice(MAX_LOCAL_BACKUPS)) {
    try { fs.unlinkSync(path.join(BACKUP_DIR, b.filename)); } catch { /* ignorar */ }
  }
}

// ── Google Drive upload (service account) ──────────────────────────────────

async function getDriveToken(): Promise<string | null> {
  const keyJson = process.env.GOOGLE_SERVICE_ACCOUNT_KEY;
  if (!keyJson) return null;

  let sa: { client_email: string; private_key: string };
  try {
    sa = JSON.parse(Buffer.from(keyJson, "base64").toString("utf-8"));
  } catch {
    console.error("[backup] GOOGLE_SERVICE_ACCOUNT_KEY inválido");
    return null;
  }

  const now = Math.floor(Date.now() / 1000);
  const header = Buffer.from(JSON.stringify({ alg: "RS256", typ: "JWT" })).toString("base64url");
  const claims = Buffer.from(
    JSON.stringify({
      iss: sa.client_email,
      scope: "https://www.googleapis.com/auth/drive.file",
      aud: "https://oauth2.googleapis.com/token",
      iat: now,
      exp: now + 3600,
    })
  ).toString("base64url");

  const signingInput = `${header}.${claims}`;
  const sign = crypto.createSign("RSA-SHA256");
  sign.update(signingInput);
  const signature = sign.sign(sa.private_key, "base64url");
  const jwt = `${signingInput}.${signature}`;

  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: jwt,
    }),
  });

  if (!res.ok) {
    console.error("[backup] Error obteniendo token de Google:", await res.text());
    return null;
  }

  const data = await res.json();
  return data.access_token ?? null;
}

export async function uploadToGoogleDrive(filePath: string, filename: string): Promise<string | null> {
  const folderId = process.env.GOOGLE_DRIVE_BACKUP_FOLDER_ID;
  if (!folderId) return null;

  const token = await getDriveToken();
  if (!token) return null;

  const fileContent = fs.readFileSync(filePath);
  const metadata = JSON.stringify({ name: filename, parents: [folderId] });
  const boundary = `backup_${Date.now()}`;

  const body = Buffer.concat([
    Buffer.from(
      `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${metadata}\r\n` +
        `--${boundary}\r\nContent-Type: application/x-sqlite3\r\n\r\n`
    ),
    fileContent,
    Buffer.from(`\r\n--${boundary}--`),
  ]);

  const res = await fetch(
    "https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": `multipart/related; boundary=${boundary}`,
      },
      body,
    }
  );

  if (!res.ok) {
    console.error("[backup] Error subiendo a Google Drive:", await res.text());
    return null;
  }

  const data = await res.json();
  return data.id ?? null;
}

// ── Orchestrator ────────────────────────────────────────────────────────────

export async function runFullBackup(): Promise<BackupResult> {
  try {
    const { filename, filePath } = await createLocalBackup();
    cleanOldBackups();

    let driveFileId: string | undefined;
    if (process.env.GOOGLE_SERVICE_ACCOUNT_KEY && process.env.GOOGLE_DRIVE_BACKUP_FOLDER_ID) {
      const id = await uploadToGoogleDrive(filePath, filename);
      driveFileId = id ?? undefined;
    }

    console.log(
      `[backup] OK → ${filename}${driveFileId ? ` | Drive: ${driveFileId}` : " | sin Drive"}`
    );
    return { ok: true, filename, driveFileId };
  } catch (err) {
    const error = err instanceof Error ? err.message : String(err);
    console.error("[backup] Error:", error);
    return { ok: false, error };
  }
}
