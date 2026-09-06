// 014_studiobandito/07_panel_v2_014 — client.config.ts
// El único archivo que cambia por deployment, siguiendo la convención de Feer.
//
// Este panel nace de clonar el código de 999_corteingles (panel admin/CRM,
// Paso 3 de la migración de schema). Los datos reales de Studio Bandito
// (283 turnos, 257 clientes) ya están en data/bandito-migrado.db — este
// archivo es branding y configuración, no datos.

export const clientConfig = {
  id: "studiobandito",
  nombre: "Studio Bandito",
  rubro: "barberia",
  // No es un "demo" de venta (esDemo de Corte): son datos reales migrados.
  // El aviso en el Sidebar dice "Vista previa", no "Demo", para no dar a
  // entender que la información es de prueba.
  vistaPrevia: true,

  // El mismo numero que ya quedó en settings.phone / negocio.whatsapp al
  // migrar (2646230305). El panel VIEJO de Bandito tiene cargado un numero
  // distinto (2646998386) y la landing pública otro más — desalineación ya
  // documentada en el CLAUDE.md de la raíz, sin resolver, pendiente de
  // confirmar con la propietaria. No se "corrige" acá a criterio propio.
  whatsapp: "2646230305",
  direccion: "Tucumán 1106 sur, Capital, San Juan",
  // Mismo texto que quedó migrado en settings.business_description.
  descripcion: "studio bandito, servicios de barberia, piercing y tattoo",

  // --- Panel admin: claro por defecto, con toggle a oscuro ---
  // Mismos valores que ya usaba el panel viejo (05_automatizacion_014): Sol
  // ya conoce esta paleta, no la de Corte Inglés (roja).
  panel: {
    temaDefault: "claro" as "claro" | "oscuro",
    colores: {
      claro: {
        fondo: "#FFFFFF",
        fondoSecundario: "#EFEFEF",
        texto: "#111111",
        textoSecundario: "#888888",
        borde: "#DEDEDE",
        acento: "#1A1A1A",
        acentoHover: "#000000",
        exito: "#16A34A",
        alerta: "#D97706",
        error: "#DC2626",
        // Estados de una cita — mismo lenguaje que ya tenía el panel viejo.
        estadoPendiente: "#D97706",
        estadoConfirmada: "#0D9488",
        estadoCancelada: "#71717A",
      },
      oscuro: {
        fondo: "#121316",
        fondoSecundario: "#0A0B0D",
        texto: "#F3F3F5",
        textoSecundario: "#8D9099",
        borde: "#1C1E24",
        acento: "#D4B26F",
        acentoHover: "#BD9C59",
        exito: "#22C55E",
        alerta: "#F59E0B",
        error: "#EF4444",
        estadoPendiente: "#F59E0B",
        estadoConfirmada: "#2DD4BF",
        estadoCancelada: "#A1A1AA",
      },
    },
  },

  // --- Landing pública: Bandito tiene su PROPIA landing aparte
  // (03_landing_014, Vite + React), que no consume este archivo ni este
  // panel. Este bloque solo existe porque seedDemo() en db.ts lo referencia
  // para poblar `negocio.color_primario/color_fondo_landing` en una base
  // vacía — con Sol ya migrada (profesionales.count > 0) ese seeder nunca
  // corre. Se completa igual, con colores propios, para que no quede
  // apuntando al rojo de Corte si algún día se usa. ---
  landing: {
    colores: {
      fondo: "#EFEFEF",
      fondoSecundario: "#FFFFFF",
      texto: "#111111",
      textoSecundario: "#888888",
      acento: "#1A1A1A",
      acentoHover: "#000000",
      borde: "#DEDEDE",
    },
    tipografia: {
      titulos: "'Plus Jakarta Sans', sans-serif",
      cuerpo: "'Plus Jakarta Sans', sans-serif",
    },
  },

  // --- Acceso al panel ---
  // Mismo PIN que ya usa el panel real de Bandito, para que Sol no tenga que
  // aprender uno nuevo solo para revisar esta vista previa.
  loginPin: "0305",

  // --- Bot de WhatsApp (estructura heredada, NO conectado en este panel) ---
  // Valores tal como estaban en el client.config del panel viejo. Baileys no
  // arranca acá — ver instrumentation.ts — así que esto es solo documentación
  // de a qué configuración volvería si el bot se reactivara alguna vez.
  bot: {
    nombre: "Soledad",
    comportamiento: "profesional y cercano",
    responseDelayMs: 8000,
    reservas: true,
  },
} as const;

export type ClientConfig = typeof clientConfig;
