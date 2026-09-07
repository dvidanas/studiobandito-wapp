"use client";

/**
 * Piezas compartidas por las pantallas nuevas (Caja, Comisiones, Descuentos).
 *
 * El panel usa alto fijo con scroll interno, no scroll de documento: por eso
 * `PantallaPanel` separa un encabezado que no scrollea de un cuerpo que sí.
 * Cada pantalla nueva se cuelga de acá en vez de repetir el andamiaje.
 */

import { useState, type ReactNode, type SelectHTMLAttributes } from "react";
import type { PresetRango } from "@/lib/panelDates";

export function PantallaPanel({
  titulo,
  descripcion,
  acciones,
  children,
}: {
  titulo: string;
  descripcion?: string;
  acciones?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="flex flex-col h-full min-h-0">
      <header className="shrink-0 border-b border-[var(--color-wa-sep)] bg-[var(--color-wa-header)] px-4 md:px-6 py-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="min-w-0">
            <h1 className="font-display text-2xl font-semibold text-[var(--color-wa-text-main)]">
              {titulo}
            </h1>
            {descripcion && (
              <p className="text-sm text-[var(--color-wa-text-sec)] mt-0.5">{descripcion}</p>
            )}
          </div>
          {acciones && <div className="flex items-center gap-2">{acciones}</div>}
        </div>
      </header>
      <div className="flex-1 min-h-0 overflow-y-auto px-4 md:px-6 py-5">{children}</div>
    </div>
  );
}

export function Tarjeta({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      className={`rounded-2xl border border-[var(--color-wa-sep)] bg-[var(--color-wa-panel-l)] ${className}`}
      style={{ boxShadow: "var(--shadow-card)" }}
    >
      {children}
    </section>
  );
}

export function TituloSeccion({ children, extra }: { children: ReactNode; extra?: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 px-4 md:px-5 py-3.5 border-b border-[var(--color-wa-sep)]">
      <h2 className="text-sm font-bold uppercase tracking-wider text-[var(--color-wa-text-sec)]">
        {children}
      </h2>
      {extra}
    </div>
  );
}

/** Métrica grande. `tono` pinta el número, no la tarjeta: el color es el dato. */
export function Metrica({
  etiqueta,
  valor,
  detalle,
  tono = "neutro",
}: {
  etiqueta: string;
  valor: string;
  detalle?: string;
  tono?: "neutro" | "exito" | "error" | "acento";
}) {
  const color = {
    neutro: "var(--color-wa-text-main)",
    exito: "var(--color-wa-exito)",
    error: "var(--color-wa-error)",
    acento: "var(--color-wa-green)",
  }[tono];

  return (
    <Tarjeta className="p-4 md:p-5">
      <p className="text-[11px] font-bold uppercase tracking-wider text-[var(--color-wa-text-sec)]">
        {etiqueta}
      </p>
      <p className="tnum text-2xl md:text-3xl font-bold mt-1.5" style={{ color }}>
        {valor}
      </p>
      {detalle && (
        <p className="text-xs text-[var(--color-wa-text-sec)] mt-1">{detalle}</p>
      )}
    </Tarjeta>
  );
}

export function Boton({
  children,
  onClick,
  tipo = "primario",
  chico = false,
  disabled = false,
  submit = false,
}: {
  children: ReactNode;
  onClick?: () => void;
  tipo?: "primario" | "secundario" | "peligro";
  chico?: boolean;
  disabled?: boolean;
  submit?: boolean;
}) {
  const base = `rounded-xl font-semibold transition-all duration-150 disabled:opacity-40 disabled:cursor-not-allowed ${
    chico ? "px-3 py-1.5 text-xs" : "px-4 py-2.5 text-sm"
  }`;
  const estilos = {
    primario:
      "bg-[var(--color-wa-green)] text-[var(--color-wa-green-text)] hover:bg-[var(--color-wa-green-dark)]",
    secundario:
      "border border-[var(--color-wa-sep)] text-[var(--color-wa-text-main)] hover:bg-[var(--color-wa-hover)]",
    peligro:
      "border border-[var(--color-wa-sep)] text-[var(--color-wa-error)] hover:bg-[var(--color-wa-hover)]",
  }[tipo];

  return (
    <button
      type={submit ? "submit" : "button"}
      onClick={onClick}
      disabled={disabled}
      className={`${base} ${estilos}`}
    >
      {children}
    </button>
  );
}

