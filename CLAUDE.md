# Studio Bandito — Bot WhatsApp + Dashboard

## Stack
- Next.js 16 + TypeScript + React 19 + Tailwind CSS 4
- better-sqlite3 (WAL mode) — base de datos local
- YCloud API — WhatsApp Business
- Gemini AI — procesamiento de mensajes (REST directo, sin SDK)
- Node.js ≥ 20.9

## Deploy
- **Plataforma:** Easypanel en VPS `92.113.38.251:3000`
- **Proyecto:** `feer-proyectos / 014_studiobandito`
- **URL pública:** `https://studiobanditobot.feer.com.ar`
- **GitHub:** `https://github.com/dvidanas/studiobandito-wapp` (rama: `main`)
- Deploy automático al pushear a `main`

## Variables de entorno clave (Easypanel)
| Variable | Descripción |
|---|---|
| `DB_PATH` | Ruta persistente de la DB, ej: `/app/data/messages.db` |
| `AUTH_SECRET` | Secret para JWT de sesión del dashboard |
| `YCLOUD_API_KEY` | Clave de YCloud WhatsApp |
| `YCLOUD_WEBHOOK_SECRET` | Secret para verificar webhooks (opcional) |
| `SKIP_SIGNATURE_CHECK` | `true` mientras no esté configurado el webhook secret |
| `GEMINI_API_KEY` | Clave de Google Gemini |
| `GOOGLE_SERVICE_ACCOUNT_KEY` | JSON de service account en base64 (backup Drive) |
| `GOOGLE_DRIVE_BACKUP_FOLDER_ID` | ID de carpeta en Drive para backups |

## Backup
- Backup automático cada 24 h, arranca via `src/instrumentation.ts` al iniciar el servidor
- Primer backup: 2 minutos después del boot
- Guarda hasta 30 backups locales en `/app/data/backups/`
- Si están configuradas las vars de Drive, sube automáticamente a Google Drive
- UI de backup en Settings → pestaña "Backup"
- API: `GET /api/backup`, `POST /api/backup`

## Estructura relevante
```
src/
  instrumentation.ts        ← arranca el scheduler al iniciar Next.js
  lib/
    db.ts                   ← SQLite, lazy init, migraciones
    backup.ts               ← lógica de backup local + Google Drive
    scheduler.ts            ← scheduler diario (global singleton)
    gemini.ts               ← cliente Gemini REST
    ycloud/                 ← cliente YCloud + verificación de firma
  app/
    api/webhook/route.ts    ← entrada de mensajes WhatsApp
    api/backup/route.ts     ← API de backup
    settings/page.tsx       ← dashboard de configuración
```

## Decisiones de arquitectura
- SQLite sobre PostgreSQL: barbería pequeña, un solo servidor, sin necesidad de escalar
- Backup con crypto nativo (RS256 JWT) sin dependencias externas
- Scheduler con `global.__backupSchedulerStarted` para evitar duplicados en hot reload
- `SKIP_SIGNATURE_CHECK=true` en producción hasta configurar webhook secret en YCloud

## Comandos útiles
```bash
# Dev local
npm run dev   # puerto 3002 (ver .env)

# Build
node node_modules/next/dist/bin/next build
```
