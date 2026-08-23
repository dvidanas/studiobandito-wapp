"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { formatTime } from "@/lib/panelDates";

/**
 * Aviso de turno nuevo. Portado del patrón de Pasta Lovers, con dos diferencias:
 *
 * 1. El watermark es un timestamp UNIX en segundos, no un texto
 *    "YYYY-MM-DD HH:MM:SS": acá `appointments.created_at` es INTEGER.
 * 2. Reemplaza al refetch completo que la vista de turnos hacía cada 15 s. Es un
 *    poll delta: pide solo lo creado desde la última vuelta y refresca la lista
 *    únicamente cuando hay algo nuevo.
 */

const POLL_INTERVAL_MS = 100_000;
const TOAST_DURATION_MS = 8_000;

interface Toast {
  id: number;
  nombre: string;
  servicio: string;
  fecha: string;
  hora: string;
}

/** "Ahora" como segundos UNIX, el mismo formato que guarda la base. */
function ahoraUnix(): number {
  return Math.floor(Date.now() / 1000);
}

function formatFechaCorta(fecha: string): string {
  const [, m, d] = fecha.split("-");
  return `${d}/${m}`;
}

/** Evento que dispara el watcher para que la vista de turnos refresque su lista. */
export const EVENTO_TURNOS_NUEVOS = "bandito:turnos-nuevos";

export function NuevoTurnoWatcher() {
  const router = useRouter();
  const [toasts, setToasts] = useState<Toast[]>([]);
  const lastCheckedRef = useRef<number>(ahoraUnix());
  const notifiedIdsRef = useRef<Set<number>>(new Set());
  const timersRef = useRef<Map<number, ReturnType<typeof setTimeout>>>(new Map());
  const audioCtxRef = useRef<AudioContext | null>(null);

  // Desbloquear audio en la primera interacción (política de autoplay).
  useEffect(() => {
    function unlock() {
      if (!audioCtxRef.current) {
        try {
          audioCtxRef.current = new AudioContext();
        } catch {
          // Sin Web Audio: el sonido queda deshabilitado, el aviso visual sigue.
        }
      }
      document.removeEventListener("pointerdown", unlock);
      document.removeEventListener("keydown", unlock);
    }
    document.addEventListener("pointerdown", unlock);
    document.addEventListener("keydown", unlock);
    return () => {
      document.removeEventListener("pointerdown", unlock);
      document.removeEventListener("keydown", unlock);
    };
  }, []);

  const playBeep = useCallback(() => {
    const ctx = audioCtxRef.current;
    if (!ctx) return;
    try {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.value = 880;
      gain.gain.setValueAtTime(0.0001, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.15, ctx.currentTime + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.3);
      osc.connect(gain).connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.3);
    } catch {
      // Reproducción bloqueada por el navegador: alcanza con el aviso visual.
    }
  }, []);

  const dismiss = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
    const timer = timersRef.current.get(id);
    if (timer) {
      clearTimeout(timer);
      timersRef.current.delete(id);
    }
  }, []);

  const poll = useCallback(async () => {
    try {
      const res = await fetch(`/api/appointments/nuevos?desde=${lastCheckedRef.current}`);
      if (!res.ok) return;
      const data: {
        appointments: {
          id: number;
          service: string | null;
          date: string;
          time_start: string;
          created_at: number;
          contact_name: string | null;
          contact_phone: string | null;
        }[];
      } = await res.json();

      if (data.appointments.length === 0) return;

      // Avanzar el watermark al último created_at recibido, aunque ya se hubiera
      // avisado de esos turnos.
      lastCheckedRef.current = data.appointments[data.appointments.length - 1].created_at;

      const nuevos = data.appointments.filter((a) => !notifiedIdsRef.current.has(a.id));
      if (nuevos.length === 0) return;

      nuevos.forEach((a) => notifiedIdsRef.current.add(a.id));
      setToasts((prev) => [
        ...prev,
        ...nuevos.map((a) => ({
          id: a.id,
          nombre: a.contact_name || a.contact_phone || "Sin nombre",
          servicio: a.service || "Turno",
          fecha: a.date,
          hora: a.time_start,
        })),
      ]);
      nuevos.forEach((a) => {
        const timer = setTimeout(() => dismiss(a.id), TOAST_DURATION_MS);
        timersRef.current.set(a.id, timer);
      });
      playBeep();

      // Avisar a la vista de turnos para que refresque. El watcher vive en el
      // layout y no conoce el estado de la página, así que va por evento.
      window.dispatchEvent(new CustomEvent(EVENTO_TURNOS_NUEVOS));
    } catch {
      // Error de red puntual: se reintenta en el próximo ciclo.
    }
  }, [dismiss, playBeep]);

  useEffect(() => {
    const interval = setInterval(poll, POLL_INTERVAL_MS);
    const timers = timersRef.current;
    return () => {
      clearInterval(interval);
      timers.forEach((t) => clearTimeout(t));
    };
  }, [poll]);

  function handleClick(t: Toast) {
    dismiss(t.id);
    router.push(`/?fecha=${t.fecha}&highlight=${t.id}`);
  }

  if (toasts.length === 0) return null;

  return (
    <div className="fixed top-20 md:top-4 right-4 z-50 flex flex-col gap-2 w-[calc(100%-2rem)] max-w-sm">
      {toasts.map((t) => (
        <div
          key={t.id}
          onClick={() => handleClick(t)}
          className="cursor-pointer bg-[var(--color-wa-panel-l)] border border-teal-500/30 rounded-2xl shadow-lg p-4 flex items-start gap-3 animate-in hover:shadow-xl hover:-translate-y-0.5 transition-all"
        >
          <div className="w-9 h-9 rounded-xl bg-teal-500/10 text-teal-600 dark:text-teal-400 flex items-center justify-center shrink-0">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-extrabold text-teal-600 dark:text-teal-400 uppercase tracking-wider">
              Turno nuevo
            </p>
            <p className="text-sm font-bold text-[var(--color-wa-text-main)] truncate mt-0.5">{t.nombre}</p>
            <p className="text-xs text-[var(--color-wa-text-sec)] mt-0.5 truncate">
              {t.servicio} · {formatFechaCorta(t.fecha)} {formatTime(t.hora)} hs
            </p>
          </div>
          <button
            onClick={(e) => {
              e.stopPropagation();
              dismiss(t.id);
            }}
            className="text-[var(--color-wa-text-sec)] hover:text-[var(--color-wa-text-main)] p-1 -m-1 shrink-0 cursor-pointer"
            aria-label="Descartar"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      ))}
    </div>
  );
}
