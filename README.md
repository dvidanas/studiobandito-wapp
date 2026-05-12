# Agente WhatsApp

Bot de WhatsApp con dashboard de gestión. Se conecta a un número real vía YCloud API y responde con Gemini. Permite alternar entre modo IA y modo Humano por conversación.

---

## Quickstart local

```bash
npm install
cp .env.example .env.local
# Editar .env.local con tus credenciales
npm run dev
```

En otra terminal (para recibir webhooks):

```bash
ngrok http 3000
# Copiar la URL HTTPS de ngrok → configurar en YCloud → Webhooks
```

Agregar `SKIP_SIGNATURE_CHECK=true` en `.env.local` durante desarrollo local.

---

## Configurar un nuevo cliente

1. Clonar este repositorio.
2. Editar **solo** `src/lib/client.config.ts` con los datos del cliente.
3. Crear nueva app en EasyPanel apuntando al repo.
4. Asignar dominio (ej: `cliente.tuagencia.com`).
5. Configurar las variables de entorno en EasyPanel → Environment:
   - `AUTH_SECRET` (generar uno nuevo para cada cliente)
   - `DASHBOARD_USER` / `DASHBOARD_PASSWORD`
   - `YCLOUD_API_KEY` / `YCLOUD_PHONE_NUMBER`
   - `GEMINI_API_KEY` / `GEMINI_MODEL`
6. Agregar volumen persistente en `/app/data`.
7. Deployar.
8. Configurar webhook en YCloud apuntando a `https://[dominio]/api/webhook`.
9. Entregar al cliente: URL del dashboard, usuario y contraseña.

---

## Variables de entorno — referencia completa

| Variable | Descripción | Ejemplo |
|---|---|---|
| `DASHBOARD_USER` | Usuario para el login del dashboard | `admin` |
| `DASHBOARD_PASSWORD` | Contraseña del dashboard | `contraseña-segura` |
| `AUTH_SECRET` | Secreto para firmar cookies de sesión. Generar con: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"` | `a3f8...` |
| `YCLOUD_API_KEY` | API Key de YCloud (Settings → API Keys) | `yk_live_...` |
| `YCLOUD_PHONE_NUMBER` | Número de WhatsApp en formato E.164 | `+5491155555555` |
| `GEMINI_API_KEY` | API Key de Google AI Studio | `AIza...` |
| `GEMINI_MODEL` | Modelo de Gemini a usar | `gemini-2.0-flash` |
| `SKIP_SIGNATURE_CHECK` | Solo desarrollo local. Nunca en producción. | `true` |

---

## Personalizar el bot

Editar `src/lib/client.config.ts`. Secciones:

- **`businessName`** / **`businessDescription`**: Nombre e identidad del negocio.
- **`knowledge`**: Servicios, precios, horarios, formas de pago y FAQ.
- **`behavior.tone`**: Cómo habla el bot (tono, longitud de respuestas, etc.).
- **`behavior.canDo`** / **`cannotDo`**: Qué puede y qué no puede hacer.
- **`behavior.escalationPhrase`**: Qué dice cuando no puede resolver algo.
- **`behavior.offHoursNote`**: Mensaje para fuera del horario de atención.
- **`tools`**: Documentación de integraciones futuras (v2).

No tocar ningún otro archivo al cambiar de cliente.

---

## Estructura del proyecto

```
src/
├── middleware.ts              # Protección de rutas (auth)
├── app/
│   ├── page.tsx               # Dashboard principal
│   ├── layout.tsx
│   ├── login/page.tsx         # Pantalla de login
│   └── api/
│       ├── auth/              # Login y logout
│       ├── webhook/           # Recibe mensajes de YCloud
│       ├── connection/status  # Estado de la conexión
│       ├── conversations/     # CRUD de conversaciones
│       ├── messages/          # Mensajes por conversación
│       └── mode/              # Cambio AI ↔ HUMAN
├── components/                # UI del dashboard
└── lib/
    ├── client.config.ts       # ← ÚNICO ARCHIVO QUE CAMBIA POR CLIENTE
    ├── system-prompt.ts       # Prompt construido desde client.config
    ├── db.ts                  # SQLite + helpers
    ├── auth.ts                # Cookie firmada
    ├── gemini.ts              # Cliente Gemini (via OpenAI SDK)
    └── ycloud/
        ├── client.ts          # Envío de mensajes
        ├── verify.ts          # Verificación de firma HMAC
        └── handler.ts         # Procesamiento de webhooks
data/
└── messages.db                # Base de datos SQLite (volumen persistente)
```

---

## Deploy en EasyPanel

El proyecto incluye `nixpacks.toml` y `Procfile` listos para EasyPanel.

**Requisitos:**
- Node.js 22
- Volumen persistente montado en `/app/data`

**Variables de entorno obligatorias para producción:**
`AUTH_SECRET`, `DASHBOARD_USER`, `DASHBOARD_PASSWORD`, `YCLOUD_API_KEY`, `YCLOUD_PHONE_NUMBER`, `GEMINI_API_KEY`

---

## Mejoras pendientes (v2)

- System prompt editable desde el dashboard sin tocar código.
- Integración con Google Calendar para turnos reales.
- Precios desde Google Sheets (el cliente los actualiza sin código).
- Detección automática de "quiero hablar con una persona" → cambio automático a modo HUMAN.
- Soporte para imágenes y audio entrantes.
- Panel de administración multi-cliente.
- Message Templates de WhatsApp para ventana fuera de 24 h.

---

## Troubleshooting

| Síntoma | Causa probable | Solución |
|---|---|---|
| Login devuelve 500 | Falta `AUTH_SECRET` | Agregar en `.env.local` |
| Login devuelve 401 | Usuario o contraseña incorrectos | Verificar `DASHBOARD_USER` / `DASHBOARD_PASSWORD` |
| Webhook devuelve 401 | `YCLOUD_API_KEY` incorrecto | Verificar o agregar `SKIP_SIGNATURE_CHECK=true` en desarrollo |
| YCloud 404 al enviar | `YCLOUD_PHONE_NUMBER` incorrecto | Verificar formato E.164 (ej: `+5491155555555`) |
| Gemini no responde | `GEMINI_API_KEY` o `GEMINI_MODEL` incorrectos | Verificar en AI Studio |
| Mensajes con ícono de error | No se pudo enviar por WhatsApp | Revisar logs del servidor |
