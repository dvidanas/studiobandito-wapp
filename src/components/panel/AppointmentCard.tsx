"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import { formatTime, hoyArgentinaStr } from "@/lib/panelDates";
import { STATUS_LABELS, STATUS_STYLES, type Appointment } from "./types";

/**
 * Link directo al chat de WhatsApp del cliente.
 * Los teléfonos se guardan sin código de país ("2646123456"), así que se
 * antepone el 54 de Argentina salvo que el número ya lo traiga.
 */
function waLink(telefono: string): string {
  const digitos = telefono.replace(/\D/g, "");
  return `https://wa.me/${digitos.startsWith("54") ? digitos : "54" + digitos}`;
}

export function AppointmentCard({
  appointment: a,
  onStatusChange,
  onDelete,
  onEdit,
  onTogglePresente,
  highlighted = false,
}: {
  appointment: Appointment;
  onStatusChange: (id: number, status: Appointment["status"]) => void;
  onDelete: (id: number) => void;
  onEdit: (appointment: Appointment) => void;
  onTogglePresente: (id: number, presente: boolean) => void;
  /** Resalta la tarjeta y hace scroll hasta ella (lo usa el aviso de turno nuevo). */
  highlighted?: boolean;
}) {
  const cardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (highlighted) {
      cardRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, [highlighted]);

  const name = a.contact_name ?? a.contact_phone ?? "Sin nombre";
  const presente = !!a.presente;
  // Igual que en Pasta: solo tiene sentido marcar presente a alguien que tiene
  // turno confirmado y es hoy. En otro día el botón sería un registro falso.
  const mostrarBotonPresente = a.status === "confirmed" && a.date === hoyArgentinaStr();
  const accentColor = a.status === "pending" ? "#F59E0B" : a.status === "confirmed" ? "#2DD4BF" : "#EF4444";

  // Compute initials for the avatar
  const initials = name
    .split(" ")
    .filter(Boolean)
    .map((n) => n[0])
    .join("")
    .substring(0, 2)
    .toUpperCase() || "?";

  return (
    <div
      ref={cardRef}
      className={`relative group flex flex-col md:flex-row md:items-center justify-between gap-4 p-4 md:p-5 rounded-2xl border bg-[var(--color-wa-panel-l)] animate-in shadow-[var(--shadow-card)] hover:shadow-[var(--shadow-card-hover)] hover:-translate-y-0.5 transition-all duration-200 overflow-hidden ${
        highlighted ? "ring-2 ring-teal-500 ring-offset-2 ring-offset-[var(--color-wa-bg-main)]" : ""
      } ${
        a.status === "cancelled" 
          ? "border-[var(--color-wa-sep)] dark:border-red-500/25"
          : a.status === "confirmed"
            ? "border-[var(--color-wa-sep)] dark:border-teal-500/25"
            : "border-[var(--color-wa-sep)] dark:border-amber-500/25"
      }`}
    >
      {/* Left indicator bar */}
      <div 
        className="absolute left-0 top-0 bottom-0 w-1.5 rounded-r-md" 
        style={{ backgroundColor: accentColor }}
      />

      {/* LEFT SECTION: Time (desktop only), Avatar, and Client/Service details */}
      <div className="flex items-center gap-3.5 min-w-0 pl-1.5 md:pl-2.5">
        {/* Time (Desktop only) */}
        <div className="hidden md:flex flex-col text-right pr-4 border-r border-[var(--color-wa-sep)] min-w-[75px] flex-shrink-0">
          <span className="text-base font-bold text-[var(--color-wa-text-main)]">{formatTime(a.time_start)}</span>
          <span className="text-xs text-[var(--color-wa-text-sec)]">{formatTime(a.time_end)}</span>
        </div>

        {/* Initials Avatar */}
        <div 
          className="flex-shrink-0 w-11 h-11 rounded-full flex items-center justify-center text-sm font-bold text-white shadow-inner select-none"
          style={{ 
            background: a.status === "cancelled" 
              ? "var(--color-wa-sep)" 
              : a.status === "pending" 
                ? "linear-gradient(135deg, #FBBF24, #F59E0B)" 
                : "linear-gradient(135deg, #2DD4BF, #0D9488)"
          }}
        >
          {initials}
        </div>

        {/* Details */}
        <div className="min-w-0">
          {/* Mobile Time (Mobile only) */}
          <div className="flex md:hidden items-center gap-2 mb-1.5">
            <div className="flex items-center gap-1 bg-slate-50 dark:bg-slate-900/30 border border-slate-100 dark:border-slate-800 py-0.5 px-2 rounded-full">
              <span className="text-[11px] font-bold text-[var(--color-wa-text-main)]">
                {formatTime(a.time_start)} - {formatTime(a.time_end)}
              </span>
            </div>
          </div>

          <h3 className="text-base font-bold text-[var(--color-wa-text-main)] leading-tight">
            {name}
          </h3>
          
          {a.service && (
            <p className="text-sm font-medium text-[var(--color-wa-text-sec)] mt-1 truncate flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-wa-text-sec)] opacity-60" />
              {a.service}
            </p>
          )}

          {/* Consolidated metadata line (Origin, Status, Staff, Phone) */}
          <div className="flex flex-wrap items-center gap-y-1 gap-x-2 mt-2 text-xs text-[var(--color-wa-text-sec)]">
            <span className="flex items-center gap-0.5">
              {a.source === "bot" ? (
                <svg className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9h14v10H5V9zm3 4h.01M16 13h.01" />
                </svg>
              ) : a.source === "web" ? (
                <svg className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <circle cx="12" cy="12" r="9" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 12h18M12 3c2.5 2.7 4 6.5 4 9s-1.5 6.3-4 9c-2.5-2.7-4-6.5-4-9s1.5-6.3 4-9z" />
                </svg>
              ) : (
                <svg className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              )}
              <span className="font-semibold text-[var(--color-wa-text-main)]">
                {a.source === "bot" ? "Bot" : a.source === "web" ? "Web" : "Manual"}
              </span>
            </span>

            <span className="opacity-40 select-none">·</span>

            <span className="flex items-center gap-0.5">
              <svg className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9.568 3H5.25A2.25 2.25 0 003 5.25v4.318c0 .597.237 1.17.659 1.591l9.581 9.581a1.44 1.44 0 002.036 0l4.319-4.32a1.44 1.44 0 000-2.037L11.16 3.66A2.25 2.25 0 009.568 3z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 6h.008v.008H6V6z" />
              </svg>
              <span>
                Estado:{" "}
                <span className={`font-bold ${
                  a.status === "confirmed" 
                    ? "text-teal-500 dark:text-teal-400" 
                    : a.status === "pending" 
                      ? "text-amber-500 dark:text-amber-400" 
                      : "text-red-500 dark:text-red-400"
                }`}>
                  {STATUS_LABELS[a.status]}
                </span>
              </span>
            </span>

            {a.resource_name && (
              <>
                <span className="opacity-40 select-none">·</span>
                <span className="flex items-center gap-0.5">
                  <svg className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                  Atiende: <span className="font-semibold text-[var(--color-wa-text-main)]">{a.resource_name}</span>
                </span>
              </>
            )}

            {a.contact_phone && a.contact_name && (
              <>
                <span className="opacity-40 select-none">·</span>
                <a 
                  href={`tel:${a.contact_phone}`} 
                  className="flex items-center gap-0.5 hover:text-[var(--color-wa-green-dark)] transition-colors"
                >
                  <svg className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.94.725l.548 2.2a1 1 0 01-.321.988l-1.305.98a10.582 10.582 0 004.872 4.872l.98-1.305a1 1 0 01.988-.321l2.2.548a1 1 0 01.725.94V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                  </svg>
                  <span>{a.contact_phone}</span>
                </a>
              </>
            )}
          </div>
        </div>
      </div>

      {/* MIDDLE SECTION: Notes (if any) */}
      <div className="flex-1 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 md:px-4 min-w-0">
        {/* Notes */}
        {a.notes ? (
          <div className="bg-slate-50 dark:bg-slate-900/40 border border-slate-100 dark:border-slate-800/80 p-3 rounded-xl text-xs italic text-[var(--color-wa-text-sec)] md:max-w-[280px] lg:max-w-[360px] xl:max-w-[450px] w-full md:mx-auto">
            <span className="font-semibold not-italic block text-[10px] uppercase tracking-wider text-slate-400 mb-0.5">Nota interna:</span>
            <span className="line-clamp-2 md:line-clamp-3">"{a.notes}"</span>
          </div>
        ) : (
          <div className="hidden md:block flex-1" /> // spacer
        )}
      </div>

      {/* RIGHT SECTION: Actions Bar */}
      {/* Sin flex-shrink-0: con cuatro botones (turno pendiente) la barra tiene que
          poder ceder y envolver, o comprime el nombre del cliente hasta partirlo. */}
      <div className="flex items-center justify-between md:justify-end border-t md:border-t-0 border-[var(--color-wa-sep)] pt-3.5 md:pt-0 mt-1 md:mt-0 gap-2.5">
        {/* Main Action Buttons */}
        <div className="flex items-center gap-2 flex-wrap justify-end">
          {mostrarBotonPresente && (
            <button
              onClick={() => onTogglePresente(a.id, !presente)}
              className={`text-xs px-4 py-2 rounded-full font-semibold active:scale-95 transition-all shadow-sm flex items-center gap-1.5 cursor-pointer ${
                presente
                  ? "bg-emerald-500 text-white hover:bg-emerald-600"
                  : "border border-emerald-500/40 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/10"
              }`}
              title={presente ? "Desmarcar presente" : "Marcar presente"}
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
              {presente ? "Presente" : "Marcar presente"}
            </button>
          )}

          {a.status === "pending" && (
            <button
              onClick={() => onStatusChange(a.id, "confirmed")}
              className="text-xs px-4 py-2 bg-teal-500 text-white rounded-full font-semibold hover:bg-teal-600 active:scale-95 transition-all shadow-sm flex items-center gap-1.5 cursor-pointer"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
              Confirmar
            </button>
          )}
          {a.status === "confirmed" && (
            <button
              onClick={() => onStatusChange(a.id, "cancelled")}
              className="text-xs px-4 py-2 bg-red-500 text-white rounded-full font-semibold hover:bg-red-600 active:scale-95 transition-all shadow-sm flex items-center gap-1.5 cursor-pointer"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
              <span className="lg:hidden">Cancelar</span><span className="hidden lg:inline">Cancelar turno</span>
            </button>
          )}
          {a.status === "pending" && (
            <button
              onClick={() => onStatusChange(a.id, "cancelled")}
              className="text-xs px-4 py-2 bg-red-500 text-white rounded-full font-semibold hover:bg-red-600 active:scale-95 transition-all shadow-sm flex items-center gap-1.5 cursor-pointer"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
              Rechazar
            </button>
          )}
          {a.status === "cancelled" && (
            <button
              onClick={() => onStatusChange(a.id, "pending")}
              className="text-xs px-4 py-2 border border-[var(--color-wa-sep)] text-[var(--color-wa-text-sec)] rounded-full font-semibold hover:bg-[var(--color-wa-hover)] active:scale-95 transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 1121.21 8H18.2" />
              </svg>
              Reactivar
            </button>
          )}

          {/* Edit Action Button */}
          <button
            onClick={() => onEdit(a)}
            className="text-xs px-3 lg:px-4 py-2 bg-amber-500 text-white rounded-full font-semibold hover:bg-amber-600 active:scale-95 transition-all shadow-sm flex items-center gap-1.5 cursor-pointer"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
            <span className="hidden lg:inline">Editar</span>
          </button>

          {/* Escribirle por WhatsApp, con el mismo teléfono que muestra la tarjeta */}
          {a.contact_phone && (
            <a
              href={waLink(a.contact_phone)}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs px-3 lg:px-4 py-2 rounded-full bg-[#25D366]/10 text-[#25D366] hover:bg-[#25D366] hover:text-white active:scale-95 transition-all flex items-center gap-1.5 font-bold"
              title={`Escribir a ${a.contact_phone} por WhatsApp`}
            >
              <svg viewBox="0 0 24 24" fill="currentColor" className="w-3.5 h-3.5">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51a12.8 12.8 0 0 0-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413Z"/>
              </svg>
              <span className="hidden lg:inline">WhatsApp</span>
            </a>
          )}

          {/* Conversación guardada en el panel. Solo existe para turnos que vinieron
              del bot; se mantiene por si vuelve a activarse. */}
          {a.conversation_id !== null && (
            <Link
              href={`/messages?id=${a.conversation_id}`}
              className="text-xs px-4 py-2 rounded-full border border-[var(--color-wa-sep)] text-[var(--color-wa-text-sec)] hover:bg-[var(--color-wa-hover)] hover:text-[var(--color-wa-text-main)] active:scale-95 transition-all flex items-center gap-1.5 font-semibold"
              title="Ver la conversación en el panel"
            >
              <svg viewBox="0 0 24 24" fill="currentColor" className="w-3.5 h-3.5">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51a12.8 12.8 0 0 0-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413Z"/>
              </svg>
              Ver chat
            </Link>
          )}
        </div>

        {/* Delete Action button */}
        <button
          onClick={() => onDelete(a.id)}
          className="text-xs p-2 rounded-full text-red-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/20 active:scale-90 transition-all cursor-pointer flex-shrink-0"
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
