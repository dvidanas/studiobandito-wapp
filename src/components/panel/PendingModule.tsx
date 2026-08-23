"use client";

import { formatDateLabel, formatTime } from "@/lib/panelDates";
import type { Appointment } from "./types";

export function PendingModule({
  appointments,
  onConfirm,
  onJump,
}: {
  appointments: Appointment[];
  onConfirm: (id: number) => void;
  onJump: (date: string) => void;
}) {
  return (
    <div>
      <h3 className="text-sm font-semibold text-[var(--color-wa-text-main)] mb-3">Pendientes</h3>
      {appointments.length === 0 ? (
        <p className="text-sm text-[var(--color-wa-text-sec)]">Sin turnos pendientes</p>
      ) : (
        <div className="flex flex-col gap-2 max-h-[320px] overflow-y-auto">
          {appointments.map((a) => (
            <div
              key={a.id}
              className="border border-[var(--color-wa-sep)] rounded-xl p-3 flex flex-col gap-2"
            >
              <span className="text-xs font-semibold text-[var(--color-wa-text-main)] capitalize">
                {formatDateLabel(a.date)} · {formatTime(a.time_start)}
              </span>
              <span className="text-sm text-[var(--color-wa-text-main)] font-medium truncate">
                {a.contact_name ?? a.contact_phone ?? "Sin nombre"}
              </span>
              {a.service && (
                <span className="text-xs text-[var(--color-wa-text-sec)] truncate">{a.service}</span>
              )}
              <div className="flex gap-2 pt-1">
                <button
                  onClick={() => onConfirm(a.id)}
                  className="text-xs px-3 py-1.5 bg-teal-500 text-white rounded-full font-semibold hover:bg-teal-600 active:scale-95 transition-all cursor-pointer"
                >
                  Confirmar
                </button>
                <button
                  onClick={() => onJump(a.date)}
                  className="text-xs px-3 py-1.5 border border-[var(--color-wa-sep)] text-[var(--color-wa-text-sec)] rounded-full font-semibold hover:bg-[var(--color-wa-hover)] active:scale-95 transition-all cursor-pointer"
                >
                  Ver día
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