export function Campo({
  etiqueta,
  children,
  ancho = "",
}: {
  etiqueta: string;
  children: ReactNode;
  ancho?: string;
}) {
  return (
    <label className={`flex flex-col gap-1.5 ${ancho}`}>
      <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--color-wa-text-sec)]">
        {etiqueta}
      </span>
      {children}
    </label>
  );
}

/**
 * `<select>` nativo con el chevron separado del texto y del borde.
 *
 * El chevron nativo del navegador queda pegado al padding del campo — sin
 * aire ni respecto al texto ni respecto al borde. `appearance-none` lo saca
 * del medio y este SVG lo reemplaza con margen propio (`right-2.5`); `pr-8`
 * en el select le da al texto lugar para no chocar contra el ícono.
 *
 * Recibe las mismas clases que ya usaba cada `<select>` (alto, tipografía,
 * fondo) vía `className` — este componente solo se ocupa del chevron, no
 * del tamaño. `wrapperClassName` es para el caso puntual donde el select
 * necesita ocupar todo el ancho de su fila (ej. los filtros de Turnos en
 * mobile): el layout de las demás pantallas no cambia porque nadie más lo
 * pasa.
 */
export function Select({
  className = "",
  wrapperClassName = "",
  children,
  ...props
}: SelectHTMLAttributes<HTMLSelectElement> & { wrapperClassName?: string }) {
  return (
    <div className={`relative ${wrapperClassName}`}>
      <svg
        className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[var(--color-wa-text-sec)]"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={2.5}
      >
        <path strokeLinecap="round" strokeLinejoin="round" d="M6 9l6 6 6-6" />
      </svg>
      <select {...props} className={`appearance-none pr-8 ${className}`}>
        {children}
      </select>
    </div>
  );
}

/**
 * Campos del panel. Un solo estilo, dos tamaños.
 *
 * El estilo (borde, fondo, foco) se define una vez acá. El tamaño lo elige la
 * densidad de la pantalla, no el gusto de cada archivo:
 *
 *   CHICO (30px)  grillas densas, donde el campo es una celda más:
 *                 Config → Horarios y Personal → Disponibilidad.
 *   FORM  (38px)  filas de formulario, donde el campo convive con selects y
 *                 textos: Caja, Descuentos, Comisiones, alta de turno.
 *
 * Dentro de una fila todos los campos miden lo mismo. Entre pantallas puede
 * cambiar el tamaño, nunca el estilo.
 *
 * **El alto va fijo a propósito.** Chrome le da a `input[type=date]` y a
 * `input[type=time]` alturas intrínsecas distintas: con la misma clase quedaban
 * en 26 y 29 px, y por eso la fila de Días cerrados se veía despareja aunque
 * los dos campos usaran el mismo estilo. Lo mismo con el ancho — `date` trae
 * "dd/mm/aaaa" y `time` "--:--", cada uno con su ícono nativo — así que también
 * va fijo. Sin esos dos números, dos campos hermanos nunca coinciden.
 *
 * El fondo es `--color-wa-input` en los dos tamaños. Antes los chicos usaban
 * `--color-wa-bg-main`: en claro son el mismo color y no se notaba, pero en
 * oscuro el campo se confundía con el fondo de la tarjeta.
 */
const baseCampo =
  "border border-[var(--color-wa-sep)] bg-[var(--color-wa-input)] text-[var(--color-wa-text-main)] outline-none focus:border-[var(--color-wa-green)] transition-colors";

const campoChico = `${baseCampo} h-[30px] rounded-lg px-2 text-xs`;

export const campoHora = `${campoChico} w-[92px]`;
export const campoFecha = `${campoChico} w-[132px]`;
/** No es un campo de fecha, pero comparte alto para que la fila quede pareja. */
export const campoTextoChico = campoChico;

/** Tamaño formulario. Es el que ya usaban Caja, Comisiones y Descuentos. */
/**
 * Bloque plegable. Mismo gesto que `HorarioGroup` en Turnos — chevron que gira,
 * el título hace de botón — pero para secciones de una pantalla en vez de
 * grupos de turnos.
 *
 * `resumen` es lo que se ve cuando está cerrado. No es decorativo: sin él,
 * plegar esconde información en vez de ahorrar scroll, y hay que abrir cada
 * sección para saber cuál era la que se buscaba.
 */
