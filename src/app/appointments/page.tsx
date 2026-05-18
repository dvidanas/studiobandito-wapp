"use client";
import { useState, useEffect, useCallback, useMemo } from "react";
import Link from "next/link";
import { TopNav, BottomNav } from "@/components/TopNav";

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
  pending: "bg-amber-400 text-white",
  confirmed: "bg-[var(--color-wa-green)] text-white",
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
        {weeks.map((week, wi) => (
          <div key={wi} className="grid grid-cols-7 gap-0.5">
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
                  className={`relative flex flex-col items-center justify-center w-full rounded-lg transition-all ${
                    compact ? "py-1.5 text-xs" : "py-2 text-sm"
                  } font-medium ${
                    isSelected
                      ? "bg-blue-500 text-white"
                      : isToday
                      ? "ring-2 ring-[var(--color-wa-green)] text-[var(--color-wa-green)] font-bold"
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
            <span className="w-4 h-4 rounded-lg bg-blue-500 flex items-center justify-center">
              <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </span>
            Seleccionado
          </div>
          <div className="flex items-center gap-2 text-xs text-[var(--color-wa-text-sec)]">
            <span className="w-4 h-4 rounded-lg ring-2 ring-[var(--color-wa-green)] flex items-center justify-center text-[var(--color-wa-green)] text-[10px] font-bold">h</span>
            Hoy
          </div>
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
}: {
  appointment: Appointment;
  onStatusChange: (id: number, status: Appointment["status"]) => void;
  onDelete: (id: number) => void;
}) {
  const name = a.contact_name ?? a.contact_phone ?? "Sin nombre";
  const accentColor = a.status === "pending" ? "#F59E0B" : a.status === "confirmed" ? "var(--wa-green)" : "var(--color-sep)";

  return (
    <div
      className={`flex gap-3 p-3 rounded-xl border border-[var(--color-wa-sep)] bg-[var(--color-wa-panel-l)] animate-in shadow-[var(--shadow-card)] hover:shadow-[var(--shadow-card-hover)] transition-all duration-150 ${
        a.status === "cancelled" ? "opacity-40" : ""
      }`}
      style={{ borderLeft: `3px solid ${accentColor}` }}
    >
      {/* Time */}
      <div className="flex-shrink-0 w-16 text-right">
        <p className="text-sm font-semibold text-[var(--color-wa-text-main)]">{formatTime(a.time_start)}</p>
        <p className="text-xs text-[var(--color-wa-text-sec)]">{formatTime(a.time_end)}</p>
      </div>

      {/* Divider */}
      <div className="w-px bg-[var(--color-wa-sep)] flex-shrink-0" />

      {/* Content */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-[var(--color-wa-text-main)] truncate">{name}</p>
        {a.service && (
          <p className="text-xs text-[var(--color-wa-text-sec)] truncate">{a.service}</p>
        )}
        {a.contact_phone && a.contact_name && (
          <p className="text-xs text-[var(--color-wa-text-sec)]">{a.contact_phone}</p>
        )}
        {a.notes && (
          <p className="text-xs text-[var(--color-wa-text-sec)] italic mt-0.5 truncate">{a.notes}</p>
        )}

        {/* Badges */}
        <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
          <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${STATUS_STYLES[a.status]}`}>
            {STATUS_LABELS[a.status]}
          </span>
          <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${
            a.source === "bot"
              ? "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
              : "bg-[var(--color-wa-hover)] text-[var(--color-wa-text-sec)]"
          }`}>
            {a.source === "bot" ? "Bot" : "Manual"}
          </span>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1.5 mt-2 flex-wrap">
          {a.status === "pending" && (
            <button
              onClick={() => onStatusChange(a.id, "confirmed")}
              className="text-xs px-2.5 py-1 bg-[var(--color-wa-green)] text-white rounded-lg font-semibold hover:bg-[var(--color-wa-green-dark)] transition-colors"
            >
              Confirmar
            </button>
          )}
          {a.status === "confirmed" && (
            <button
              onClick={() => onStatusChange(a.id, "cancelled")}
              className="text-xs px-2.5 py-1 border border-[var(--color-wa-sep)] text-[var(--color-wa-text-sec)] rounded-lg hover:bg-[var(--color-wa-hover)] transition-colors"
            >
              Cancelar
            </button>
          )}
          {a.status === "pending" && (
            <button
              onClick={() => onStatusChange(a.id, "cancelled")}
              className="text-xs px-2.5 py-1 border border-[var(--color-wa-sep)] text-[var(--color-wa-text-sec)] rounded-lg hover:bg-[var(--color-wa-hover)] transition-colors"
            >
              Cancelar
            </button>
          )}
          {a.status === "cancelled" && (
            <button
              onClick={() => onStatusChange(a.id, "pending")}
              className="text-xs px-2.5 py-1 border border-[var(--color-wa-sep)] text-[var(--color-wa-text-sec)] rounded-lg hover:bg-[var(--color-wa-hover)] transition-colors"
            >
              Reactivar
            </button>
          )}
          {a.conversation_id !== null && (
            <Link
              href={`/?id=${a.conversation_id}`}
              className="text-xs p-1 rounded border border-[var(--color-wa-green)] text-[var(--color-wa-green)] hover:bg-[var(--color-wa-green)] hover:text-white transition-colors"
              title="Ir al chat"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
            </Link>
          )}
          <button
            onClick={() => onDelete(a.id)}
            className="text-xs p-1 rounded text-red-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
            title="Eliminar"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        </div>
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
}: {
  selectedDay: string;
  appointments: Appointment[];
  loading: boolean;
  onAdd: () => void;
  onStatusChange: (id: number, status: Appointment["status"]) => void;
  onDelete: (id: number) => void;
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
}: {
  appointments: Appointment[];
  loading: boolean;
  onStatusChange: (id: number, status: Appointment["status"]) => void;
  onDelete: (id: number) => void;
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
    fetch(`/api/appointments/available?date=${modalDate}&duration=${modalDuration}`)
      .then((r) => r.json())
      .then((d) => {
        const filtered = (d.slots ?? []).filter((s: AvailableSlot) => s.resource_id === modalResource);
        setModalSlots(filtered);
        setModalSlot(filtered[0]?.time_start ?? "");
      });
  }, [showModal, modalDate, modalResource, modalDuration]);

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

  async function handleDelete(id: number) {
    setAppointments((prev) => prev.filter((a) => a.id !== id));
    await fetch(`/api/appointments/${id}/status`, { method: "DELETE" });
  }

  function openModal(date: string) {
    setModalDate(date);
    setModalService("");
    setModalName("");
    setModalPhone("");
    setModalNotes("");
    setModalDuration(30);
    setModalSlot("");
    setShowModal(true);
  }

  async function saveAppointment() {
    if (!modalDate || !modalSlot || !modalResource) return;
    setSavingModal(true);
    try {
      const res = await fetch("/api/appointments", {
        method: "POST",
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
    onDelete: handleDelete,
  };

  return (
    <div className="flex flex-col h-dvh bg-[var(--color-wa-bg-main)]">
      <TopNav />

      <main className="flex-1 flex flex-col overflow-hidden">
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
                onDelete={handleDelete}
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
      </main>

      {/* New appointment modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-[var(--color-wa-panel-l)] rounded-2xl w-full max-w-sm shadow-2xl animate-modal">
            <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--color-wa-sep)]">
              <h2 className="text-base font-semibold text-[var(--color-wa-text-main)]">Nuevo turno</h2>
              <button
                onClick={() => setShowModal(false)}
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
                  <label className="block text-sm font-medium text-[var(--color-wa-text-sec)] mb-1">Recurso</label>
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
                        onClick={() => setModalSlot(s.time_start)}
                        className={`text-sm py-2 rounded-lg border transition-colors ${
                          modalSlot === s.time_start
                            ? "bg-[var(--color-wa-green)] text-white border-[var(--color-wa-green)]"
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
                  placeholder="Ej: Diagnóstico gratuito"
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
                onClick={() => setShowModal(false)}
                className="flex-1 py-3 border border-[var(--color-wa-sep)] text-[var(--color-wa-text-main)] text-sm font-medium rounded-xl hover:bg-[var(--color-wa-hover)] transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={saveAppointment}
                disabled={!modalSlot || savingModal}
                className="flex-1 py-3 bg-[var(--color-wa-green)] text-white text-sm font-semibold rounded-xl hover:bg-[var(--color-wa-green-dark)] disabled:opacity-50 transition-colors"
              >
                {savingModal ? "Guardando…" : "Guardar turno"}
              </button>
            </div>
          </div>
        </div>
      )}

      <BottomNav />
    </div>
  );
}
