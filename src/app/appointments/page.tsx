"use client";
import { useState, useEffect, useCallback, useMemo } from "react";
import Link from "next/link";
import { TopNav, BottomNav } from "@/components/TopNav";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { PullToRefresh } from "@/components/PullToRefresh";

interface Appointment {
  id: number;
  resource_id: number;
  resource_name: string;
  conversation_id: number | null;
  service: string | null;
  date: string;
  time_start: string;
  time_end: string;
  duration_minutes: number;
  status: "pending" | "confirmed" | "cancelled";
  source: "manual" | "bot";
  notes: string | null;
  contact_name: string | null;
  contact_phone: string | null;
  created_at: number;
}

interface Resource {
  id: number;
  name: string;
  active: number;
}

interface AvailableSlot {
  resource_id: number;
  resource_name: string;
  time_start: string;
  time_end: string;
}

interface Stats {
  pending: number;
  confirmed: number;
  cancelled: number;
}

const STATUS_STYLES = {
  pending: "bg-amber-400 text-[#141d37]",
  confirmed: "bg-teal-400 text-teal-950",
  cancelled: "bg-[var(--color-wa-sep)] text-[var(--color-wa-text-sec)]",
};
const STATUS_LABELS = { pending: "Pendiente", confirmed: "Confirmado", cancelled: "Cancelado" };

const MONTH_NAMES = ["Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"];
const DAY_HEADERS = ["D","L","M","M","J","V","S"];
const DAY_NAMES_FULL = ["Domingo","Lunes","Martes","Miércoles","Jueves","Viernes","Sábado"];

function dateToStr(d: Date): string {
  return d.toISOString().slice(0, 10);
}
function formatTime(t: string): string {
  return t.slice(0, 5);
}
function formatDateLabel(str: string): string {
  const d = new Date(str + "T12:00:00Z");
  const day = DAY_NAMES_FULL[d.getUTCDay()];
  const num = d.getUTCDate();
  const month = MONTH_NAMES[d.getUTCMonth()].toLowerCase();
  return `${day} ${num} de ${month}`;
}
function getMonthBounds(date: Date): { from: string; to: string } {
  const y = date.getFullYear();
  const m = date.getMonth();
  return {
    from: dateToStr(new Date(y, m, 1)),
    to: dateToStr(new Date(y, m + 1, 0)),
  };
}

// ── Mini Calendar ──────────────────────────────────────────────────────────────

