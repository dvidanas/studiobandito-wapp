# Studio Bandito — Panel v2 (vista previa de migración)

Panel admin/CRM de Studio Bandito, clonado del código de **999_corteingles**
(Paso 3 de la migración de schema documentada en el `CLAUDE.md` de la raíz de
`014_studiobandito`), con branding y datos propios.

**No reemplaza al panel en producción** (`05_automatizacion_014`, deployado en
`studiobanditobot.feer.com.ar`). Es un servicio de prueba, temporal, para que
Sol lo revise antes de decidir el corte definitivo.

## Qué tiene

- Los 283 turnos y 257 clientes reales de Bandito, migrados desde el schema
  viejo (`appointments`/`resources`/`services`) al nuevo (`citas`/
  `profesionales`/`servicios`) — ver el detalle completo de la migración en
  el hilo de trabajo y en `CLAUDE.md` de la raíz.
- Una divergencia intencional respecto al schema de Corte: `citas.estado`
  admite además `'pendiente'` (11 turnos migrados que nunca se confirmaron —
  ver `src/components/panel/types.ts`).
- Adaptado para un solo profesional activo (Sol): sin selector de barbero
  forzado, sin "Comisiones" en el nav (vuelve sola cuando haya más de un
  profesional — la página y la API quedan intactas).

## Qué NO tiene

- El bot de WhatsApp no arranca (`src/instrumentation.ts`) — ver el
  comentario ahí antes de reactivarlo.
- No es un espejo 1:1 de Corte: buscar "OJO" y "extensión propia de Bandito"
  en el código para los puntos donde se apartó a propósito.

## Correr en local

```
npm install
cp .env.example .env   # completar AUTH_SECRET; DB_PATH ya apunta a data/
npm run dev            # puerto 3099 (ver package.json)
```

Necesita `data/bandito-migrado.db` — no se versiona (ver `.gitignore`). Se
migra con el script de migración del Paso 2 (queda en el hilo de trabajo,
no en este repo) o se sube de una vez a un deploy nuevo con
`POST /api/admin/restore-db` (ver el comentario en esa ruta).

## PIN

Mismo PIN que el panel real de producción (`0305`) — ver
`src/lib/client.config.ts`.
