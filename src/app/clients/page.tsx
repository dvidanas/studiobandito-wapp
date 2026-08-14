"use client";
import { useState, useEffect, useMemo, useCallback } from "react";
import { TopNav, BottomNav } from "@/components/TopNav";
import { PullToRefresh } from "@/components/PullToRefresh";

interface Client {
  id: number;
  name: string;
  phone: string;
  created_at: string;
  notes: string | null;
}

interface Appointment {
  id: number;
  service: string | null;
  date: string;
  time_start: string;
  time_end: string;
  status: "pending" | "confirmed" | "cancelled";
}

const STATUS_LABELS = { pending: "Pendiente", confirmed: "Confirmado", cancelled: "Cancelado" };
const STATUS_COLORS = {
  pending: "text-amber-500 dark:text-amber-400",
  confirmed: "text-teal-500 dark:text-teal-400",
  cancelled: "text-red-500 dark:text-red-400",
};

const MONTH_NAMES = ["Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"];

function formatDateLabel(str: string): string {
  const d = new Date(str + "T12:00:00Z");
  return `${d.getUTCDate()} de ${MONTH_NAMES[d.getUTCMonth()].toLowerCase()}`;
}
function formatTime(t: string): string {
  return t.slice(0, 5);
}

function ClientHistoryPanel({ clientId }: { clientId: number | null }) {
  const [client, setClient] = useState<Client | null>(null);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (clientId === null) {
      setClient(null);
      setAppointments([]);
      return;
    }
    setLoading(true);
    fetch(`/api/clients/${clientId}`)
      .then((r) => r.json())
      .then((data) => {
        setClient(data.client ?? null);
        setAppointments(data.appointments ?? []);
      })
      .finally(() => setLoading(false));
  }, [clientId]);

  if (clientId === null) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
        <svg className="w-12 h-12 text-[var(--color-wa-text-sec)] opacity-20 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
        </svg>
        <p className="text-base text-[var(--color-wa-text-sec)]">Elegí un cliente para ver su historial</p>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <div className="px-4 py-3 border-b border-[var(--color-wa-sep)] flex-shrink-0">
        <h2 className="text-base font-semibold text-[var(--color-wa-text-main)]">
          {client?.name ?? "Cargando..."}
        </h2>
        {client?.phone && (
          <p className="text-sm text-[var(--color-wa-text-sec)]">{client.phone}</p>
        )}
      </div>
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {loading ? (
          <div className="space-y-3">
            {[1, 2].map((i) => (
              <div key={i} className="h-16 rounded-xl bg-[var(--color-wa-sep)] animate-pulse" />
            ))}
          </div>
        ) : appointments.length === 0 ? (
          <p className="text-sm text-[var(--color-wa-text-sec)] text-center py-8">Sin turnos registrados</p>
        ) : (
          appointments.map((a) => (
            <div
              key={a.id}
              className="flex items-center justify-between gap-3 p-3.5 rounded-xl border border-[var(--color-wa-sep)] bg-[var(--color-wa-panel-l)]"
            >
              <div className="min-w-0">
                <p className="text-sm font-semibold text-[var(--color-wa-text-main)] capitalize">
                  {formatDateLabel(a.date)} · {formatTime(a.time_start)}
                </p>
                {a.service && (
                  <p className="text-xs text-[var(--color-wa-text-sec)] truncate mt-0.5">{a.service}</p>
                )}
              </div>
              <span className={`text-xs font-bold flex-shrink-0 ${STATUS_COLORS[a.status]}`}>
                {STATUS_LABELS[a.status]}
              </span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

export default function ClientsPage() {
  const [clients, setClients] = useState<Client[]>([]);
  const [appointmentCounts, setAppointmentCounts] = useState<Record<number, number>>({});
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<number | null>(null);

  const fetchData = useCallback(async () => {
    const url = query ? `/api/clients?q=${encodeURIComponent(query)}` : "/api/clients";
    const res = await fetch(url);
    if (res.ok) {
      const data = await res.json();
      setClients(data.clients ?? []);
    }
    setLoading(false);
  }, [query]);

  useEffect(() => {
    setLoading(true);
    const timeout = setTimeout(fetchData, 250);
    return () => clearTimeout(timeout);
  }, [fetchData]);

  useEffect(() => {
    Promise.all(
      clients.map((c) =>
        fetch(`/api/clients/${c.id}`)
          .then((r) => r.json())
          .then((data) => [c.id, data.appointments?.length ?? 0] as const)
          .catch(() => [c.id, 0] as const)
      )
    ).then((entries) => {
      setAppointmentCounts(Object.fromEntries(entries));
    });
  }, [clients]);

  const filteredClients = useMemo(() => clients, [clients]);

  return (
    <div className="flex flex-col h-dvh bg-[var(--color-wa-bg-main)]">
      <TopNav />

      <main className="flex-1 flex flex-col overflow-hidden">
        <PullToRefresh onRefresh={fetchData} className="flex-1 flex flex-col overflow-hidden">
          <div className="flex flex-1 overflow-hidden md:p-3 md:gap-3">
            {/* Left: search + list */}
            <div className="w-full md:w-[380px] flex-shrink-0 bg-white dark:bg-[var(--color-wa-panel-l)] md:rounded-2xl shadow-[0_1px_4px_rgba(0,0,0,0.08)] overflow-hidden flex flex-col">
              <div className="p-4 border-b border-[var(--color-wa-sep)] flex-shrink-0">
                <input
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Buscar por nombre o teléfono..."
                  className="w-full text-sm bg-[var(--color-wa-input)] border border-[var(--color-wa-sep)] rounded-lg px-3 py-2.5 text-[var(--color-wa-text-main)] focus:outline-none focus:border-[var(--color-wa-green)] placeholder:text-[var(--color-wa-text-sec)]"
                />
              </div>
              <div className="flex-1 overflow-y-auto">
                {loading ? (
                  <div className="p-4 space-y-3">
                    {[1, 2, 3].map((i) => (
                      <div key={i} className="h-14 rounded-xl bg-[var(--color-wa-sep)] animate-pulse" />
                    ))}
                  </div>
                ) : filteredClients.length === 0 ? (
                  <p className="text-sm text-[var(--color-wa-text-sec)] text-center py-8">Sin clientes</p>
                ) : (
                  filteredClients.map((c) => {
                    const isActive = c.id === selectedId;
                    return (
                      <button
                        key={c.id}
                        onClick={() => setSelectedId(c.id)}
                        className={`w-full text-left px-4 py-3 border-b border-[var(--color-wa-sep)] transition-colors ${
                          isActive ? "bg-[var(--color-wa-hover)]" : "hover:bg-[var(--color-wa-hover)]"
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-sm font-semibold text-[var(--color-wa-text-main)] truncate">{c.name}</p>
                          <span className="text-xs text-[var(--color-wa-text-sec)] flex-shrink-0">
                            {appointmentCounts[c.id] ?? 0} turno{(appointmentCounts[c.id] ?? 0) !== 1 ? "s" : ""}
                          </span>
                        </div>
                        <p className="text-xs text-[var(--color-wa-text-sec)] mt-0.5">{c.phone}</p>
                      </button>
                    );
                  })
                )}
              </div>
            </div>

            {/* Right: history panel */}
            <div className="hidden md:flex flex-1 bg-white dark:bg-[var(--color-wa-panel-l)] rounded-2xl shadow-[0_1px_4px_rgba(0,0,0,0.08)] overflow-hidden flex-col">
              <ClientHistoryPanel clientId={selectedId} />
            </div>
          </div>
        </PullToRefresh>
      </main>

      {/* Mobile: history as overlay when a client is selected */}
      {selectedId !== null && (
        <div className="md:hidden fixed inset-0 z-50 bg-[var(--color-wa-bg-main)] flex flex-col">
          <div className="h-14 flex-shrink-0 flex items-center gap-3 px-4 border-b border-[var(--color-wa-sep)] bg-[var(--color-wa-header)]">
            <button onClick={() => setSelectedId(null)} className="text-[var(--color-wa-text-sec)]">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <span className="text-sm font-semibold text-[var(--color-wa-text-main)]">Historial</span>
          </div>
          <ClientHistoryPanel clientId={selectedId} />
        </div>
      )}

      <BottomNav />
    </div>
  );
}