function MiniCalendar({
  currentMonth,
  selectedDay,
  appointmentDays,
  onSelectDay,
  onPrevMonth,
  onNextMonth,
  compact = false,
}: {
  currentMonth: Date;
  selectedDay: string;
  appointmentDays: Set<string>;
  onSelectDay: (day: string) => void;
  onPrevMonth: () => void;
  onNextMonth: () => void;
  compact?: boolean;
}) {
  const [isExpanded, setIsExpanded] = useState(false);
  const today = dateToStr(new Date());
  const y = currentMonth.getFullYear();
  const m = currentMonth.getMonth();
  const startDow = new Date(y, m, 1).getDay();
  const daysInMonth = new Date(y, m + 1, 0).getDate();

  const cells: (string | null)[] = [];
  for (let i = 0; i < startDow; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(dateToStr(new Date(y, m, d)));
  while (cells.length % 7 !== 0) cells.push(null);

  const weeks: (string | null)[][] = [];
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));

  // Find active week index (week containing selectedDay)
  let activeWeekIndex = weeks.findIndex((week) => week.includes(selectedDay));
  if (activeWeekIndex === -1) {
    const todayStr = dateToStr(new Date());
    activeWeekIndex = weeks.findIndex((week) => week.includes(todayStr));
  }
  if (activeWeekIndex === -1) {
    activeWeekIndex = 0;
  }

  const visibleWeeks = compact && !isExpanded ? [weeks[activeWeekIndex]] : weeks;

  return (
    <div className="flex flex-col gap-2">
      {/* Month nav */}
      <div className="flex items-center justify-between mb-1">
        <button
          onClick={onPrevMonth}
          className="p-1.5 rounded-lg hover:bg-[var(--color-wa-hover)] transition-colors"
        >
          <svg className="w-4 h-4 text-[var(--color-wa-text-sec)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <span className="text-sm font-semibold text-[var(--color-wa-text-main)]">
          {MONTH_NAMES[m]} {y}
        </span>
        <button
          onClick={onNextMonth}
          className="p-1.5 rounded-lg hover:bg-[var(--color-wa-hover)] transition-colors"
        >
          <svg className="w-4 h-4 text-[var(--color-wa-text-sec)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>

      {/* Day headers */}
      <div className="grid grid-cols-7">
        {DAY_HEADERS.map((d, i) => (
          <div key={i} className="text-center text-[10px] font-semibold text-[var(--color-wa-text-sec)] uppercase py-1">
            {d}
          </div>
        ))}
      </div>

      {/* Weeks */}
      <div className="flex flex-col gap-1">
        {visibleWeeks.map((week, wi) => (
          <div key={week.find(Boolean) ?? wi} className="grid grid-cols-7 gap-0.5">
            {week.map((dayStr, di) => {
              if (!dayStr) return <div key={di} />;
              const isToday = dayStr === today;
              const isSelected = dayStr === selectedDay;
              const hasDot = appointmentDays.has(dayStr);
              const dayNum = new Date(dayStr + "T12:00:00Z").getUTCDate();
              return (
                <button
                  key={di}
                  onClick={() => onSelectDay(dayStr)}
                  className={`relative flex flex-col items-center justify-center w-8 h-8 mx-auto rounded-full transition-all ${
                    compact ? "text-xs" : "text-sm"
                  } font-medium ${
                    isSelected
                      ? "bg-[#6ea8fe] text-white shadow-sm"
                      : isToday
                      ? "border-[1.5px] border-[var(--color-wa-green)] text-[var(--color-wa-green)] font-bold"
                      : "text-[var(--color-wa-text-main)] hover:bg-[var(--color-wa-hover)]"
                  }`}
                >
                  {dayNum}
                  {hasDot && !isSelected && (
                    <span className="absolute bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-blue-300" />
                  )}
                </button>
              );
            })}
          </div>
        ))}
      </div>

      {/* Legend — only on desktop */}
      {!compact && (
        <div className="flex gap-4 pt-3 mt-1 border-t border-[var(--color-wa-sep)] flex-wrap">
          <div className="flex items-center gap-2 text-xs text-[var(--color-wa-text-sec)]">
            <span className="w-2 h-2 rounded-full bg-blue-300" />
            Tiene turnos
          </div>
          <div className="flex items-center gap-2 text-xs text-[var(--color-wa-text-sec)]">
            <span className="w-4 h-4 rounded-full bg-[#6ea8fe] flex items-center justify-center">
              <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </span>
            Seleccionado
          </div>
          <div className="flex items-center gap-2 text-xs text-[var(--color-wa-text-sec)]">
            <span className="w-4 h-4 rounded-full border-[1.5px] border-[var(--color-wa-green)] flex items-center justify-center"></span>
            Hoy
          </div>
        </div>
      )}

      {/* Bottom toggle button (only in compact/mobile mode) */}
      {compact && (
        <div className="flex justify-center pt-2 mt-1 border-t border-[var(--color-wa-sep)]/60">
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="flex items-center gap-1 text-xs font-semibold text-[var(--color-wa-green)] hover:text-[var(--color-wa-green-dark)] transition-colors py-0.5 px-3 rounded-full bg-[var(--color-wa-hover)] cursor-pointer"
          >
            <span>{isExpanded ? "Ver menos" : "Ver mes completo"}</span>
            <svg
              className={`w-3.5 h-3.5 transition-transform duration-200 ${isExpanded ? "rotate-180" : ""}`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2.5}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
            </svg>
          </button>
        </div>
      )}
    </div>
  );
}

// ── Day Appointment Card ───────────────────────────────────────────────────────

