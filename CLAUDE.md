# Studio Bandito — Dashboard + API (schema Corte Inglés)

## Qué es esto

El 2026-09-06 este código reemplazó al panel viejo de Bandito (schema
`appointments`/`resources`/`services`) en `main` de este mismo repo
(`dvidanas/studiobandito-wapp`). Es el codebase de `999_corteingles`
(schema `citas`/`profesionales`/`servicios`, modelo multi-profesional)
adaptado a Bandito: branding propio, datos reales migrados, UI pensada para
un solo profesional activo hoy (Sol).

El detalle completo de la migración (decisiones, dry-runs, verificación de
conteos) quedó en el hilo de trabajo, no en el repo. Lo que sí queda acá es
lo que hace falta para operar y mantener este código de acá en adelante.

## Stack
- Next.js 16 + TypeScript + React 19 + Tailwind CSS 4
- better-sqlite3 (WAL mode) — base de datos local
- Baileys — WhatsApp (NO conectado en producción por ahora, ver más abajo)
- Node.js ≥ 20.9

## Divergencias intencionales respecto a `999_corteingles`

Corte Inglés le sacó a Bandito el concepto de turno "pendiente" (sin
confirmar) — todo turno nuevo nace `confirmada`. Bandito tenía 11 turnos
reales en ese estado al momento de migrar, así que **acá `citas.estado`
sigue admitiendo `'pendiente'`** además de los 4 estados de Corte
(`confirmada`, `atendida`, `cancelada`, `no_show`). Es una extensión propia
de este fork, no de Corte. Buscar `'pendiente'` en:
- `src/components/panel/types.ts` (`EstadoCita`, `COLOR_ESTADO`, `ESTADOS`)
- `src/lib/db.ts` (segunda definición independiente de `EstadoCita` — ojo,
  hay dos, no están unificadas, hay que tocar las dos si cambia algo)
- `src/components/panel/AppointmentCard.tsx` (rama propia con
  Confirmar/Cancelar)

## PUENTE DE COMPATIBILIDAD con la landing pública (temporal)

`03_landing_014` (deploy aparte, Vercel) todavía llama a las URLs viejas de
Bandito, que no existen en el schema/código de Corte. En vez de tocar la
landing en el mismo corte que la base de datos, se agregaron 4 endpoints
puente que traducen esas URLs viejas a las funciones reales de este código:

| Ruta vieja (la sigue llamando la landing) | Traduce a |
|---|---|
| `GET /api/settings/services` | `listServicios()` |
| `GET /api/availability/overview` | `getBusinessHours()` + `getResumenDisponibilidad()` |
| `GET /api/appointments/available` | `getSlotsDisponibles()` |
| `POST /api/appointments` | `createCita()` |

Los 4 archivos tienen el comentario "PUENTE DE COMPATIBILIDAD" al principio.
Están en `PUBLIC_PATHS` de `src/middleware.ts` y tienen su propio bloque de
CORS en `next.config.ts` — si se tocan las rutas, hay que tocar ambos.

**Estos 4 endpoints resuelven el profesional automáticamente asumiendo que
hay exactamente una persona activa (Sol).** Si el día de mañana Sol suma
personal, `POST /api/appointments` no va a poder adivinar a quién asignarle
el turno y va a devolver 500. Antes de sumar personal hay que:
1. Migrar la landing a los endpoints nativos (`/api/publico/reservar`,
   `/api/publico/disponibilidad`, `/api/publico/disponibilidad/resumen`,
   `/api/publico/catalogo`), que sí piden `profesional_id`, o
2. Extender el puente para que reciba `profesional_id` también.

Pendiente (no urgente, no bloquea nada): clonar la landing sobre los
endpoints nativos de Corte y borrar estos 4 puentes.

## Bot de WhatsApp — inactivo

`src/instrumentation.ts` NO arranca Baileys. La producción vieja (YCloud)
ya no tenía actividad real hace más de un mes al momento de este corte
(último mensaje: 2026-08-04) — no es una regresión de este cambio, ya
estaba huérfano. Si se quiere reactivar WhatsApp, es un trabajo aparte:
conectar Baileys (QR de emparejamiento, no webhook con API key como YCloud)
o portar el cliente YCloud de este mismo repo a los endpoints de Corte.

## Deploy
- **Plataforma:** Easypanel en VPS `92.113.38.251:3000`
- **Proyecto:** `feer-proyectos / 014_studiobandito`
- **URL pública:** `https://studiobanditobot.feer.com.ar`
- **GitHub:** `https://github.com/dvidanas/studiobandito-wapp` (rama: `main`)
- Deploy automático al pushear a `main`
- El volumen `/data` persiste entre redeploys — la base NO vive en la imagen

## Variables de entorno clave (Easypanel)
| Variable | Descripción |
|---|---|
| `DB_PATH` | Ruta persistente de la DB — `/data/bandito-migrado.db` (fijo en el Dockerfile, ver comentario ahí) |
| `AUTH_SECRET` | Secret para la cookie de sesión del dashboard |
| `ALLOW_DB_RESTORE` | Dejar en `false` salvo el momento puntual de sembrar un volumen nuevo — ver `src/app/api/admin/restore-db/route.ts` |
| `GEMINI_API_KEY` | Clave de Google Gemini (heredado, Baileys no está conectado) |
| `GOOGLE_SERVICE_ACCOUNT_KEY` | JSON de service account en base64 (backup Drive, opcional) |
| `GOOGLE_DRIVE_BACKUP_FOLDER_ID` | ID de carpeta en Drive para backups (opcional) |

## Backup
- Backup automático cada 24 h, arranca vía `src/instrumentation.ts` al iniciar el servidor
- Guarda backups locales en `/data/backups/`
- API: `GET /api/backup` (lista / descarga), `POST /api/backup` (dispara uno ahora)
- `POST /api/admin/restore-db` — solo para sembrar un volumen nuevo, deshabilitado por defecto (`ALLOW_DB_RESTORE`)

## PIN de acceso
En `src/lib/client.config.ts` (`loginPin`). `POST /api/auth/login` con `{"pin":"…"}`.
