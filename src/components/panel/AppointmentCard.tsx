"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { formatTime } from "@/lib/panelDates";
import { plata, waLink } from "@/lib/format";
import {
  COLOR_ESTADO,
  STATUS_LABELS,
  colorDeEstado,
  esCancelado,
  type Appointment,
  type EstadoCita,
} from "./types";

/**
 * Tarjeta de una cita.
 *
 * "Atendido" no es solo una etiqueta: es lo que carga el ingreso en la caja
 * del día y lo que cuenta para las comisiones del mes, así que el botón está
 * bien a la vista y es la acción primaria de un turno confirmado.
 *
 * Cancelar, en cambio, es una sola acción con dos motivos. No hay un botón
 * "No vino" aparte: se elige el motivo después de pedir la cancelación, en la
 * misma fila. Ver `EstadoVisible` en types.ts.
 */

export function AppointmentCard({
  appointment: a,
  onStatusChange,
  onDelete,
  onEdit,
  highlighted = false,
}: {
  appointment: Appointment;
  onStatusChange: (id: number, estado: EstadoCita) => void;
  onDelete: (id: number) => void;
  onEdit: (appointment: Appointment) => void;
  /** Resalta la tarjeta y hace scroll hasta ella (lo usa el aviso de turno nuevo). */
  highlighted?: boolean;
}) {
  const cardRef = useRef<HTMLDivElement>(null);
  /** Cancelar pide el motivo antes de escribir: acá se está eligiendo. */
  const [eligiendoMotivo, setEligiendoMotivo] = useState(false);

  useEffect(() => {
    if (highlighted) {
      cardRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, [highlighted]);

  // Si la cita cambia de estado por otra vía, la pregunta ya no viene al caso.
  useEffect(() => {
    if (a.estado !== "confirmada") setEligiendoMotivo(false);
  }, [a.estado]);

  const nombre = a.cliente_nombre ?? a.cliente_telefono ?? "Sin nombre";
  const acento = colorDeEstado(a.estado);
  const anulada = esCancelado(a.estado);

  const iniciales =
    nombre
      .split(" ")
      .filter(Boolean)
      .map((n) => n[0])
      .join("")
      .substring(0, 2)
      .toUpperCase() || "?";

  const botonBase =
    "text-xs px-4 py-2 rounded-full font-semibold active:scale-95 transition-all shadow-sm flex items-center gap-1.5 cursor-pointer";

  return (
    <div
      ref={cardRef}
      // El estado, legible desde afuera: es lo que distingue una tarjeta de
      // otra y lo que hay que poder verificar sin adivinar clases de Tailwind.
      data-estado={a.estado}
      className={`relative group flex flex-col md:flex-row md:items-center justify-between gap-3 md:gap-4 p-3 md:p-5 rounded-2xl border border-[var(--color-wa-sep)] bg-[var(--color-wa-panel-l)] animate-in shadow-[var(--shadow-card)] hover:shadow-[var(--shadow-card-hover)] hover:-translate-y-0.5 transition-all duration-200 overflow-hidden ${
        highlighted
          ? "ring-2 ring-[var(--color-wa-green)] ring-offset-2 ring-offset-[var(--color-wa-bg-main)]"
          : ""
      } ${anulada ? "opacity-70" : ""}`}
    >
      <div
        className="absolute left-0 top-0 bottom-0 w-1.5 rounded-r-md"
        style={{ backgroundColor: acento }}
      />

      <div className="flex items-center gap-3.5 min-w-0 pl-1.5 md:pl-2.5">
        <div className="hidden md:flex flex-col text-right pr-4 border-r border-[var(--color-wa-sep)] min-w-[75px] flex-shrink-0">
          <span className="tnum text-base font-bold text-[var(--color-wa-text-main)]">
            {formatTime(a.hora_inicio)}
          </span>
          <span className="tnum text-xs text-[var(--color-wa-text-sec)]">
            {formatTime(a.hora_fin)}
          </span>
        </div>

        <div
          className="flex-shrink-0 w-11 h-11 rounded-full flex items-center justify-center text-sm font-bold text-white shadow-inner select-none"
          style={{ backgroundColor: acento }}
        >
          {iniciales}
        </div>

        <div className="min-w-0">
          <div className="flex md:hidden items-center gap-2 mb-1.5">
            <span className="tnum text-[11px] font-bold text-[var(--color-wa-text-main)] bg-[var(--color-wa-input)] border border-[var(--color-wa-sep)] py-0.5 px-2 rounded-full">
              {formatTime(a.hora_inicio)} - {formatTime(a.hora_fin)}
            </span>
          </div>

          <h3 className="text-base font-bold text-[var(--color-wa-text-main)] leading-tight">
            {nombre}
          </h3>

          {a.servicio_nombre && (
            <p className="text-sm font-medium text-[var(--color-wa-text-sec)] mt-1 truncate flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-wa-text-sec)] opacity-60" />
              {a.servicio_nombre}
              {a.precio_final !== null && (
                <span className="tnum font-semibold text-[var(--color-wa-text-main)]">
                  · {plata(a.precio_final)}
                </span>
              )}
              {a.descuento_id !== null && (
                <span
                  className="text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded"
                  style={{ color: "var(--color-wa-green)", border: "1px solid var(--color-wa-green)" }}
                >
                  con descuento
                </span>
              )}
            </p>
          )}

          <div className="flex flex-wrap items-center gap-y-1 gap-x-2 mt-2 text-xs text-[var(--color-wa-text-sec)]">
            <span className="font-semibold text-[var(--color-wa-text-main)]">
              {a.origen === "bot" ? "Bot" : a.origen === "web" ? "Web" : "Manual"}
            </span>

            <span className="opacity-40 select-none">·</span>

            <span>
              Estado:{" "}
              <span className="font-bold" style={{ color: acento }}>
                {STATUS_LABELS[a.estado]}
              </span>
            </span>

            <span className="opacity-40 select-none">·</span>
            <span>
              Atiende:{" "}
              <span className="font-semibold text-[var(--color-wa-text-main)]">
                {a.profesional_nombre}
              </span>
            </span>

            {a.cliente_telefono && (
              <>
                <span className="opacity-40 select-none">·</span>
                <a
                  href={`tel:${a.cliente_telefono}`}
                  className="tnum hover:text-[var(--color-wa-green-dark)] transition-colors"
                >
                  {a.cliente_telefono}
                </a>
              </>
            )}
          </div>
        </div>
      </div>

      <div className="flex-1 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 md:px-4 min-w-0">
        {a.notas ? (
          <div className="bg-[var(--color-wa-input)] border border-[var(--color-wa-sep)] p-3 rounded-xl text-xs italic text-[var(--color-wa-text-sec)] md:max-w-[280px] lg:max-w-[360px] w-full md:mx-auto">
            <span className="font-semibold not-italic block text-[10px] uppercase tracking-wider mb-0.5">
              Nota interna
            </span>
            <span className="line-clamp-2 md:line-clamp-3">{a.notas}</span>
          </div>
        ) : (
          <div className="hidden md:block flex-1" />
        )}
      </div>

      {/* Sin flex-shrink-0: con varios botones la barra tiene que poder ceder y
          envolver, o comprime el nombre del cliente hasta partirlo. */}
      <div className="flex items-center justify-between md:justify-end border-t md:border-t-0 border-[var(--color-wa-sep)] pt-3.5 md:pt-0 mt-1 md:mt-0 gap-2.5">
        <div className="flex items-center gap-2 flex-wrap justify-end">
          {a.estado === "confirmada" && !eligiendoMotivo && (
            <>
              <button
                onClick={() => onStatusChange(a.id, "atendida")}
                className={botonBase}
                style={{ backgroundColor: COLOR_ESTADO.atendida, color: "#FFFFFF" }}
                title="Marca la cita como atendida y la carga en la caja del día"
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
                Atendido
              </button>
              <button
                onClick={() => setEligiendoMotivo(true)}
                className={`${botonBase} border`}
                style={{ color: COLOR_ESTADO.cancelada, borderColor: COLOR_ESTADO.cancelada }}
                title="Cancelar el turno: después se elige el motivo"
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
                <span className="lg:hidden">Cancelar</span>
                <span className="hidden lg:inline">Cancelar turno</span>
              </button>
            </>
          )}

          {/* El motivo, en la misma fila. Los dos botones escriben un estado
              cancelado; lo único que cambia es cuál de los dos motivos queda
              guardado, que es lo que después se puede contar por cliente. */}
          {a.estado === "confirmada" && eligiendoMotivo && (
            <>
              <span className="text-xs font-semibold text-[var(--color-wa-text-sec)]">
                ¿Por qué?
              </span>
              <button
                onClick={() => onStatusChange(a.id, "cancelada")}
                className={botonBase}
                style={{ backgroundColor: COLOR_ESTADO.cancelada, color: "#FFFFFF" }}
                title="El turno se canceló con aviso"
              >
                Canceló
              </button>
              <button
                onClick={() => onStatusChange(a.id, "no_show")}
                className={botonBase}
                style={{ backgroundColor: COLOR_ESTADO.cancelada, color: "#FFFFFF" }}
                title="El cliente no se presentó"
              >
                No vino
              </button>
              <button
                onClick={() => setEligiendoMotivo(false)}
                className={`${botonBase} border border-[var(--color-wa-sep)] text-[var(--color-wa-text-sec)] hover:bg-[var(--color-wa-hover)]`}
                aria-label="Volver sin cancelar"
                title="Volver sin cancelar"
              >
                ✕
              </button>
            </>
          )}

          {/* 'pendiente' es la extension propia de Bandito (ver types.ts):
              turnos migrados que Sol nunca llego a confirmar. No es lo mismo
              que reactivar algo cancelado, asi que tiene su propio par de
              botones en vez de caer en el "Reactivar" generico de abajo. */}
          {a.estado === "pendiente" && (
            <>
              <button
                onClick={() => onStatusChange(a.id, "confirmada")}
                className={botonBase}
                style={{ backgroundColor: COLOR_ESTADO.confirmada, color: "#FFFFFF" }}
                title="Confirmar este turno"
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
                Confirmar
              </button>
              <button
                onClick={() => onStatusChange(a.id, "cancelada")}
                className={`${botonBase} border`}
                style={{ color: COLOR_ESTADO.cancelada, borderColor: COLOR_ESTADO.cancelada }}
                title="Cancelar este turno"
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
                Cancelar
              </button>
            </>
          )}

          {a.estado !== "confirmada" && a.estado !== "pendiente" && (
            <button
              onClick={() => onStatusChange(a.id, "confirmada")}
              className={`${botonBase} border border-[var(--color-wa-sep)] text-[var(--color-wa-text-sec)] hover:bg-[var(--color-wa-hover)]`}
              title="Vuelve la cita a confirmada"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 1121.21 8H18.2" />
              </svg>
              Reactivar
            </button>
          )}

          <button
            onClick={() => onEdit(a)}
            className={`${botonBase} border border-[var(--color-wa-sep)] text-[var(--color-wa-text-main)] hover:bg-[var(--color-wa-hover)]`}
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
            <span className="hidden lg:inline">Editar</span>
          </button>

          {a.cliente_telefono && (
            <a
              href={waLink(a.cliente_telefono)}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs px-3 lg:px-4 py-2 rounded-full bg-[#25D366]/10 text-[#25D366] hover:bg-[#25D366] hover:text-white active:scale-95 transition-all flex items-center gap-1.5 font-bold"
              title={`Escribir a ${a.cliente_telefono} por WhatsApp`}
            >
              <svg viewBox="0 0 24 24" fill="currentColor" className="w-3.5 h-3.5">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51a12.8 12.8 0 0 0-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413Z" />
              </svg>
              <span className="hidden lg:inline">WhatsApp</span>
            </a>
          )}

          {/* Conversación guardada en el panel. Solo existe para citas que
              vinieron del bot; se mantiene por si se enciende. */}
          {a.conversation_id !== null && (
            <Link
              href={`/messages?id=${a.conversation_id}`}
              className="text-xs px-4 py-2 rounded-full border border-[var(--color-wa-sep)] text-[var(--color-wa-text-sec)] hover:bg-[var(--color-wa-hover)] hover:text-[var(--color-wa-text-main)] active:scale-95 transition-all flex items-center gap-1.5 font-semibold"
              title="Ver la conversación en el panel"
            >
              Ver chat
            </Link>
          )}
        </div>

        <button
          onClick={() => onDelete(a.id)}
          className="text-xs p-2 rounded-full hover:bg-[var(--color-wa-hover)] active:scale-90 transition-all cursor-pointer flex-shrink-0"
          style={{ color: "var(--color-wa-error)" }}
          title="Eliminar turno"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
        </button>
      </div>
    </div>
  );
}
