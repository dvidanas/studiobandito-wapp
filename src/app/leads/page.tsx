"use client";
import { useState, useEffect, useCallback } from "react";
import { Sidebar } from "@/components/Sidebar";

interface Lead {
  id: number;
  conversation_id: number;
  phone: string;
  name: string | null;
  business: string | null;
  problem: string | null;
  status: "nuevo" | "seguimiento" | "cerrado" | "descartado";
  notes: string | null;
  created_at: number;
  conv_phone: string;
  conv_name: string | null;
}

const STATUS_STYLES: Record<Lead["status"], string> = {
  nuevo: "bg-blue-500 text-white",
  seguimiento: "bg-yellow-500 text-white",
  cerrado: "bg-[var(--color-wa-green)] text-white",
  descartado: "bg-[var(--color-wa-sep)] text-[var(--color-wa-text-main)]",
};

const STATUS_LABELS: Record<Lead["status"], string> = {
  nuevo: "Nuevo",
  seguimiento: "Seguimiento",
  cerrado: "Cerrado",
  descartado: "Descartado",
};

function timeStr(ts: number): string {
  return new Date(ts * 1000).toLocaleDateString("es-AR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

export default function LeadsPage() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [editingNotes, setEditingNotes] = useState<Record<number, string>>({});
  const [confirmDelete, setConfirmDelete] = useState<number | null>(null);

  const fetchLeads = useCallback(async () => {
    try {
      const res = await fetch("/api/leads");
      if (res.ok) setLeads(await res.json());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchLeads();
    const interval = setInterval(fetchLeads, 5000);
    return () => clearInterval(interval);
  }, [fetchLeads]);

  const selectedLead = leads.find((l) => l.id === selectedId) ?? null;

  async function changeStatus(id: number, status: Lead["status"]) {
    await fetch(`/api/leads/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    setLeads((prev) => prev.map((l) => (l.id === id ? { ...l, status } : l)));
  }

  async function saveNotes(id: number) {
    const notes = editingNotes[id] ?? "";
    await fetch(`/api/leads/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ notes }),
    });
    setLeads((prev) => prev.map((l) => (l.id === id ? { ...l, notes } : l)));
    setEditingNotes((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
  }

  async function deleteLead(id: number) {
    await fetch(`/api/leads/${id}`, { method: "DELETE" });
    setLeads((prev) => prev.filter((l) => l.id !== id));
    setConfirmDelete(null);
    if (selectedId === id) setSelectedId(null);
  }

  const newCount = leads.filter((l) => l.status === "nuevo").length;

  return (
    <div className="flex h-screen bg-[var(--color-wa-bg-main)]">
      <Sidebar newLeadsCount={newCount} />

      {/* Center column: Leads list */}
      <aside className="w-[340px] flex-shrink-0 bg-[var(--color-wa-panel-l)] border-r border-[var(--color-wa-sep)] flex flex-col">
        <div className="px-4 py-3 bg-[var(--color-wa-header)] border-b border-[var(--color-wa-sep)] flex items-center justify-between">
          <div>
            <h2 className="text-sm font-semibold text-[var(--color-wa-text-main)]">Leads</h2>
            <p className="text-xs text-[var(--color-wa-text-sec)]">{leads.length} contactos</p>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <p className="text-center p-4 text-[var(--color-wa-text-sec)] text-sm">Cargando...</p>
          ) : leads.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full p-4 text-center">
              <p className="text-sm text-[var(--color-wa-text-sec)]">Sin leads todavía</p>
            </div>
          ) : (
            <ul>
              {leads.map((lead) => (
                <li key={lead.id}>
                  <button
                    onClick={() => setSelectedId(lead.id)}
                    className={`w-full text-left px-4 py-3 flex items-center gap-3 border-b border-[var(--color-wa-sep)] hover:bg-[var(--color-wa-hover)] transition-colors ${
                      selectedId === lead.id ? "bg-[var(--color-wa-hover)]" : ""
                    }`}
                  >
                    <div className="w-12 h-12 rounded-full bg-[var(--color-wa-sep)] flex items-center justify-center flex-shrink-0 text-sm font-semibold text-[var(--color-wa-text-sec)]">
                      {(lead.conv_name ?? lead.conv_phone).slice(0, 1).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-center">
                        <span className="text-base font-medium text-[var(--color-wa-text-main)] truncate">
                          {lead.conv_name ?? `+${lead.conv_phone}`}
                        </span>
                        <span className="text-[10px] text-[var(--color-wa-text-sec)]">{timeStr(lead.created_at)}</span>
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        <span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${STATUS_STYLES[lead.status]}`}>
                          {STATUS_LABELS[lead.status]}
                        </span>
                        <span className="text-sm text-[var(--color-wa-text-sec)] truncate">
                          {lead.business || "Sin negocio"}
                        </span>
                      </div>
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </aside>

      {/* Right column: Lead detail */}
      <main className="flex-1 bg-[var(--color-wa-panel-r)] flex flex-col overflow-y-auto">
        {selectedLead ? (
          <div className="p-8 max-w-2xl w-full mx-auto">
            <div className="bg-[var(--color-wa-panel-l)] rounded-xl shadow-sm border border-[var(--color-wa-sep)] overflow-hidden">
              <div className="px-6 py-6 border-b border-[var(--color-wa-sep)] flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 rounded-full bg-[var(--color-wa-sep)] flex items-center justify-center text-xl font-semibold text-[var(--color-wa-text-sec)]">
                    {(selectedLead.conv_name ?? selectedLead.conv_phone).slice(0, 1).toUpperCase()}
                  </div>
                  <div>
                    <h2 className="text-xl font-semibold text-[var(--color-wa-text-main)]">
                      {selectedLead.conv_name ?? `+${selectedLead.conv_phone}`}
                    </h2>
                    <p className="text-[var(--color-wa-text-sec)]">+{selectedLead.conv_phone}</p>
                  </div>
                </div>
                <div>
                  <select
                    value={selectedLead.status}
                    onChange={(e) => changeStatus(selectedLead.id, e.target.value as Lead["status"])}
                    className={`text-sm font-semibold px-3 py-1.5 rounded-lg border-0 cursor-pointer outline-none ${STATUS_STYLES[selectedLead.status]}`}
                  >
                    {(Object.keys(STATUS_LABELS) as Lead["status"][]).map((s) => (
                      <option key={s} value={s}>{STATUS_LABELS[s]}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="p-6 space-y-6">
                <div>
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-[var(--color-wa-text-sec)] mb-2">Detalles del Lead</h3>
                  <div className="bg-[var(--color-wa-bg-main)] rounded-lg p-4 space-y-3">
                    <div>
                      <p className="text-xs text-[var(--color-wa-text-sec)]">Teléfono de contacto</p>
                      <p className="text-[var(--color-wa-text-main)] font-mono text-sm mt-0.5">{selectedLead.phone}</p>
                    </div>
                    <div>
                      <p className="text-xs text-[var(--color-wa-text-sec)]">Negocio / Empresa</p>
                      <p className="text-[var(--color-wa-text-main)] mt-0.5">{selectedLead.business || "No especificado"}</p>
                    </div>
                    <div>
                      <p className="text-xs text-[var(--color-wa-text-sec)]">Problema / Consulta</p>
                      <p className="text-[var(--color-wa-text-main)] mt-0.5">{selectedLead.problem || "No especificado"}</p>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-[var(--color-wa-text-sec)] mb-2">Notas internas</h3>
                  {selectedLead.id in editingNotes ? (
                    <div className="flex flex-col gap-2">
                      <textarea
                        autoFocus
                        rows={3}
                        className="w-full text-sm bg-[var(--color-wa-input)] border border-[var(--color-wa-sep)] rounded-lg p-3 text-[var(--color-wa-text-main)] focus:outline-none focus:border-[var(--color-wa-green)]"
                        value={editingNotes[selectedLead.id]}
                        onChange={(e) => setEditingNotes((prev) => ({ ...prev, [selectedLead.id]: e.target.value }))}
                      />
                      <div className="flex gap-2">
                        <button
                          onClick={() => saveNotes(selectedLead.id)}
                          className="px-4 py-2 bg-[var(--color-wa-green)] text-white text-sm font-medium rounded-lg hover:bg-[var(--color-wa-green-dark)] transition-colors"
                        >
                          Guardar
                        </button>
                        <button
                          onClick={() => {
                            setEditingNotes((prev) => {
                              const next = { ...prev };
                              delete next[selectedLead.id];
                              return next;
                            });
                          }}
                          className="px-4 py-2 bg-[var(--color-wa-sep)] text-[var(--color-wa-text-main)] text-sm font-medium rounded-lg transition-colors"
                        >
                          Cancelar
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div
                      onClick={() => setEditingNotes((prev) => ({ ...prev, [selectedLead.id]: selectedLead.notes ?? "" }))}
                      className="w-full min-h-[80px] p-4 bg-[var(--color-wa-bg-main)] rounded-lg cursor-pointer hover:bg-[var(--color-wa-hover)] transition-colors border border-transparent hover:border-[var(--color-wa-sep)] text-[var(--color-wa-text-main)]"
                    >
                      {selectedLead.notes ? (
                        <p className="whitespace-pre-wrap text-sm">{selectedLead.notes}</p>
                      ) : (
                        <p className="text-sm italic text-[var(--color-wa-text-sec)]">Haz clic para añadir una nota...</p>
                      )}
                    </div>
                  )}
                </div>

                <div className="pt-4 border-t border-[var(--color-wa-sep)] flex justify-between items-center">
                  <a
                    href="/"
                    className="text-sm font-medium text-[var(--color-wa-green)] hover:underline"
                  >
                    Ver conversación →
                  </a>
                  {confirmDelete === selectedLead.id ? (
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => deleteLead(selectedLead.id)}
                        className="px-3 py-1.5 bg-red-500 text-white text-sm rounded hover:bg-red-600"
                      >
                        Eliminar
                      </button>
                      <button
                        onClick={() => setConfirmDelete(null)}
                        className="px-3 py-1.5 text-sm text-[var(--color-wa-text-sec)]"
                      >
                        Cancelar
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setConfirmDelete(selectedLead.id)}
                      className="text-sm text-red-500 hover:underline"
                    >
                      Eliminar Lead
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-center px-8">
            <svg className="w-16 h-16 text-[var(--color-wa-text-sec)] opacity-20 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            <h1 className="text-2xl font-light text-[var(--color-wa-text-main)] mb-2">Seleccioná un Lead</h1>
            <p className="text-sm text-[var(--color-wa-text-sec)]">
              Revisá la información recolectada y cambiale el estado o agregá notas internas.
            </p>
          </div>
        )}
      </main>
    </div>
  );
}
