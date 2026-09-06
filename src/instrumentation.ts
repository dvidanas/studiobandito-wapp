export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { startBackupScheduler } = await import("./lib/scheduler");

    startBackupScheduler();

    // Baileys NO arranca en este panel a propósito. Es el clon de prueba
    // para revisar el Paso 3 de la migración de schema (panel admin/CRM
    // sobre datos reales migrados) — no el sistema en producción. Levantar
    // una segunda sesión de WhatsApp acá arriesgaría un QR que nadie debería
    // escanear y una posible interferencia con la sesión real del panel de
    // producción (05_automatizacion_014), que hoy tampoco usa el bot.
    // Si este panel llega a reemplazar al de producción, esto se revierte
    // ahí, no acá.
  }
}