function DayAppointmentCard({
  appointment: a,
  onStatusChange,
  onDelete,
  onEdit,
}: {
  appointment: Appointment;
  onStatusChange: (id: number, status: Appointment["status"]) => void;
  onDelete: (id: number) => void;
  onEdit: (appointment: Appointment) => void;
}) {
  const name = a.contact_name ?? a.contact_phone ?? "Sin nombre";
  const accentColor = a.status === "pending" ? "#F59E0B" : a.status === "confirmed" ? "#2DD4BF" : "var(--color-wa-sep)";

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
      className={`relative flex flex-col md:flex-row md:items-center justify-between gap-4 p-4 md:p-5 rounded-2xl border bg-[var(--color-wa-panel-l)] animate-in shadow-[var(--shadow-card)] hover:shadow-[var(--shadow-card-hover)] transition-all duration-200 overflow-hidden ${
        a.status === "cancelled" 
          ? "opacity-50 bg-slate-50/50 dark:bg-black/25 border-red-500/20 dark:border-red-500/30" 
          : "border-[var(--color-wa-sep)]"
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
              ) : (
                <svg className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              )}
              <span className="font-semibold text-[var(--color-wa-text-main)]">
                {a.source === "bot" ? "Bot" : "Manual"}
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
      <div className="flex items-center justify-between md:justify-end border-t md:border-t-0 border-[var(--color-wa-sep)] pt-3.5 md:pt-0 mt-1 md:mt-0 gap-2.5 flex-shrink-0">
        {/* Main Action Buttons */}
        <div className="flex items-center gap-2 flex-wrap">
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
              Cancelar Turno
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
            className="text-xs px-4 py-2 bg-amber-500 text-white rounded-full font-semibold hover:bg-amber-600 active:scale-95 transition-all shadow-sm flex items-center gap-1.5 cursor-pointer"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
            Editar
          </button>

          {/* Chat WhatsApp Link */}
          {a.conversation_id !== null && (
            <Link
              href={`/?id=${a.conversation_id}`}
              className="text-xs px-4 py-2 rounded-full border border-[#25D366] text-[#25D366] hover:bg-[#25D366] hover:text-white active:scale-95 transition-all flex items-center gap-1.5 font-semibold"
              title="Ir al chat de WhatsApp"
            >
              <svg viewBox="0 0 24 24" fill="currentColor" className="w-3.5 h-3.5">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51a12.8 12.8 0 0 0-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413Z"/>
              </svg>
              WhatsApp
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

// ── Day Panel ──────────────────────────────────────────────────────────────────

function DayPanel({
  selectedDay,
  appointments,
  loading,
  onAdd,
  onStatusChange,
  onDelete,
  onEdit,
}: {
  selectedDay: string;
  appointments: Appointment[];
  loading: boolean;
  onAdd: () => void;
  onStatusChange: (id: number, status: Appointment["status"]) => void;
  onDelete: (id: number) => void;
  onEdit: (appointment: Appointment) => void;
}) {
  const label = formatDateLabel(selectedDay);
  const count = appointments.length;

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Day header */}
      <div className="px-4 py-3 flex items-center justify-between border-b border-[var(--color-wa-sep)] flex-shrink-0">
        <div>
          <h2 className="text-base font-semibold text-[var(--color-wa-text-main)] capitalize">{label}</h2>
          <p className="text-sm text-[var(--color-wa-text-sec)]">
            {count === 0 ? "Sin turnos" : `${count} turno${count !== 1 ? "s" : ""}`}
          </p>
        </div>
        <button
          onClick={onAdd}
          className="text-sm font-semibold text-[var(--color-wa-green)] hover:underline"
        >
          + Agregar
        </button>
      </div>

      {/* Appointments */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {loading ? (
          <div className="space-y-3">
            {[1, 2].map((i) => (
              <div key={i} className="h-20 rounded-xl bg-[var(--color-wa-sep)] animate-pulse" />
            ))}
          </div>
        ) : count === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <svg className="w-12 h-12 text-[var(--color-wa-text-sec)] opacity-20 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <p className="text-base text-[var(--color-wa-text-sec)]">Sin turnos este día</p>
            <button
              onClick={onAdd}
              className="mt-3 text-sm text-[var(--color-wa-green)] font-semibold hover:underline"
            >
              + Agregar turno
            </button>
          </div>
        ) : (
          appointments.map((a) => (
            <DayAppointmentCard
              key={a.id}
              appointment={a}
              onStatusChange={onStatusChange}
              onDelete={onDelete}
              onEdit={onEdit}
            />
          ))
        )}
      </div>
    </div>
  );
}

// ── Lista View ─────────────────────────────────────────────────────────────────

function ListaView({
  appointments,
  loading,
  onStatusChange,
  onDelete,
  onEdit,
}: {
  appointments: Appointment[];
  loading: boolean;
  onStatusChange: (id: number, status: Appointment["status"]) => void;
  onDelete: (id: number) => void;
  onEdit: (appointment: Appointment) => void;
}) {
  const grouped = useMemo(() => {
    const g: Record<string, Appointment[]> = {};
    for (const a of appointments) {
      if (!g[a.date]) g[a.date] = [];
      g[a.date].push(a);
    }
    return Object.entries(g).sort(([a], [b]) => a.localeCompare(b));
  }, [appointments]);

  if (loading) {
    return (
      <div className="flex-1 p-4 space-y-4 overflow-y-auto">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-16 rounded-xl bg-[var(--color-wa-sep)] animate-pulse" />
        ))}
      </div>
    );
  }

  if (grouped.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <p className="text-[var(--color-wa-text-sec)]">Sin turnos este mes</p>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-6">
      {grouped.map(([date, appts]) => (
        <div key={date}>
          <p className="text-xs font-semibold text-[var(--color-wa-text-sec)] mb-2 uppercase tracking-widest">
            {formatDateLabel(date)}
          </p>
          <div className="space-y-2">
            {appts.map((a) => (
              <DayAppointmentCard
                key={a.id}
                appointment={a}
                onStatusChange={onStatusChange}
                onDelete={onDelete}
                onEdit={onEdit}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Page ───────────────────────────────────────────────────────────────────────

export default function AppointmentsPage() {
  const [viewMode, setViewMode] = useState<"calendar" | "lista">("calendar");
  const [currentMonth, setCurrentMonth] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });
  const [selectedDay, setSelectedDay] = useState(() => dateToStr(new Date()));
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [resources, setResources] = useState<Resource[]>([]);
  const [stats, setStats] = useState<Stats>({ pending: 0, confirmed: 0, cancelled: 0 });
  const [loading, setLoading] = useState(true);

  const [showModal, setShowModal] = useState(false);
  const [editingAppointment, setEditingAppointment] = useState<Appointment | null>(null);
  const [modalDate, setModalDate] = useState("");
  const [modalResource, setModalResource] = useState<number>(0);
  const [modalSlots, setModalSlots] = useState<AvailableSlot[]>([]);
  const [modalSlot, setModalSlot] = useState("");
  const [modalService, setModalService] = useState("");
  const [modalName, setModalName] = useState("");
  const [modalPhone, setModalPhone] = useState("");
  const [modalNotes, setModalNotes] = useState("");
  const [modalDuration, setModalDuration] = useState(30);
  const [savingModal, setSavingModal] = useState(false);
  const [deleteId, setDeleteId] = useState<number | null>(null);

  const { from, to } = useMemo(() => getMonthBounds(currentMonth), [currentMonth]);

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch(`/api/appointments?from=${from}&to=${to}`);
      if (res.ok) {
        const data = await res.json();
        setAppointments(data.appointments ?? []);
        setStats(data.stats ?? { pending: 0, confirmed: 0, cancelled: 0 });
        setResources(data.resources ?? []);
        if (data.resources?.length > 0 && modalResource === 0) {
          setModalResource(data.resources[0].id);
        }
      }
    } finally {
      setLoading(false);
    }
  }, [from, to, modalResource]);

  useEffect(() => {
    setLoading(true);
    fetchData();
  }, [currentMonth]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const interval = setInterval(fetchData, 15000);
    return () => clearInterval(interval);
  }, [fetchData]);

  useEffect(() => {
    if (!showModal || !modalDate || !modalResource) return;
    const excludeQuery = editingAppointment ? `&excludeAppointmentId=${editingAppointment.id}` : "";
    fetch(`/api/appointments/available?date=${modalDate}&duration=${modalDuration}${excludeQuery}`)
      .then((r) => r.json())
      .then((d) => {
        const filtered = (d.slots ?? []).filter((s: AvailableSlot) => s.resource_id === modalResource);
        setModalSlots(filtered);
        
        const hasSlot = filtered.some((s: AvailableSlot) => s.time_start === modalSlot);
        if (!hasSlot && !editingAppointment) {
          setModalSlot(filtered[0]?.time_start ?? "");
        }
      });
  }, [showModal, modalDate, modalResource, modalDuration, editingAppointment]);

  const appointmentDays = useMemo(() => new Set(appointments.map((a) => a.date)), [appointments]);
  const apptsByDay = useCallback(
    (date: string) => appointments.filter((a) => a.date === date),
    [appointments]
  );

  async function changeStatus(id: number, status: Appointment["status"]) {
    setAppointments((prev) => prev.map((a) => (a.id === id ? { ...a, status } : a)));
    await fetch(`/api/appointments/${id}/status`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
  }

  async function confirmDeleteAppointment() {
    if (!deleteId) return;
    const id = deleteId;
    setDeleteId(null);
    setAppointments((prev) => prev.filter((a) => a.id !== id));
    await fetch(`/api/appointments/${id}/status`, { method: "DELETE" });
  }

  function openModal(date: string) {
    setEditingAppointment(null);
    setModalDate(date);
    setModalService("");
    setModalName("");
    setModalPhone("");
    setModalNotes("");
    setModalDuration(30);
    setModalSlot("");
    setShowModal(true);
  }

  function openEditModal(a: Appointment) {
    setEditingAppointment(a);
    setModalDate(a.date);
    setModalResource(a.resource_id);
    setModalService(a.service ?? "");
    setModalName(a.contact_name ?? "");
    setModalPhone(a.contact_phone ?? "");
    setModalNotes(a.notes ?? "");
    setModalDuration(a.duration_minutes);
    setModalSlot(a.time_start);
    setShowModal(true);
  }

  async function saveAppointment() {
    if (!modalDate || !modalSlot || !modalResource) return;
    setSavingModal(true);
    try {
      const url = editingAppointment 
        ? `/api/appointments/${editingAppointment.id}` 
        : "/api/appointments";
      const method = editingAppointment ? "PUT" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          resource_id: modalResource,
          date: modalDate,
          time_start: modalSlot,
          duration_minutes: modalDuration,
          service: modalService || null,
          contact_name: modalName || null,
          contact_phone: modalPhone || null,
          notes: modalNotes || null,
        }),
      });
      if (res.ok) {
        setShowModal(false);
        setEditingAppointment(null);
        fetchData();
      }
    } finally {
      setSavingModal(false);
    }
  }

  const goToMonth = (newMonth: Date) => {
    setCurrentMonth(newMonth);
    const { from: nf, to: nt } = getMonthBounds(newMonth);
    if (selectedDay < nf || selectedDay > nt) {
      const todayStr = dateToStr(new Date());
      setSelectedDay(todayStr >= nf && todayStr <= nt ? todayStr : nf);
    }
  };
  const prevMonth = () => goToMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1));
  const nextMonth = () => goToMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1));

  const calendarProps = {
    currentMonth,
    selectedDay,
    appointmentDays,
    onSelectDay: setSelectedDay,
    onPrevMonth: prevMonth,
    onNextMonth: nextMonth,
  };

  const dayPanelProps = {
    selectedDay,
    appointments: apptsByDay(selectedDay),
    loading,
    onAdd: () => openModal(selectedDay),
    onStatusChange: changeStatus,
    onDelete: setDeleteId,
    onEdit: openEditModal,
  };

  return (
    <div className="flex flex-col h-dvh bg-[var(--color-wa-bg-main)]">
      <TopNav />

      <main className="flex-1 flex flex-col overflow-hidden">
        <PullToRefresh onRefresh={fetchData} className="flex-1 flex flex-col overflow-hidden">
          {/* Desktop: calendar split OR lista */}
          <div className="hidden md:flex flex-1 overflow-hidden md:p-3 md:gap-3">
            {viewMode === "calendar" ? (
              <>
                {/* Left: mini calendar card */}
                <div className="w-[350px] flex-shrink-0 overflow-y-auto">
                  <div className="bg-white dark:bg-[var(--color-wa-panel-l)] rounded-2xl p-5 shadow-[0_1px_4px_rgba(0,0,0,0.08)]">
                    <MiniCalendar {...calendarProps} />
                  </div>
                </div>
                {/* Right: day panel card */}
                <div className="flex-1 bg-white dark:bg-[var(--color-wa-panel-l)] rounded-2xl shadow-[0_1px_4px_rgba(0,0,0,0.08)] overflow-hidden flex flex-col">
                  <DayPanel {...dayPanelProps} />
                </div>
              </>
            ) : (
              <div className="flex-1 bg-white dark:bg-[var(--color-wa-panel-l)] rounded-2xl shadow-[0_1px_4px_rgba(0,0,0,0.08)] overflow-hidden flex flex-col">
                <ListaView
                  appointments={appointments}
                  loading={loading}
                  onStatusChange={changeStatus}
                  onDelete={setDeleteId}
                  onEdit={openEditModal}
                />
              </div>
            )}
          </div>

          {/* Mobile: mini calendar + day panel stacked */}
          <div className="md:hidden flex flex-col flex-1 overflow-hidden">
            <div className="flex-shrink-0 bg-[var(--color-wa-panel-l)] border-b border-[var(--color-wa-sep)] px-4 pt-3 pb-4">
              <MiniCalendar {...calendarProps} compact />
            </div>
            <div className="flex-1 overflow-hidden flex flex-col">
              <DayPanel {...dayPanelProps} />
            </div>
          </div>
        </PullToRefresh>
      </main>

      {/* New/Edit appointment modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              saveAppointment();
            }}
            className="bg-[var(--color-wa-panel-l)] rounded-2xl w-full max-w-sm shadow-2xl animate-modal"
          >
            <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--color-wa-sep)]">
              <h2 className="text-base font-semibold text-[var(--color-wa-text-main)]">
                {editingAppointment ? "Editar turno" : "Nuevo turno"}
              </h2>
              <button
                type="button"
                onClick={() => { setShowModal(false); setEditingAppointment(null); }}
                className="text-[var(--color-wa-text-sec)] hover:text-[var(--color-wa-text-main)]"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="p-5 space-y-4 max-h-[70vh] overflow-y-auto">
              <div>
                <label className="block text-sm font-medium text-[var(--color-wa-text-sec)] mb-1">Fecha</label>
                <input
                  type="date"
                  value={modalDate}
                  onChange={(e) => setModalDate(e.target.value)}
                  className="w-full text-sm bg-[var(--color-wa-input)] border border-[var(--color-wa-sep)] rounded-lg px-3 py-2.5 text-[var(--color-wa-text-main)] focus:outline-none focus:border-[var(--color-wa-green)]"
                />
              </div>

              {resources.length > 1 && (
                <div>
                  <label className="block text-sm font-medium text-[var(--color-wa-text-sec)] mb-1">Personal</label>
                  <select
                    value={modalResource}
                    onChange={(e) => setModalResource(Number(e.target.value))}
                    className="w-full text-sm bg-[var(--color-wa-input)] border border-[var(--color-wa-sep)] rounded-lg px-3 py-2.5 text-[var(--color-wa-text-main)] focus:outline-none focus:border-[var(--color-wa-green)]"
                  >
                    {resources.map((r) => (
                      <option key={r.id} value={r.id}>{r.name}</option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-[var(--color-wa-text-sec)] mb-1">Duración</label>
                <select
                  value={modalDuration}
                  onChange={(e) => setModalDuration(Number(e.target.value))}
                  className="w-full text-sm bg-[var(--color-wa-input)] border border-[var(--color-wa-sep)] rounded-lg px-3 py-2.5 text-[var(--color-wa-text-main)] focus:outline-none focus:border-[var(--color-wa-green)]"
                >
                  {[15, 30, 45, 60, 90, 120].map((d) => (
                    <option key={d} value={d}>{d} min</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-[var(--color-wa-text-sec)] mb-1">Horario</label>
                {modalSlots.length === 0 ? (
                  <p className="text-sm text-[var(--color-wa-text-sec)] italic">
                    {modalDate ? "Sin disponibilidad para ese día" : "Seleccioná una fecha"}
                  </p>
                ) : (
                  <div className="grid grid-cols-4 gap-2">
                    {modalSlots.map((s) => (
                      <button
                        key={s.time_start}
                        type="button"
                        onClick={() => setModalSlot(s.time_start)}
                        className={`text-sm py-2 rounded-lg border transition-colors ${
                          modalSlot === s.time_start
                            ? "bg-[var(--color-wa-green)] text-[var(--color-wa-green-text)] border-[var(--color-wa-green)]"
                            : "border-[var(--color-wa-sep)] text-[var(--color-wa-text-main)] hover:border-[var(--color-wa-green)]"
                        }`}
                      >
                        {formatTime(s.time_start)}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-[var(--color-wa-text-sec)] mb-1">Servicio (opcional)</label>
                <input
                  type="text"
                  value={modalService}
                  onChange={(e) => setModalService(e.target.value)}
                  placeholder="Ej: Servicio"
                  className="w-full text-sm bg-[var(--color-wa-input)] border border-[var(--color-wa-sep)] rounded-lg px-3 py-2.5 text-[var(--color-wa-text-main)] focus:outline-none focus:border-[var(--color-wa-green)] placeholder:text-[var(--color-wa-text-sec)]"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-sm font-medium text-[var(--color-wa-text-sec)] mb-1">Nombre</label>
                  <input
                    type="text"
                    value={modalName}
                    onChange={(e) => setModalName(e.target.value)}
                    placeholder="Nombre"
                    className="w-full text-sm bg-[var(--color-wa-input)] border border-[var(--color-wa-sep)] rounded-lg px-3 py-2.5 text-[var(--color-wa-text-main)] focus:outline-none focus:border-[var(--color-wa-green)] placeholder:text-[var(--color-wa-text-sec)]"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[var(--color-wa-text-sec)] mb-1">Teléfono</label>
                  <input
                    type="tel"
                    value={modalPhone}
                    onChange={(e) => setModalPhone(e.target.value)}
                    placeholder="+54 9..."
                    className="w-full text-sm bg-[var(--color-wa-input)] border border-[var(--color-wa-sep)] rounded-lg px-3 py-2.5 text-[var(--color-wa-text-main)] focus:outline-none focus:border-[var(--color-wa-green)] placeholder:text-[var(--color-wa-text-sec)]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-[var(--color-wa-text-sec)] mb-1">Notas (opcional)</label>
                <textarea
                  rows={2}
                  value={modalNotes}
                  onChange={(e) => setModalNotes(e.target.value)}
                  placeholder="Notas internas..."
                  className="w-full text-sm bg-[var(--color-wa-input)] border border-[var(--color-wa-sep)] rounded-lg px-3 py-2.5 text-[var(--color-wa-text-main)] focus:outline-none focus:border-[var(--color-wa-green)] resize-none placeholder:text-[var(--color-wa-text-sec)]"
                />
              </div>
            </div>

            <div className="px-5 pb-5 flex gap-2">
              <button
                type="button"
                onClick={() => { setShowModal(false); setEditingAppointment(null); }}
                className="flex-1 py-3 border border-[var(--color-wa-sep)] text-[var(--color-wa-text-main)] text-sm font-medium rounded-xl hover:bg-[var(--color-wa-hover)] transition-colors"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={!modalSlot || savingModal}
                className="flex-1 py-3 bg-[var(--color-wa-green)] text-[var(--color-wa-green-text)] text-sm font-semibold rounded-xl hover:bg-[var(--color-wa-green-dark)] disabled:opacity-50 transition-colors"
              >
                {savingModal ? "Guardando…" : editingAppointment ? "Guardar cambios" : "Guardar turno"}
              </button>
            </div>
          </form>
        </div>
      )}

      {deleteId !== null && (
        <ConfirmDialog
          message="¿Eliminar este turno? Esta acción no se puede deshacer."
          onConfirm={confirmDeleteAppointment}
          onCancel={() => setDeleteId(null)}
        />
      )}

      <BottomNav />
    </div>
  );
}
