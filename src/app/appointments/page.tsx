"use client";
import { useState, useEffect, useCallback } from "react";
import { Sidebar } from "@/components/Sidebar";
import { BottomNav } from "@/components/BottomNav";

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
  pending: "bg-yellow-500 text-white",
  confirmed: "bg-[var(--color-wa-green)] text-white",
  cancelled: "bg-[var(--color-wa-sep)] text-[var(--color-wa-text-sec)]",
};

const STATUS_LABELS = {
  pending: "Pendiente",
  confirmed: "Confirmado",
  cancelled: "Cancelado",
};

const DAY_NAMES = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];
const DAY_NAMES_FULL = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];

function getMonday(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

function dateToStr(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function formatDate(str: string): string {
  const [, m, d] = str.split("-");
  return `${d}/${m}`;
}

function formatTime(t: string): string {
  return t.slice(0, 5);
}

function addDays(d: Date, n: number): Date {
  const r = new Date(d);
  r.setDate(r.getDate() + n);
  return r;
}

export default function AppointmentsPage() {
  const [weekStart, setWeekStart] = useState<Date>(() => getMonday(new Date()));
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [resources, setResources] = useState<Resource[]>([]);
  const [stats, setStats] = useState<Stats>({ pending: 0, confirmed: 0, cancelled: 0 });
  const [loading, setLoading] = useState(true);
  const [selectedDay, setSelectedDay] = useState<string>(() => dateToStr(new Date()));

  // New appointment modal state
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

  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  const from = dateToStr(weekStart);
  const to = dateToStr(weekDays[6]);

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
  }, [weekStart]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const interval = setInterval(fetchData, 15000);
    return () => clearInterval(interval);
  }, [fetchData]);

  // Fetch available slots when modal date/resource/duration change
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

  const apptsByDay = (date: string) => appointments.filter((a) => a.date === date);
  const today = dateToStr(new Date());

  return (
    <div className="flex h-[calc(100dvh-60px)] md:h-dvh bg-[var(--color-wa-bg-main)]">
      <Sidebar />

      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="bg-[var(--color-wa-header)] border-b border-[var(--color-wa-sep)] px-4 py-3 flex items-center justify-between flex-shrink-0">
          <div>
            <h1 className="text-sm font-semibold text-[var(--color-wa-text-main)]">Turnos</h1>
            <p className="text-xs text-[var(--color-wa-text-sec)]">
              {stats.pending} pendientes · {stats.confirmed} confirmados
            </p>
          </div>
          <button
            onClick={() => openModal(selectedDay)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-[var(--color-wa-green)] text-white text-xs font-semibold rounded-lg hover:bg-[var(--color-wa-green-dark)] transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            Nuevo turno
          </button>
        </div>

        {/* Week nav */}
        <div className="bg-[var(--color-wa-panel-l)] border-b border-[var(--color-wa-sep)] px-3 py-2 flex items-center justify-between flex-shrink-0">
          <button
            onClick={() => setWeekStart((w) => addDays(w, -7))}
            className="p-1.5 rounded hover:bg-[var(--color-wa-hover)] transition-colors"
          >
            <svg className="w-4 h-4 text-[var(--color-wa-text-sec)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
          </button>

          <span className="text-xs font-medium text-[var(--color-wa-text-main)]">
            {formatDate(from)} – {formatDate(to)}
          </span>

          <button
            onClick={() => setWeekStart((w) => addDays(w, 7))}
            className="p-1.5 rounded hover:bg-[var(--color-wa-hover)] transition-colors"
          >
            <svg className="w-4 h-4 text-[var(--color-wa-text-sec)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>

        {/* DESKTOP: week grid */}
        <div className="hidden md:flex flex-1 overflow-hidden">
          {weekDays.map((dayDate) => {
            const dayStr = dateToStr(dayDate);
            const dayAppts = apptsByDay(dayStr);
            const isToday = dayStr === today;
            const dayIdx = dayDate.getDay();

            return (
              <div key={dayStr} className="flex-1 flex flex-col border-r border-[var(--color-wa-sep)] last:border-r-0 min-w-0">
                {/* Day header */}
                <div
                  className={`px-2 py-2 text-center border-b border-[var(--color-wa-sep)] flex-shrink-0 ${
                    isToday ? "bg-[var(--color-wa-green)]" : "bg-[var(--color-wa-panel-l)]"
                  }`}
                >
                  <p className={`text-[10px] font-semibold uppercase tracking-wider ${isToday ? "text-white" : "text-[var(--color-wa-text-sec)]"}`}>
                    {DAY_NAMES[dayIdx]}
                  </p>
                  <p className={`text-lg font-bold leading-tight ${isToday ? "text-white" : "text-[var(--color-wa-text-main)]"}`}>
                    {dayDate.getDate()}
                  </p>
                </div>

                {/* Appointments */}
                <div className="flex-1 overflow-y-auto p-1.5 space-y-1.5">
                  {loading ? (
                    <div className="h-8 rounded bg-[var(--color-wa-sep)] animate-pulse" />
                  ) : dayAppts.length === 0 ? (
                    <p className="text-center text-[10px] text-[var(--color-wa-text-sec)] pt-4 opacity-50">Sin turnos</p>
                  ) : (
                    dayAppts.map((a) => (
                      <AppointmentCard
                        key={a.id}
                        appointment={a}
                        onStatusChange={changeStatus}
                        onDelete={handleDelete}
                      />
                    ))
                  )}
                  <button
                    onClick={() => openModal(dayStr)}
                    className="w-full text-center text-[10px] text-[var(--color-wa-text-sec)] py-1.5 rounded hover:bg-[var(--color-wa-hover)] transition-colors opacity-60 hover:opacity-100"
                  >
                    + agregar
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* MOBILE: day tabs + list */}
        <div className="flex md:hidden flex-col flex-1 overflow-hidden">
          {/* Day scroll tabs */}
          <div className="flex border-b border-[var(--color-wa-sep)] bg-[var(--color-wa-panel-l)] flex-shrink-0">
            {weekDays.map((dayDate) => {
              const dayStr = dateToStr(dayDate);
              const isToday = dayStr === today;
              const isSelected = dayStr === selectedDay;
              const count = apptsByDay(dayStr).length;
              return (
                <button
                  key={dayStr}
                  onClick={() => setSelectedDay(dayStr)}
                  className={`flex flex-col items-center flex-1 py-2 border-b-2 transition-colors ${
                    isSelected
                      ? "border-[var(--color-wa-green)] text-[var(--color-wa-green)]"
                      : "border-transparent text-[var(--color-wa-text-sec)]"
                  }`}
                >
                  <span className="text-[10px] uppercase tracking-wider font-semibold">{DAY_NAMES[dayDate.getDay()]}</span>
                  <span className={`text-base font-bold ${isToday ? "text-[var(--color-wa-green)]" : ""}`}>{dayDate.getDate()}</span>
                  {count > 0 && (
                    <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-wa-green)] mt-0.5" />
                  )}
                </button>
              );
            })}
          </div>

          {/* Selected day appointments */}
          <div className="flex-1 overflow-y-auto p-3 space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold text-[var(--color-wa-text-sec)] uppercase tracking-wider">
                {DAY_NAMES_FULL[new Date(selectedDay + "T12:00:00Z").getUTCDay()]} {formatDate(selectedDay)}
              </p>
              <button
                onClick={() => openModal(selectedDay)}
                className="text-xs text-[var(--color-wa-green)] font-medium"
              >
                + Agregar
              </button>
            </div>

            {loading ? (
              <div className="space-y-2">
                {[1, 2].map((i) => (
                  <div key={i} className="h-16 rounded-xl bg-[var(--color-wa-sep)] animate-pulse" />
                ))}
              </div>
            ) : apptsByDay(selectedDay).length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <svg className="w-10 h-10 text-[var(--color-wa-text-sec)] opacity-20 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <p className="text-sm text-[var(--color-wa-text-sec)]">Sin turnos este día</p>
              </div>
            ) : (
              apptsByDay(selectedDay).map((a) => (
                <AppointmentCard
                  key={a.id}
                  appointment={a}
                  onStatusChange={changeStatus}
                  onDelete={handleDelete}
                />
              ))
            )}
          </div>
        </div>
      </main>

      {/* New appointment modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-[var(--color-wa-panel-l)] rounded-2xl w-full max-w-sm shadow-2xl">
            <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--color-wa-sep)]">
              <h2 className="text-sm font-semibold text-[var(--color-wa-text-main)]">Nuevo turno</h2>
              <button
                onClick={() => setShowModal(false)}
                className="text-[var(--color-wa-text-sec)] hover:text-[var(--color-wa-text-main)]"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="p-5 space-y-4">
              {/* Fecha */}
              <div>
                <label className="block text-xs font-medium text-[var(--color-wa-text-sec)] mb-1">Fecha</label>
                <input
                  type="date"
                  value={modalDate}
                  onChange={(e) => setModalDate(e.target.value)}
                  className="w-full text-sm bg-[var(--color-wa-input)] border border-[var(--color-wa-sep)] rounded-lg px-3 py-2 text-[var(--color-wa-text-main)] focus:outline-none focus:border-[var(--color-wa-green)]"
                />
              </div>

              {/* Recurso */}
              {resources.length > 1 && (
                <div>
                  <label className="block text-xs font-medium text-[var(--color-wa-text-sec)] mb-1">Recurso</label>
                  <select
                    value={modalResource}
                    onChange={(e) => setModalResource(Number(e.target.value))}
                    className="w-full text-sm bg-[var(--color-wa-input)] border border-[var(--color-wa-sep)] rounded-lg px-3 py-2 text-[var(--color-wa-text-main)] focus:outline-none focus:border-[var(--color-wa-green)]"
                  >
                    {resources.map((r) => (
                      <option key={r.id} value={r.id}>{r.name}</option>
                    ))}
                  </select>
                </div>
              )}

              {/* Duración */}
              <div>
                <label className="block text-xs font-medium text-[var(--color-wa-text-sec)] mb-1">Duración</label>
                <select
                  value={modalDuration}
                  onChange={(e) => setModalDuration(Number(e.target.value))}
                  className="w-full text-sm bg-[var(--color-wa-input)] border border-[var(--color-wa-sep)] rounded-lg px-3 py-2 text-[var(--color-wa-text-main)] focus:outline-none focus:border-[var(--color-wa-green)]"
                >
                  {[15, 30, 45, 60, 90, 120].map((d) => (
                    <option key={d} value={d}>{d} min</option>
                  ))}
                </select>
              </div>

              {/* Horario disponible */}
              <div>
                <label className="block text-xs font-medium text-[var(--color-wa-text-sec)] mb-1">Horario</label>
                {modalSlots.length === 0 ? (
                  <p className="text-xs text-[var(--color-wa-text-sec)] italic">
                    {modalDate ? "Sin disponibilidad para ese día" : "Seleccioná una fecha"}
                  </p>
                ) : (
                  <div className="grid grid-cols-4 gap-1.5">
                    {modalSlots.map((s) => (
                      <button
                        key={s.time_start}
                        onClick={() => setModalSlot(s.time_start)}
                        className={`text-xs py-1.5 rounded-lg border transition-colors ${
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

              {/* Servicio */}
              <div>
                <label className="block text-xs font-medium text-[var(--color-wa-text-sec)] mb-1">Servicio (opcional)</label>
                <input
                  type="text"
                  value={modalService}
                  onChange={(e) => setModalService(e.target.value)}
                  placeholder="Ej: Diagnóstico gratuito"
                  className="w-full text-sm bg-[var(--color-wa-input)] border border-[var(--color-wa-sep)] rounded-lg px-3 py-2 text-[var(--color-wa-text-main)] focus:outline-none focus:border-[var(--color-wa-green)] placeholder:text-[var(--color-wa-text-sec)]"
                />
              </div>

              {/* Nombre y teléfono */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-medium text-[var(--color-wa-text-sec)] mb-1">Nombre</label>
                  <input
                    type="text"
                    value={modalName}
                    onChange={(e) => setModalName(e.target.value)}
                    placeholder="Nombre"
                    className="w-full text-sm bg-[var(--color-wa-input)] border border-[var(--color-wa-sep)] rounded-lg px-3 py-2 text-[var(--color-wa-text-main)] focus:outline-none focus:border-[var(--color-wa-green)] placeholder:text-[var(--color-wa-text-sec)]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-[var(--color-wa-text-sec)] mb-1">Teléfono</label>
                  <input
                    type="tel"
                    value={modalPhone}
                    onChange={(e) => setModalPhone(e.target.value)}
                    placeholder="+54 9..."
                    className="w-full text-sm bg-[var(--color-wa-input)] border border-[var(--color-wa-sep)] rounded-lg px-3 py-2 text-[var(--color-wa-text-main)] focus:outline-none focus:border-[var(--color-wa-green)] placeholder:text-[var(--color-wa-text-sec)]"
                  />
                </div>
              </div>

              {/* Notas */}
              <div>
                <label className="block text-xs font-medium text-[var(--color-wa-text-sec)] mb-1">Notas (opcional)</label>
                <textarea
                  rows={2}
                  value={modalNotes}
                  onChange={(e) => setModalNotes(e.target.value)}
                  placeholder="Notas internas..."
                  className="w-full text-sm bg-[var(--color-wa-input)] border border-[var(--color-wa-sep)] rounded-lg px-3 py-2 text-[var(--color-wa-text-main)] focus:outline-none focus:border-[var(--color-wa-green)] resize-none placeholder:text-[var(--color-wa-text-sec)]"
                />
              </div>
            </div>

            <div className="px-5 pb-5 flex gap-2">
              <button
                onClick={() => setShowModal(false)}
                className="flex-1 py-2.5 border border-[var(--color-wa-sep)] text-[var(--color-wa-text-main)] text-sm font-medium rounded-xl hover:bg-[var(--color-wa-hover)] transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={saveAppointment}
                disabled={!modalSlot || savingModal}
                className="flex-1 py-2.5 bg-[var(--color-wa-green)] text-white text-sm font-semibold rounded-xl hover:bg-[var(--color-wa-green-dark)] disabled:opacity-50 transition-colors"
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

function AppointmentCard({
  appointment: a,
  onStatusChange,
  onDelete,
}: {
  appointment: Appointment;
  onStatusChange: (id: number, status: Appointment["status"]) => void;
  onDelete: (id: number) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const name = a.contact_name ?? a.contact_phone ?? "Sin nombre";

  return (
    <div
      className={`rounded-xl border overflow-hidden ${
        a.status === "cancelled"
          ? "opacity-50 border-[var(--color-wa-sep)]"
          : "border-[var(--color-wa-sep)]"
      } bg-[var(--color-wa-panel-l)]`}
    >
      <button
        onClick={() => setExpanded((x) => !x)}
        className="w-full text-left p-2.5 hover:bg-[var(--color-wa-hover)] transition-colors"
      >
        <div className="flex items-start justify-between gap-1">
          <div className="min-w-0">
            <p className="text-sm font-semibold text-[var(--color-wa-text-main)] truncate">{name}</p>
            <p className="text-xs text-[var(--color-wa-text-sec)]">
              {formatTime(a.time_start)} – {formatTime(a.time_end)}
            </p>
            {a.service && (
              <p className="text-xs text-[var(--color-wa-text-sec)] truncate">{a.service}</p>
            )}
          </div>
          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded flex-shrink-0 ${STATUS_STYLES[a.status]}`}>
            {STATUS_LABELS[a.status]}
          </span>
        </div>
      </button>

      {expanded && (
        <div className="border-t border-[var(--color-wa-sep)] px-2.5 py-2 space-y-2">
          {a.contact_phone && (
            <p className="text-xs text-[var(--color-wa-text-sec)]">Tel: {a.contact_phone}</p>
          )}
          {a.notes && (
            <p className="text-xs text-[var(--color-wa-text-sec)] italic">{a.notes}</p>
          )}
          <div className="flex gap-1.5 flex-wrap">
            {a.status !== "confirmed" && (
              <button
                onClick={() => onStatusChange(a.id, "confirmed")}
                className="text-[10px] px-2 py-1 bg-[var(--color-wa-green)] text-white rounded-lg font-semibold hover:bg-[var(--color-wa-green-dark)] transition-colors"
              >
                Confirmar
              </button>
            )}
            {a.status !== "cancelled" && (
              <button
                onClick={() => onStatusChange(a.id, "cancelled")}
                className="text-[10px] px-2 py-1 border border-[var(--color-wa-sep)] text-[var(--color-wa-text-sec)] rounded-lg hover:bg-[var(--color-wa-hover)] transition-colors"
              >
                Cancelar
              </button>
            )}
            {a.status === "cancelled" && (
              <button
                onClick={() => onStatusChange(a.id, "pending")}
                className="text-[10px] px-2 py-1 border border-[var(--color-wa-sep)] text-[var(--color-wa-text-sec)] rounded-lg hover:bg-[var(--color-wa-hover)] transition-colors"
              >
                Reactivar
              </button>
            )}
            <button
              onClick={() => onDelete(a.id)}
              className="text-[10px] px-2 py-1 text-red-500 hover:underline"
            >
              Eliminar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
