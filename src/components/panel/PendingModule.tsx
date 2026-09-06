"use client";

import { useEffect, useState } from "react";
import { formatDateLabel, formatTime } from "@/lib/panelDates";
import { plata } from "@/lib/format";
import { COLOR_ESTADO, type Appointment, type EstadoCita } from "./types";

/**
 * Turnos "sin cerrar": citas de fechas que ya pasaron y siguen en
 * 'confirmada'.
 *
 * En el modelo anterior este módulo listaba turnos 'pending', un estado que ya
 * no existe: las reservas entran confirmadas. El agujero real ahora es el
 * opuesto — que nadie marque qué pasó con el turno. Mientras siga confirmado no
 * entra en la caja ni cuenta para las comisiones, así que la plata del día
 * queda sin registrar. Por eso el módulo empuja a cerrarlos.
 *
 * Se muestra un turno por vez, con flechas para recorrerlos. Antes se apilaban
 * todos en una lista con scroll propio y el contenido de la columna no entraba
 * a lo alto (804 px en 706 disponibles), así que el calendario quedaba fuera de
 * vista. De a uno entra todo sin scroll y además obliga a decidir sobre el
 * turno que se está mirando, que es el punto del módulo.
 *
 * Mismo patrón que el PendingModule de pastalovers, para que los dos paneles se
 * recorran igual.
 */
export function PendingModule({
  appointments,
  onEstado,
  onJump,
}: {
  appointments: Appointment[];
  onEstado: (id: number, estado: EstadoCita) => void;
  onJump: (fecha: string) => void;
}) {
  const [indice, setIndice] = useState(0);
  /** Igual que en la tarjeta: cancelar pregunta el motivo antes de escribir. */
  const [eligiendoMotivo, setEligiendoMotivo] = useState(false);

  // Cerrar un turno lo saca de la lista. Sin esto el índice queda apuntando
  // más allá del final y el módulo se vacía aunque queden turnos atrás.
  useEffect(() => {
    if (indice >= appointments.length) {
      setIndice(Math.max(0, appointments.length - 1));
    }
  }, [appointments.length, indice]);

  // Al pasar a otro turno la pregunta se descarta: si no, se contestaría sobre
  // el turno equivocado.
  useEffect(() => {
    setEligiendoMotivo(false);
  }, [indice, appointments.length]);

  const a = appointments[indice];

  return (
    <div>
      <div className="flex items-center justify-between mb-1 gap-2">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-semibold text-[var(--color-wa-text-main)]">Sin cerrar</h3>
          {appointments.length > 0 && (
            <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-500/20">
              {appointments.length}
            </span>
          )}
        </div>
        {appointments.length > 1 && (
          <div className="flex items-center gap-1">
            <span className="text-xs text-[var(--color-wa-text-sec)] mr-1 font-semibold select-none tabular-nums">
              {indice + 1} de {appointments.length}
            </span>
            <button
              onClick={() => setIndice((i) => (i > 0 ? i - 1 : appointments.length - 1))}
              className="p-1 rounded-lg hover:bg-[var(--color-wa-hover)] text-[var(--color-wa-text-sec)] hover:text-[var(--color-wa-text-main)] cursor-pointer"
              aria-label="Turno anterior"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <button
              onClick={() => setIndice((i) => (i < appointments.length - 1 ? i + 1 : 0))}
              className="p-1 rounded-lg hover:bg-[var(--color-wa-hover)] text-[var(--color-wa-text-sec)] hover:text-[var(--color-wa-text-main)] cursor-pointer"
              aria-label="Turno siguiente"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>
        )}
      </div>
      <p className="text-xs text-[var(--color-wa-text-sec)] mb-3">
        Turnos que ya pasaron y siguen confirmados. Hasta cerrarlos no entran en la caja
        ni en las comisiones.
      </p>
      {!a ? (
        <p className="text-sm text-[var(--color-wa-text-sec)]">
          No quedó ningún turno viejo sin cerrar.
        </p>
      ) : (
        <div className="border border-[var(--color-wa-sep)] rounded-xl p-3 flex flex-col gap-2">
          <span className="text-xs font-semibold text-[var(--color-wa-text-main)] capitalize">
            {formatDateLabel(a.fecha)} · {formatTime(a.hora_inicio)}
          </span>
          <span className="text-sm text-[var(--color-wa-text-main)] font-medium truncate">
            {a.cliente_nombre ?? a.cliente_telefono ?? "Sin nombre"}
          </span>
          <span className="text-xs text-[var(--color-wa-text-sec)] truncate">
            {a.servicio_nombre ?? "Sin servicio"}
            {a.precio_final !== null && ` · ${plata(a.precio_final)}`}
            {` · ${a.profesional_nombre}`}
          </span>
          <div className="flex flex-wrap gap-2 pt-1">
            {eligiendoMotivo ? (
              <>
                <span className="text-xs font-semibold text-[var(--color-wa-text-sec)] self-center">
                  ¿Por qué?
                </span>
                <button
                  onClick={() => onEstado(a.id, "cancelada")}
                  className="text-xs px-3 py-1.5 rounded-full font-semibold text-white active:scale-95 transition-all cursor-pointer"
                  style={{ backgroundColor: COLOR_ESTADO.cancelada }}
                >
                  Canceló
                </button>
                <button
                  onClick={() => onEstado(a.id, "no_show")}
                  className="text-xs px-3 py-1.5 rounded-full font-semibold text-white active:scale-95 transition-all cursor-pointer"
                  style={{ backgroundColor: COLOR_ESTADO.cancelada }}
                >
                  No vino
                </button>
                <button
                  onClick={() => setEligiendoMotivo(false)}
                  className="text-xs px-3 py-1.5 border border-[var(--color-wa-sep)] text-[var(--color-wa-text-sec)] rounded-full font-semibold hover:bg-[var(--color-wa-hover)] active:scale-95 transition-all cursor-pointer"
                  aria-label="Volver sin cancelar"
                >
                  ✕
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={() => onEstado(a.id, "atendida")}
                  className="text-xs px-3 py-1.5 rounded-full font-semibold text-white active:scale-95 transition-all cursor-pointer"
                  style={{ backgroundColor: COLOR_ESTADO.atendida }}
                >
                  Atendido
                </button>
                <button
                  onClick={() => setEligiendoMotivo(true)}
                  className="text-xs px-3 py-1.5 rounded-full font-semibold border active:scale-95 transition-all cursor-pointer"
                  style={{ color: COLOR_ESTADO.cancelada, borderColor: COLOR_ESTADO.cancelada }}
                >
                  Cancelar
                </button>
                <button
                  onClick={() => onJump(a.fecha)}
                  className="text-xs px-3 py-1.5 border border-[var(--color-wa-sep)] text-[var(--color-wa-text-sec)] rounded-full font-semibold hover:bg-[var(--color-wa-hover)] active:scale-95 transition-all cursor-pointer"
                >
                  Ver día
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
