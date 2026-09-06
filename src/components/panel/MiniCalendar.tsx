"use client";

import { useState } from "react";
import { DAY_HEADERS, MONTH_NAMES, dateToStr } from "@/lib/panelDates";

export function MiniCalendar({
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

  // 310 px es el ancho util del calendario en las dos referencias: Studio
  // Bandito (columna 350 con tarjeta p-5) y pastalovers (columna 340 con p-4,
  // que da 308). Las celdas son w-8 fijas y van centradas en cada columna de la
  // grilla, asi que todo el ancho sobrante se convierte en aire entre los dias:
  // a 380 px el paso se va de 44.6 a 54.6 px y el calendario se ve mucho mas
  // suelto aunque las celdas midan exactamente lo mismo.
  //
  // Con la columna en 350 este tope no recorta nada; esta para que la densidad
  // no se mueva si alguien cambia el ancho de la columna mas adelante.
  return (
    <div className="flex flex-col gap-2 w-full max-w-[310px] mx-auto">
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
          <div key={week.find(Boolean) ?? wi} className="grid grid-cols-7 gap-1">
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
