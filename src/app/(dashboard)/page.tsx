"use client";
import { Suspense, useState, useEffect, useCallback, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { PullToRefresh } from "@/components/PullToRefresh";
import { dateToStr, formatDateLabel, formatTime, getMonthBounds, hoyArgentina } from "@/lib/panelDates";
import { MiniCalendar } from "@/components/panel/MiniCalendar";
import { DayPanel } from "@/components/panel/DayPanel";
import { PendingModule } from "@/components/panel/PendingModule";
import { TurnosToolbar } from "@/components/panel/TurnosToolbar";
import { TurnosToolbarMobile } from "@/components/panel/TurnosToolbarMobile";
import { EVENTO_TURNOS_NUEVOS } from "@/components/panel/NuevoTurnoWatcher";
import {
  esCancelado,
  filtrarTurnos,
  type Appointment,
  type AvailableSlot,
  type EstadoCita,
  type FiltroEstado,
  type Resource,
  type Servicio,
  type Stats,
} from "@/components/panel/types";
import { claseInput, claseArea, Select } from "@/components/panel/PanelChrome";
import { plata } from "@/lib/format";






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
  const searchParams = useSearchParams();
  const [currentMonth, setCurrentMonth] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });
  const [selectedDay, setSelectedDay] = useState(() => dateToStr(hoyArgentina()));
  const [highlightId, setHighlightId] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<FiltroEstado>("todos");
  const [profesionalFilter, setProfesionalFilter] = useState<number | "todos">("todos");
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [resources, setResources] = useState<Resource[]>([]);
  const [servicios, setServicios] = useState<Servicio[]>([]);
  const [loading, setLoading] = useState(true);

  const [showModal, setShowModal] = useState(false);
  const [editingAppointment, setEditingAppointment] = useState<Appointment | null>(null);
  const [modalDate, setModalDate] = useState("");
  const [modalResource, setModalResource] = useState<number>(0);
  const [modalSlots, setModalSlots] = useState<AvailableSlot[]>([]);
  const [modalSlot, setModalSlot] = useState("");
  const [modalServicio, setModalServicio] = useState<number>(0);
  const [modalName, setModalName] = useState("");
  const [modalPhone, setModalPhone] = useState("");
  const [modalNotes, setModalNotes] = useState("");
  const [modalCodigo, setModalCodigo] = useState("");
  const [modalError, setModalError] = useState<string | null>(null);
  const [profesionalesDelServicio, setProfesionalesDelServicio] = useState<Resource[]>([]);
  const [savingModal, setSavingModal] = useState(false);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [calendarOpen, setCalendarOpen] = useState(false);

  const { from, to } = useMemo(() => getMonthBounds(currentMonth), [currentMonth]);
  const todayStr = useMemo(() => dateToStr(new Date()), []);
  /**
   * Turnos "sin cerrar": ya pasaron y siguen confirmados. Mientras estén así no
   * entran en la caja ni cuentan para comisiones, así que son lo primero que
   * hay que resolver. Reemplaza a la lista de 'pending' del modelo anterior,
   * un estado que ya no existe.
   */
  const pendingAppointments = useMemo(
    () =>
      filtrarTurnos(appointments, { profesionalFilter })
        .filter((a) => a.estado === "confirmada" && a.fecha < todayStr)
        .sort((a, b) => (b.fecha + b.hora_inicio).localeCompare(a.fecha + a.hora_inicio)),
    [appointments, todayStr, profesionalFilter]
  );

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch(`/api/citas?desde=${from}&hasta=${to}`);
      if (res.ok) {
        const data = await res.json();
        setAppointments(data.citas ?? []);
        setResources(data.profesionales ?? []);
        setServicios(data.servicios ?? []);
      }
    } finally {
      setLoading(false);
    }
  }, [from, to]);

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

  /**
   * Profesionales que hacen el servicio elegido. Es el paso
   * servicio -> profesional del flujo de reserva: si nadie hace ese servicio,
   * la lista vuelve vacia y no se puede seguir.
   */
  useEffect(() => {
    if (!modalServicio) {
      setProfesionalesDelServicio(resources);
      return;
    }
    fetch(`/api/publico/profesionales?servicio_id=${modalServicio}`)
      .then((r) => r.json())
      .then((ps: Array<{ id: number; nombre: string; sucursal_id: number | null }>) => {
        const habilitados = Array.isArray(ps) ? ps : [];
        setProfesionalesDelServicio(
          habilitados.map((p) => ({ id: p.id, nombre: p.nombre, sucursal_id: p.sucursal_id, activo: 1 }))
        );
        // Si el profesional elegido no hace el servicio nuevo, se limpia en vez
        // de dejar una combinacion que el backend va a rechazar igual.
        setModalResource((actual) =>
          actual && !habilitados.some((p) => p.id === actual) ? 0 : actual
        );
      });
  }, [modalServicio, resources]);

  /**
   * La duracion de los slots la define el servicio elegido, no el operador: un
   * color de 90 min pedido como turno de 30 dejaria la agenda pisada. Por eso
   * el endpoint recibe `servicio_id` y devuelve la grilla ya correcta.
   */
  useEffect(() => {
    if (!showModal || !modalDate || !modalResource || !modalServicio) {
      setModalSlots([]);
      return;
    }
    const params = new URLSearchParams({
      fecha: modalDate,
      servicio_id: String(modalServicio),
      profesional_id: String(modalResource),
    });
    fetch(`/api/publico/disponibilidad?${params}`)
      .then((r) => r.json())
      .then((slots: AvailableSlot[]) => {
        const libres = Array.isArray(slots) ? slots : [];
        setModalSlots(libres);
        // El horario actual de la cita que se esta editando sigue siendo valido
        // aunque no figure entre los libres: lo ocupa ella misma.
        const propio =
          editingAppointment && editingAppointment.fecha === modalDate
            ? editingAppointment.hora_inicio
            : null;
        const disponibles = libres.map((sl) => sl.hora_inicio);
        setModalSlot((actual) =>
          disponibles.includes(actual) || actual === propio ? actual : disponibles[0] ?? ""
        );
      });
  }, [showModal, modalDate, modalResource, modalServicio, editingAppointment]);

  const appointmentDays = useMemo(() => new Set(appointments.map((a) => a.fecha)), [appointments]);
  const apptsByDay = useCallback(
    (fecha: string) => appointments.filter((a) => a.fecha === fecha),
    [appointments]
  );

  const stats: Stats = useMemo(() => {
    const base: Stats = { pendiente: 0, confirmada: 0, atendida: 0, cancelada: 0, no_show: 0 };
    for (const a of appointments) base[a.estado] += 1;
    return base;
  }, [appointments]);

  /**
   * Pasar a 'atendida' carga el ingreso en la caja del día del lado del
   * servidor. La tarjeta se pinta al instante y se revierte si el PUT falla:
   * un estado local que miente sobre la caja es peor que un segundo de espera.
   */
  async function changeStatus(id: number, estado: EstadoCita) {
    const previo = appointments;
    setAppointments((prev) => prev.map((a) => (a.id === id ? { ...a, estado } : a)));
    try {
      const res = await fetch(`/api/citas/${id}/estado`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ estado }),
      });
      if (!res.ok) setAppointments(previo);
    } catch {
      setAppointments(previo);
    }
  }

  async function confirmDeleteAppointment() {
    if (!deleteId) return;
    const id = deleteId;
    setDeleteId(null);
    setAppointments((prev) => prev.filter((a) => a.id !== id));
    await fetch(`/api/citas/${id}`, { method: "DELETE" });
  }

  function openModal(fecha: string) {
    setEditingAppointment(null);
    setModalDate(fecha);
    setModalServicio(servicios[0]?.id ?? 0);
    setModalResource(0);
    setModalName("");
    setModalPhone("");
    setModalNotes("");
    setModalCodigo("");
    setModalSlot("");
    setModalError(null);
    setShowModal(true);
  }

  function openEditModal(a: Appointment) {
    setEditingAppointment(a);
    setModalDate(a.fecha);
    setModalResource(a.profesional_id);
    setModalServicio(a.servicio_id ?? 0);
    setModalName(a.cliente_nombre ?? "");
    setModalPhone(a.cliente_telefono ?? "");
    setModalNotes(a.notas ?? "");
    setModalCodigo("");
    setModalSlot(a.hora_inicio);
    setModalError(null);
    setShowModal(true);
  }

  async function saveAppointment() {
    if (!modalDate || !modalSlot || !modalResource || !modalServicio) return;
    setSavingModal(true);
    setModalError(null);
    try {
      const url = editingAppointment ? `/api/citas/${editingAppointment.id}` : "/api/citas";
      const method = editingAppointment ? "PUT" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          profesional_id: modalResource,
          servicio_id: modalServicio,
          fecha: modalDate,
          hora_inicio: modalSlot,
          cliente_nombre: modalName || null,
          cliente_telefono: modalPhone || null,
          notas: modalNotes || null,
          ...(!editingAppointment && modalCodigo ? { codigo_descuento: modalCodigo } : {}),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        // El motor rechaza solapamientos, servicios que el profesional no hace
        // y horarios fuera de agenda. El mensaje viene explicado del backend.
        setModalError(data.error ?? "No se pudo guardar el turno.");
        return;
      }
      setShowModal(false);
      setEditingAppointment(null);
      fetchData();
    } catch (e) {
      setModalError(e instanceof Error ? e.message : String(e));
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

  // Stats del día seleccionado. Todo sale de los turnos ya cargados; no hay
  // ninguna consulta ni métrica nueva.
  // Las tarjetas siguen al filtro de BARBERO: si mirás la agenda de Santiago,
  // "Turnos del día" tiene que ser la de Santiago. No siguen al de estado
  // porque las tarjetas ya son el desglose por estado: filtrarlas dejaría
  // tres de las cuatro en cero.
  const turnosDelDia = filtrarTurnos(apptsByDay(selectedDay), { profesionalFilter });
  /**
   * Cuántas tarjetas está mostrando el DayPanel. A diferencia de `turnosDelDia`
   * éste SÍ sigue al filtro de estado y a la búsqueda, porque es el número que
   * va en la píldora de la cabecera del celular y tiene que coincidir con lo
   * que se ve listado abajo. Mismo `filtrarTurnos` que usa el panel.
   */
  const turnosVisiblesDelDia = filtrarTurnos(apptsByDay(selectedDay), {
    searchQuery,
    statusFilter,
    profesionalFilter,
  }).length;
  // esCancelado y no === "cancelada": una ausencia tambien es una cancelacion,
  // y contarla como agenda ocupada infla el numero del dia.
  const vigentesDelDia = turnosDelDia.filter((a) => !esCancelado(a.estado));
  const confirmadosDelDia = turnosDelDia.filter((a) => a.estado === "confirmada").length;
  const atendidosDelDia = turnosDelDia.filter((a) => a.estado === "atendida").length;
  // Minutos ocupados del día, derivados de las horas de cada cita: no hay
  // columna de duración, la duración es hora_fin - hora_inicio.
  const minutosDelDia = vigentesDelDia.reduce((acc, a) => {
    const min = (h: string) => Number(h.slice(0, 2)) * 60 + Number(h.slice(3, 5));
    return acc + Math.max(0, min(a.hora_fin) - min(a.hora_inicio));
  }, 0);
  const agendaDelDia =
    minutosDelDia >= 60
      ? `${Math.floor(minutosDelDia / 60)}h${minutosDelDia % 60 ? ` ${minutosDelDia % 60}m` : ""}`
      : `${minutosDelDia}m`;
  /**
   * Lo mismo, escrito como un reloj: "9h30" en vez de "9h 30m".
   *
   * En el celular los cuatro números van en una sola fila de 252 px útiles, y
   * ahí "9h 30m" no entra: la etiqueta "Agenda" quedaba cortada por el scroll
   * horizontal. Con esta forma entra hasta el peor caso posible — los cuatro
   * barberos con el día completo, que da dos dígitos de hora.
   *
   * No redondea: "9h30" es el mismo dato que "9h 30m", sólo más corto. El
   * escritorio sigue usando `agendaDelDia`, que tiene lugar de sobra.
   */
  const agendaCortaDelDia =
    minutosDelDia >= 60
      ? `${Math.floor(minutosDelDia / 60)}h${
          minutosDelDia % 60 ? String(minutosDelDia % 60).padStart(2, "0") : ""
        }`
      : `${minutosDelDia}m`;

  const irA = (fecha: Date) => {
    setSelectedDay(dateToStr(fecha));
    setCurrentMonth(new Date(fecha.getFullYear(), fecha.getMonth(), 1));
  };
  const irAHoy = () => irA(hoyArgentina());
  const irAManana = () => {
    const d = hoyArgentina();
    d.setDate(d.getDate() + 1);
    irA(d);
  };
  /**
   * "Finde" salta al próximo sábado. El domingo la barbería está cerrada, así
   * que mandar a un día sin agenda no sirve de nada. Si hoy ya es sábado, se
   * queda donde está.
   */
  const irAFinde = () => {
    const d = hoyArgentina();
    const dia = d.getDay(); // 0 domingo … 6 sábado
    d.setDate(d.getDate() + (dia === 0 ? 6 : 6 - dia));
    irA(d);
  };

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
    searchQuery,
    statusFilter,
    profesionalFilter,
  };

  return (
    <div className="flex flex-col h-full min-h-0">

      <main className="flex-1 flex flex-col overflow-hidden">
        <PullToRefresh onRefresh={fetchData} className="flex-1 flex flex-col overflow-hidden">
          {/* Desktop: toolbar + calendar split OR lista */}
          <div className="hidden md:flex flex-col flex-1 overflow-hidden p-3 gap-3">
            <TurnosToolbar
              total={turnosDelDia.length}
              confirmados={confirmadosDelDia}
              atendidos={atendidosDelDia}
              agenda={agendaDelDia}
              searchQuery={searchQuery}
              onSearchChange={setSearchQuery}
              statusFilter={statusFilter}
              onStatusFilterChange={setStatusFilter}
              profesionales={resources}
              profesionalFilter={profesionalFilter}
              onProfesionalFilterChange={setProfesionalFilter}
              onIrAHoy={irAHoy}
              onIrAManana={irAManana}
              onIrAFinde={irAFinde}
            />
          <div className="flex flex-1 overflow-hidden gap-3 min-h-0">
                {/* Left: mini calendar card + pending module */}
                {/* 350 + p-5, como en Studio Bandito: deja la grilla del
                    calendario en 310 px. Ojo con confundir los dos numeros:
                    308-310 es el ancho de la GRILLA, no el de la columna.
                    Puesto como ancho de columna, el p-5 se lo come y la grilla
                    baja a 276, mas angosta que las dos referencias. */}
                <div className="w-[350px] shrink-0 overflow-y-auto flex flex-col gap-3">
                  <div className="bg-white dark:bg-[var(--color-wa-panel-l)] rounded-2xl p-5 shadow-[0_1px_4px_rgba(0,0,0,0.08)]">
                    <MiniCalendar {...calendarProps} />
                  </div>
                  <div className="bg-white dark:bg-[var(--color-wa-panel-l)] rounded-2xl p-5 shadow-[0_1px_4px_rgba(0,0,0,0.08)]">
                    <PendingModule
                      appointments={pendingAppointments}
                      onEstado={changeStatus}
                      onJump={jumpToDay}
                    />
                  </div>
                </div>
                {/* Right: day panel card */}
                <div className="flex-1 bg-white dark:bg-[var(--color-wa-panel-l)] rounded-2xl shadow-[0_1px_4px_rgba(0,0,0,0.08)] overflow-hidden flex flex-col">
                  <DayPanel {...dayPanelProps} />
                </div>
          </div>
          </div>

          {/* Mobile: collapsible mini calendar + day panel stacked */}
          <div className="md:hidden flex flex-col flex-1 overflow-hidden">
            <TurnosToolbarMobile
              total={turnosDelDia.length}
              confirmados={confirmadosDelDia}
              atendidos={atendidosDelDia}
              agenda={agendaCortaDelDia}
              searchQuery={searchQuery}
              onSearchChange={setSearchQuery}
              statusFilter={statusFilter}
              onStatusFilterChange={setStatusFilter}
              profesionales={resources}
              profesionalFilter={profesionalFilter}
              onProfesionalFilterChange={setProfesionalFilter}
              onIrAHoy={irAHoy}
              onIrAManana={irAManana}
              onIrAFinde={irAFinde}
            />
            {/* En el celular ésta es la ÚNICA cabecera de día: se lleva el
                conteo y el botón de turno nuevo que antes repetía el DayPanel
                justo debajo, con la misma fecha escrita dos veces. Por eso el
                panel de abajo va en modo `compacto`. */}
            <div className="flex-shrink-0 bg-[var(--color-wa-panel-l)] border-b border-[var(--color-wa-sep)]">
              <div className="flex items-center gap-2 pr-3">
                <button
                  onClick={() => setCalendarOpen((v) => !v)}
                  aria-expanded={calendarOpen}
                  className="flex-1 min-w-0 flex items-center gap-2 px-4 py-3 cursor-pointer text-left"
                >
                  {/* Sin `capitalize`: la clase pone mayúscula en CADA palabra y
                      dejaba "Martes 1 De Septiembre". El texto ya viene con la
                      inicial en mayúscula desde formatDateLabel. */}
                  <span className="text-sm font-semibold text-[var(--color-wa-text-main)] truncate">
                    {formatDateLabel(selectedDay)}
                  </span>
                  <span
                    className={`text-[11px] font-extrabold px-2 py-0.5 rounded-full border whitespace-nowrap shrink-0 ${
                      turnosVisiblesDelDia === 0
                        ? "bg-[var(--color-wa-hover)] text-[var(--color-wa-text-sec)] border-[var(--color-wa-sep)]"
                        : "bg-teal-500/10 text-teal-600 dark:text-teal-400 border-teal-500/20"
                    }`}
                  >
                    {turnosVisiblesDelDia}
                  </span>
                  <svg
                    className={`w-4 h-4 shrink-0 ml-auto text-[var(--color-wa-text-sec)] transition-transform duration-200 ${calendarOpen ? "rotate-180" : ""}`}
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2.5}
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
                  </svg>
                </button>
                <button
                  onClick={() => openModal(selectedDay)}
                  className="shrink-0 w-9 h-9 bg-teal-500 text-white rounded-xl font-bold active:scale-95 transition-all shadow-md flex items-center justify-center cursor-pointer"
                  aria-label="Nuevo turno"
                  title="Nuevo turno"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 5v14m-7-7h14" />
                  </svg>
                </button>
              </div>
              {/* MiniCalendar en modo compacto: arranca en la semana del día
                  elegido, y el mes entero queda detrás de "Ver mes completo".
                  Se monta y desmonta con `calendarOpen`, así que cada vez que
                  se vuelve a abrir arranca otra vez en la fila de la semana. */}
              {calendarOpen && (
                <div className="px-4 pb-4">
                  <MiniCalendar {...calendarProps} compact />
                </div>
              )}
            </div>
            <div className="flex-1 overflow-hidden flex flex-col">
              <DayPanel {...dayPanelProps} compacto />
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
                  className={`${claseInput} w-full`}
                />
              </div>

              {/* Servicio primero: define la duración del turno y el precio, y
                  filtra qué profesionales pueden tomarlo. */}
              <div>
                <label className="block text-sm font-medium text-[var(--color-wa-text-sec)] mb-1">Servicio</label>
                <Select
                  value={modalServicio}
                  onChange={(e) => {
                    setModalServicio(Number(e.target.value));
                    setModalSlot("");
                  }}
                  className={claseInput}
                  wrapperClassName="w-full"
                >
                  <option value={0}>Elegí un servicio…</option>
                  {servicios.map((sv) => (
                    <option key={sv.id} value={sv.id}>
                      {sv.nombre} — {sv.duracion_min} min — {plata(sv.precio)}
                    </option>
                  ))}
                </Select>
              </div>

              <div>
                <label className="block text-sm font-medium text-[var(--color-wa-text-sec)] mb-1">Profesional</label>
                <Select
                  value={modalResource}
                  onChange={(e) => {
                    setModalResource(Number(e.target.value));
                    setModalSlot("");
                  }}
                  className={claseInput}
                  wrapperClassName="w-full"
                >
                  <option value={0}>Elegí un profesional…</option>
                  {profesionalesDelServicio.map((r) => (
                    <option key={r.id} value={r.id}>{r.nombre}</option>
                  ))}
                </Select>
                {modalServicio > 0 && profesionalesDelServicio.length === 0 && (
                  <p className="text-xs mt-1" style={{ color: "var(--color-wa-alerta)" }}>
                    Ningún profesional activo hace ese servicio. Asignalo en Config → Personal.
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-[var(--color-wa-text-sec)] mb-1">Horario</label>
                {!modalServicio || !modalResource ? (
                  <p className="text-sm text-[var(--color-wa-text-sec)] italic">
                    Elegí servicio y profesional para ver los horarios libres.
                  </p>
                ) : modalSlots.length === 0 ? (
                  <p className="text-sm text-[var(--color-wa-text-sec)] italic">
                    Sin disponibilidad ese día para esa combinación.
                  </p>
                ) : (
                  <div className="grid grid-cols-4 gap-2">
                    {modalSlots.map((s) => (
                      <button
                        key={s.hora_inicio}
                        type="button"
                        onClick={() => setModalSlot(s.hora_inicio)}
                        className={`tnum text-sm py-2 rounded-lg border transition-colors ${
                          modalSlot === s.hora_inicio
                            ? "bg-[var(--color-wa-green)] text-[var(--color-wa-green-text)] border-[var(--color-wa-green)]"
                            : "border-[var(--color-wa-sep)] text-[var(--color-wa-text-main)] hover:border-[var(--color-wa-green)]"
                        }`}
                      >
                        {formatTime(s.hora_inicio)}
                      </button>
                    ))}
                  </div>
                )}
              </div>


              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-sm font-medium text-[var(--color-wa-text-sec)] mb-1">Nombre</label>
                  <input
                    type="text"
                    value={modalName}
                    onChange={(e) => setModalName(e.target.value)}
                    placeholder="Nombre"
                    className={`${claseInput} w-full placeholder:text-[var(--color-wa-text-sec)]`}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[var(--color-wa-text-sec)] mb-1">Teléfono</label>
                  <input
                    type="tel"
                    value={modalPhone}
                    onChange={(e) => setModalPhone(e.target.value)}
                    placeholder="+54 9..."
                    className={`${claseInput} w-full placeholder:text-[var(--color-wa-text-sec)]`}
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
                  className={`${claseArea} w-full resize-none placeholder:text-[var(--color-wa-text-sec)]`}
                />
              </div>

              {/* Solo al crear: al editar, el descuento ya aplicado no se toca
                  desde acá para no consumir un uso de más. */}
              {!editingAppointment && (
                <div>
                  <label className="block text-sm font-medium text-[var(--color-wa-text-sec)] mb-1">
                    Código de descuento (opcional)
                  </label>
                  <input
                    type="text"
                    value={modalCodigo}
                    onChange={(e) => setModalCodigo(e.target.value.toUpperCase())}
                    placeholder="BIENVENIDO15"
                    className={`${claseInput} w-full uppercase placeholder:text-[var(--color-wa-text-sec)]`}
                  />
                </div>
              )}

              {modalError && (
                <p
                  className="text-sm rounded-lg px-3 py-2 border"
                  style={{ color: "var(--color-wa-error)", borderColor: "var(--color-wa-error)" }}
                >
                  {modalError}
                </p>
              )}
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
                disabled={!modalSlot || !modalServicio || !modalResource || savingModal}
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
