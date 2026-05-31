# Guía de configuración — Nuevo cliente

Bot de WhatsApp con dashboard de gestión. Conecta un número real vía YCloud, responde con Gemini AI y permite alternar entre modo IA y modo Humano por conversación.

---

## Quickstart local

```bash
git clone https://github.com/dvidanas/studiobandito-wapp.git nombre-cliente
cd nombre-cliente
npm install
cp .env.example .env.local
# Editar .env.local con las credenciales del cliente
npm run dev
```

En otra terminal (para recibir webhooks en desarrollo):

```bash
ngrok http 3000
# Copiar la URL HTTPS → configurar en YCloud → Webhooks
```

Agregar `SKIP_SIGNATURE_CHECK=true` en `.env.local` durante desarrollo.

---

## Paso 1 — Personalizar el negocio

Editar **únicamente** `src/lib/client.config.ts`:

```ts
export const clientConfig = {
  businessName: "Nombre del Negocio",        // Aparece en el dashboard y en el bot
  businessDescription: "Descripción...",      // Qué hace el negocio
  address: "Dirección completa",              // Dónde queda
  phone: "1100000000",                        // Teléfono de contacto

  hours: {                                    // null = día cerrado
    monday:    { open: "09:00", close: "18:00" },
    saturday:  { open: "09:00", close: "14:00" },
    sunday:    null,
    // ...
  },

  services: [                                 // Servicios que ofrece
    { id: "s1", name: "Nombre", price: 10000, duration: 30, description: "..." },
  ],

  botName: "Nombre del bot",                  // Cómo se presenta el bot por WhatsApp
  loginPin: "1234",                           // PIN de acceso al dashboard
  appointmentDuration: 30,                    // Duración default de turnos en minutos

  appointments: {
    enabled: true,
    resource: "Nombre del recurso",           // Nombre del recurso/persona en el sistema de turnos
  },
};
```

> No tocar ningún otro archivo para cambiar de cliente.

---

## Paso 2 — Configurar variables de entorno

Copiar `.env.example` a `.env.local` (local) o cargar en EasyPanel (producción):

| Variable | Descripción |
|----------|-------------|
| `DASHBOARD_USER` | Usuario para el login del dashboard |
| `DASHBOARD_PASSWORD` | Contraseña del dashboard |
| `AUTH_SECRET` | Secret para firmar cookies. Generar con: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"` |
| `YCLOUD_API_KEY` | API Key de YCloud (Settings → API Keys) |
| `YCLOUD_PHONE_NUMBER` | Número WhatsApp del cliente en formato E.164 (ej: `+5491155555555`) |
| `GEMINI_API_KEY` | API Key de Google AI Studio |
| `GEMINI_MODEL` | Modelo de Gemini (default: `gemini-2.0-flash`) |
| `GOOGLE_SERVICE_ACCOUNT_KEY` | JSON de service account en base64 (backup Drive, opcional) |
| `GOOGLE_DRIVE_BACKUP_FOLDER_ID` | ID de carpeta en Drive para backups (opcional) |

---

## Paso 3 — Reemplazar el logo

Reemplazar `public/logo.png` con el logo del cliente (PNG, fondo transparente recomendado).

---

## Paso 4 — Deploy en EasyPanel (Hostinger VPS)

1. Crear nueva app en EasyPanel apuntando al repositorio del cliente.
2. Asignar dominio (ej: `cliente.tuagencia.com`).
3. Cargar las variables de entorno en EasyPanel → Environment.
4. Agregar volumen persistente montado en `/app/data`.
5. Deployar.
6. Configurar webhook en YCloud apuntando a `https://[dominio]/api/webhook`.
7. Entregar al cliente: URL del dashboard, usuario y contraseña.

---

## Checklist por cliente

- [ ] `client.config.ts` editado con datos del cliente
- [ ] `public/logo.png` reemplazado
- [ ] Variables de entorno cargadas en EasyPanel
- [ ] `AUTH_SECRET` generado (uno único por cliente)
- [ ] Volumen persistente configurado en `/app/data`
- [ ] Webhook de YCloud apuntando al dominio del cliente
- [ ] Login del dashboard verificado
- [ ] Primer mensaje de prueba enviado por WhatsApp

---

## Troubleshooting

| Síntoma | Causa probable | Solución |
|---------|----------------|----------|
| Login devuelve 500 | Falta `AUTH_SECRET` | Agregar en `.env.local` o EasyPanel |
| Login devuelve 401 | PIN incorrecto | Verificar `loginPin` en `client.config.ts` |
| Webhook devuelve 401 | `YCLOUD_API_KEY` incorrecto | Verificar o agregar `SKIP_SIGNATURE_CHECK=true` en desarrollo |
| YCloud 404 al enviar | `YCLOUD_PHONE_NUMBER` incorrecto | Verificar formato E.164 |
| Gemini no responde | `GEMINI_API_KEY` o `GEMINI_MODEL` incorrectos | Verificar en AI Studio |
| DB no persiste entre deploys | Volumen no configurado | Montar volumen en `/app/data` en EasyPanel |
