"use client";
import { Suspense, useState, useEffect, useCallback, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { PullToRefresh } from "@/components/PullToRefresh";
import { dateToStr, formatDateLabel, formatTime, getMonthBounds, hoyArgentina } from "@/lib/panelDates";
import { MiniCalendar } from "@/components/panel/MiniCalendar";
import { DayPanel } from "@/components/panel/DayPanel";
import { AppointmentCard } from "@/components/panel/AppointmentCard";
import { PendingModule } from "@/components/panel/PendingModule";
import { EVENTO_TURNOS_NUEVOS } from "@/components/panel/NuevoTurnoWatcher";
import {
  STATUS_LABELS,
  STATUS_STYLES,
  type Appointment,
  type AvailableSlot,
  type Resource,
  type Stats,
} from "@/components/panel/types";






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
              <AppointmentCard
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

// useSearchParams() obliga a un límite de Suspense para que Next pueda
// prerenderizar la ruta; el contenido real vive en AppointmentsView.
export default function AppointmentsPage() {
  return (
    <Suspense fallback={<div className="flex-1 bg-[var(--color-wa-bg-main)]" />}>
      <AppointmentsView />
    </Suspense>
  );
}

function AppointmentsView() {
  const [viewMode, setViewMode] = useState<"calendar" | "lista">("calendar");
  const searchParams = useSearchParams();
  const [currentMonth, setCurrentMonth] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });
  const [selectedDay, setSelectedDay] = useState(() => dateToStr(hoyArgentina()));
  const [highlightId, setHighlightId] = useState<number | null>(null);
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
  const [calendarOpen, setCalendarOpen] = useState(false);

  const { from, to } = useMemo(() => getMonthBounds(currentMonth), [currentMonth]);
  const todayStr = useMemo(() => dateToStr(new Date()), []);
  const pendingAppointments = useMemo(
    () =>
      appointments
        .filter((a) => a.status === "pending" && a.date >= todayStr)
        .sort((a, b) => (a.date + a.time_start).localeCompare(b.date + b.time_start)),
    [appointments, todayStr]
  );

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

  // El aviso de turno nuevo navega a /?fecha=...&highlight=...: saltamos a ese
  // día y resaltamos la tarjeta.
  useEffect(() => {
    const fecha = searchParams.get("fecha");
    const highlight = searchParams.get("highlight");
    if (fecha) {
      setSelectedDay(fecha);
      const d = new Date(fecha + "T12:00:00Z");
      setCurrentMonth(new Date(d.getUTCFullYear(), d.getUTCMonth(), 1));
    }
    if (highlight) {
      const id = Number(highlight);
      if (Number.isInteger(id)) setHighlightId(id);
    }
  }, [searchParams]);

  // Antes acá había un setInterval(fetchData, 15000) que recargaba la lista
  // completa cada 15 s. Lo reemplaza NuevoTurnoWatcher: hace un poll delta y
  // avisa por evento solo cuando aparece un turno nuevo.
  useEffect(() => {
    const alHaberNuevos = () => fetchData();
    window.addEventListener(EVENTO_TURNOS_NUEVOS, alHaberNuevos);
    return () => window.removeEventListener(EVENTO_TURNOS_NUEVOS, alHaberNuevos);
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

  function jumpToDay(date: string) {
    const [y, m] = date.split("-").map(Number);
    const dayMonth = new Date(y, m - 1, 1);
    if (dayMonth.getFullYear() !== currentMonth.getFullYear() || dayMonth.getMonth() !== currentMonth.getMonth()) {
      setCurrentMonth(dayMonth);
    }
    setSelectedDay(date);
    setViewMode("calendar");
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
    highlightId,
  };

  return (
    <div className="flex flex-col h-full min-h-0">

      <main className="flex-1 flex flex-col overflow-hidden">
        <PullToRefresh onRefresh={fetchData} className="flex-1 flex flex-col overflow-hidden">
          {/* Desktop: calendar split OR lista */}
          <div className="hidden md:flex flex-1 overflow-hidden md:p-3 md:gap-3">
            {viewMode === "calendar" ? (
              <>
                {/* Left: mini calendar card + pending module */}
                <div className="w-[350px] flex-shrink-0 overflow-y-auto flex flex-col gap-3">
                  <div className="bg-white dark:bg-[var(--color-wa-panel-l)] rounded-2xl p-5 shadow-[0_1px_4px_rgba(0,0,0,0.08)]">
                    <MiniCalendar {...calendarProps} />
                  </div>
                  <div className="bg-white dark:bg-[var(--color-wa-panel-l)] rounded-2xl p-5 shadow-[0_1px_4px_rgba(0,0,0,0.08)]">
                    <PendingModule
                      appointments={pendingAppointments}
                      onConfirm={(id) => changeStatus(id, "confirmed")}
                      onJump={jumpToDay}
                    />
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

          {/* Mobile: collapsible mini calendar + day panel stacked */}
          <div className="md:hidden flex flex-col flex-1 overflow-hidden">
            <div className="flex-shrink-0 bg-[var(--color-wa-panel-l)] border-b border-[var(--color-wa-sep)]">
              <button
                onClick={() => setCalendarOpen((v) => !v)}
                className="w-full flex items-center justify-between px-4 py-3 cursor-pointer"
              >
                <span className="text-sm font-semibold text-[var(--color-wa-text-main)] capitalize">
                  {formatDateLabel(selectedDay)}
                </span>
                <svg
                  className={`w-4 h-4 text-[var(--color-wa-text-sec)] transition-transform duration-200 ${calendarOpen ? "rotate-180" : ""}`}
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2.5}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
                </svg>
              </button>
              {calendarOpen && (
                <div className="px-4 pb-4">
                  <MiniCalendar {...calendarProps} compact />
                </div>
              )}
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

    </div>
  );
}
