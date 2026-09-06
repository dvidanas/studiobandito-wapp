"use client";

import { useState, type ReactNode } from "react";

/**
 * Agrupación colapsable de turnos, portada del patrón de Pasta Lovers.
 *
 * Diferencia con el original: allá agrupa por hora exacta, porque varias mesas
 * comparten el mismo horario. Acá atiende una sola persona, así que nunca hay
 * dos turnos en la misma hora y agrupar así daría grupos de un elemento.
 * Por eso agrupamos por franja del día (mañana / tarde).
 *
 * Tampoco lleva disponibilidad por zona ni contadores de reasignación: Bandito
 * es mono-recurso y no tiene zonas.
 */

/** Hora a partir de la cual un turno cuenta como "tarde". */
export const CORTE_TARDE = "14:00";

export interface Franja {
  id: "manana" | "tarde";
  titulo: string;
}

export const FRANJAS: Franja[] = [
  { id: "manana", titulo: "Mañana" },
  { id: "tarde", titulo: "Tarde" },
];

/** A qué franja pertenece una hora "HH:MM(:SS)". */
export function franjaDeHora(timeStart: string): Franja["id"] {
  return timeStart < CORTE_TARDE ? "manana" : "tarde";
}

/**
 * La hora "HH:MM" de ahora en Argentina, no la del que mira. El panel se abre
 * desde el celular del dueño, que puede estar en otro huso: con la hora local
 * se abriría la franja equivocada a las 11 de la mañana en España.
 */
export function horaArgentina(): string {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: "America/Argentina/Buenos_Aires",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date());
}

/** "HH:MM(:SS)" a minutos desde medianoche. */
export const enMinutos = (hhmm: string): number =>
  Number(hhmm.slice(0, 2)) * 60 + Number(hhmm.slice(3, 5));

/** Lo mínimo que la regla de abajo necesita saber de una franja. */
export interface FranjaResumen {
  id: Franja["id"];
  /** Primer y último minuto ocupado de la franja. */
  desde: number;
  hasta: number;
  /** Turnos confirmados sin cerrar. */
  pendientes: number;
}

/**
 * Qué franja arranca abierta, dada la hora de Argentina en minutos.
 *
 * Antes se abría la franja EN CURSO según el reloj, sin mirar si tenía turnos.
 * Una franja en curso puede estar vacía: a las 15:00 de un día que sólo carga a
 * la mañana se abría "Tarde", que ni siquiera existe como grupo, y la pantalla
 * quedaba en blanco. Acá se elige entre las que SÍ tienen turnos.
 *
 * Dos criterios, en este orden:
 *   1. los pendientes mandan — son los turnos que hay que resolver, así que si
 *      alguna franja tiene, se elige entre ésas y las demás quedan afuera;
 *   2. entre las candidatas, la más cercana a la hora: distancia 0 si estamos
 *      dentro del rango, y si no, los minutos que faltan o que ya pasaron.
 *
 * Empate: gana la primera en el orden del día, que es el orden de `FRANJAS`.
 *
 * Es una función suelta y no lógica adentro del componente para poder probarla
 * a cualquier hora y con cualquier combinación de pendientes, sin depender de
 * qué hora sea cuando corre el test ni de qué haya cargado en la base.
 */
export function franjaAAbrir(grupos: FranjaResumen[], ahora: number): Franja["id"] | null {
  if (!grupos.length) return null;
  if (grupos.length === 1) return grupos[0].id;
  const distancia = (g: FranjaResumen) =>
    ahora < g.desde ? g.desde - ahora : ahora > g.hasta ? ahora - g.hasta : 0;
  const conPendientes = grupos.filter((g) => g.pendientes > 0);
  const candidatos = conPendientes.length ? conPendientes : grupos;
  return candidatos.reduce((a, b) => (distancia(b) < distancia(a) ? b : a)).id;
}

export function HorarioGroup({
  titulo,
  rango,
  cantidadTurnos,
  cantidadPendientes = 0,
  presentesInfo,
  defaultOpen = true,
  compacto = false,
  children,
}: {
  titulo: string;
  /** Rango real de la franja, derivado de los turnos que contiene. */
  rango?: string;
  cantidadTurnos: number;
  cantidadPendientes?: number;
  /** Solo se pasa para el día de hoy. */
  presentesInfo?: { presentes: number; total: number };
  defaultOpen?: boolean;
  /**
   * Celular. En 320 px este encabezado se partía en dos líneas y costaba 52 px
   * — por dos franjas, 104 px de los 504 que hay en un 320x568, empujando el
   * primer turno fuera de pantalla. En compacto se cae el rango horario, que
   * es lo único acá que ya está escrito en cada tarjeta de abajo: los conteos
   * de turnos y de pendientes se quedan, que son lo que no está en otro lado.
   */
  compacto?: boolean;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className={compacto ? "space-y-2" : "space-y-3"}>
      <button
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className={`w-full flex flex-wrap items-center gap-x-3 gap-y-1 px-1 rounded-lg hover:bg-[var(--color-wa-hover)] transition-colors text-left cursor-pointer ${
          compacto ? "py-0.5" : "py-1"
        }`}
      >
        <div className="flex items-center gap-2 min-w-0">
          <svg
            className={`w-3.5 h-3.5 text-[var(--color-wa-text-sec)] flex-shrink-0 transition-transform duration-150 ${
              open ? "rotate-90" : ""
            }`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2.5}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
          </svg>
          <span
            className={`font-bold text-[var(--color-wa-text-main)] ${compacto ? "text-sm" : "text-base"}`}
          >
            {titulo}
          </span>
          {rango && !compacto && <span className="text-xs text-[var(--color-wa-text-sec)]">· {rango}</span>}
          <span className="text-xs text-[var(--color-wa-text-sec)]">
            · {cantidadTurnos} {cantidadTurnos === 1 ? "turno" : "turnos"}
          </span>
        </div>

        <div className="flex items-center gap-3 text-xs font-semibold">
          {/* Texto "sin cerrar" (no "pendiente/s"): acá cuenta confirmados de
              fechas pasadas que nadie marco atendido/cancelado (ver
              PendingModule). En Bandito 'pendiente' es ademas un estado real
              de citas.estado (turnos migrados que nunca se confirmaron) — dos
              conceptos distintos, mismo día de pantalla, no pueden compartir
              la misma palabra sin confundir a quien lo use. */}
          {cantidadPendientes > 0 && (
            <span className="text-amber-600 dark:text-amber-400">
              {cantidadPendientes} sin cerrar
            </span>
          )}
          {presentesInfo && presentesInfo.total > 0 && (
            <span
              className={
                presentesInfo.presentes === 0
                  ? "text-[var(--color-wa-text-sec)]"
                  : presentesInfo.presentes === presentesInfo.total
                  ? "text-emerald-600 dark:text-emerald-400"
                  : "text-amber-600 dark:text-amber-400"
              }
            >
              {presentesInfo.presentes}/{presentesInfo.total} presentes
            </span>
          )}
        </div>
      </button>
      {open && <div className="space-y-3">{children}</div>}
    </div>
  );
}
