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

export function HorarioGroup({
  titulo,
  rango,
  cantidadTurnos,
  cantidadPendientes = 0,
  presentesInfo,
  defaultOpen = true,
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
  children: ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className="space-y-3">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex flex-wrap items-center gap-x-3 gap-y-1 px-1 py-1 rounded-lg hover:bg-[var(--color-wa-hover)] transition-colors text-left cursor-pointer"
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
          <span className="text-base font-bold text-[var(--color-wa-text-main)]">{titulo}</span>
          {rango && <span className="text-xs text-[var(--color-wa-text-sec)]">· {rango}</span>}
          <span className="text-xs text-[var(--color-wa-text-sec)]">
            · {cantidadTurnos} {cantidadTurnos === 1 ? "turno" : "turnos"}
          </span>
        </div>

        <div className="flex items-center gap-3 text-xs font-semibold">
          {cantidadPendientes > 0 && (
            <span className="text-amber-600 dark:text-amber-400">
              {cantidadPendientes} {cantidadPendientes === 1 ? "pendiente" : "pendientes"}
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