export function Acordeon({
  titulo,
  bajada,
  resumen,
  defaultOpen = false,
  children,
}: {
  titulo: string;
  bajada?: string;
  resumen?: ReactNode;
  defaultOpen?: boolean;
  children: ReactNode;
}) {
  const [abierto, setAbierto] = useState(defaultOpen);

  return (
    <div className="flex flex-col gap-4">
      <button
        onClick={() => setAbierto((v) => !v)}
        aria-expanded={abierto}
        className="flex items-start gap-2 text-left rounded-lg -mx-1 px-1 py-1 hover:bg-[var(--color-wa-hover)] transition-colors cursor-pointer"
      >
        <svg
          className={`w-3.5 h-3.5 mt-1 shrink-0 text-[var(--color-wa-text-sec)] transition-transform duration-150 ${abierto ? "rotate-90" : ""}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2.5}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
        </svg>
        <span className="min-w-0">
          <span className="block text-base font-semibold text-[var(--color-wa-text-main)]">{titulo}</span>
          {/* Cerrado muestra el resumen; abierto, la bajada explicativa. */}
          {!abierto && resumen ? (
            <span className="block text-sm text-[var(--color-wa-text-sec)] mt-0.5">{resumen}</span>
          ) : abierto && bajada ? (
            <span className="block text-sm text-[var(--color-wa-text-sec)] mt-0.5">{bajada}</span>
          ) : null}
        </span>
      </button>
      {abierto && children}
    </div>
  );
}

export const claseInput = `${baseCampo} h-[38px] rounded-xl px-3 text-sm`;
/** Igual que `claseInput`, con el ancho fijo que el date necesita para no bailar. */
export const campoFechaForm = `${claseInput} w-[156px]`;
/** Para textarea: mismo estilo, sin alto fijo — lo define `rows`. */
export const claseArea = `${baseCampo} rounded-xl px-3 py-2 text-sm`;

/**
 * Selector de rango. Lo usan Métricas, Caja y Comisiones.
 *
 * Cada pantalla pide los presets que le sirven y con qué nombre: en Métricas
 * el día es siempre hoy y se llama "Hoy", en Caja se puede elegir cuál y se
 * llama "Día". La lógica de fechas vive en `lib/panelDates`, no acá.
 */
export function SelectorRango({
  preset,
  opciones,
  desde,
  hasta,
  onPreset,
  onCustom,
}: {
  preset: PresetRango;
  /** Qué botones mostrar, en orden, con su etiqueta. */
  opciones: Array<{ id: PresetRango; label: string }>;
  desde?: string;
  hasta?: string;
  onPreset: (p: PresetRango) => void;
  /** Solo hace falta si `opciones` incluye "custom". */
  onCustom?: (desde: string, hasta: string) => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="flex gap-1 p-1 rounded-xl bg-[var(--color-wa-panel-l)] border border-[var(--color-wa-sep)]">
        {opciones.map((o) => (
          <button
            key={o.id}
            onClick={() => onPreset(o.id)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
              preset === o.id
                ? "bg-[var(--color-wa-green)] text-[var(--color-wa-green-text)]"
                : "text-[var(--color-wa-text-sec)] hover:bg-[var(--color-wa-hover)]"
            }`}
          >
            {o.label}
          </button>
        ))}
      </div>
      {preset === "custom" && onCustom && desde && hasta && (
        <div className="flex items-center gap-1.5">
          <input
            type="date" className={campoFecha} value={desde} max={hasta}
            onChange={(e) => e.target.value && onCustom(e.target.value, hasta)}
          />
          <span className="text-xs text-[var(--color-wa-text-sec)]">a</span>
          <input
            type="date" className={campoFecha} value={hasta} min={desde}
            onChange={(e) => e.target.value && onCustom(desde, e.target.value)}
          />
        </div>
      )}
    </div>
  );
}

/** Aviso inline. Se usa para errores de la API, que siempre traen texto. */
export function Aviso({ texto, tono = "error" }: { texto: string; tono?: "error" | "ok" }) {
  const color = tono === "error" ? "var(--color-wa-error)" : "var(--color-wa-exito)";
  return (
    <p
      className="text-sm rounded-xl px-3 py-2 border"
      style={{ color, borderColor: color, backgroundColor: "transparent" }}
    >
      {texto}
    </p>
  );
}

export function Vacio({ children }: { children: ReactNode }) {
  return (
    <p className="text-sm text-[var(--color-wa-text-sec)] px-4 md:px-5 py-8 text-center">
      {children}
    </p>
  );
}
