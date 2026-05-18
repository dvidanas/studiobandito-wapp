"use client";
import { useState, useEffect, useCallback, useRef } from "react";
import { TopNav } from "@/components/TopNav";
import { KanbanBoard } from "@/components/KanbanBoard";

interface Lead {
  id: number;
  conversation_id: number;
  phone: string;
  name: string | null;
  business: string | null;
  problem: string | null;
  status: "nuevo" | "seguimiento" | "cerrado" | "descartado";
  notes: string | null;
  summary: string | null;
  created_at: number;
  updated_at: number;
  conv_phone: string;
  conv_name: string | null;
}

interface SummaryData {
  resumen: string;
  interes: string;
  temperatura: "frio" | "tibio" | "caliente";
  siguiente_paso: string;
}

interface PreviewMessage {
  role: string;
  content: string;
  created_at: number;
}

interface DetailData {
  conversation: { id: number; mode: string; last_message_at: number | null };
  messages: PreviewMessage[];
}

const STATUS_STYLES: Record<Lead["status"], string> = {
  nuevo: "bg-blue-500 text-[var(--color-wa-green-text)]",
  seguimiento: "bg-yellow-500 text-[var(--color-wa-green-text)]",
  cerrado: "bg-[var(--color-wa-green)] text-[var(--color-wa-green-text)]",
  descartado: "bg-[var(--color-wa-sep)] text-[var(--color-wa-text-main)]",
};

const STATUS_LABELS: Record<Lead["status"], string> = {
  nuevo: "Nuevo",
  seguimiento: "Seguimiento",
  cerrado: "Cerrado",
  descartado: "Descartado",
};

function timeStr(ts: number): string {
  const diff = Math.floor(Date.now() / 1000) - ts;
  if (diff < 60) return "ahora";
  if (diff < 3600) return `hace ${Math.floor(diff / 60)} min`;
  if (diff < 86400) return `hace ${Math.floor(diff / 3600)} h`;
  return `hace ${Math.floor(diff / 86400)} d`;
}

function parseSummary(s: string | null | undefined): SummaryData | null {
  if (!s) return null;
  try { return JSON.parse(s) as SummaryData; } catch { return null; }
}

function tempAvatarBg(temp: string | null | undefined): string {
  if (temp === "caliente") return "bg-red-500";
  if (temp === "tibio") return "bg-yellow-500";
  if (temp === "frio") return "bg-blue-500";
  return "bg-[var(--color-wa-sep)]";
}

function tempAvatarText(temp: string | null | undefined): string {
  return temp ? "text-[var(--color-wa-green-text)]" : "text-[var(--color-wa-text-sec)]";
}

function tempBadgeStyle(temp: string): string {
  if (temp === "caliente") return "bg-red-100 text-red-700";
  if (temp === "tibio") return "bg-yellow-100 text-yellow-700";
  return "bg-blue-100 text-blue-700";
}

function tempEmoji(temp: string): string {
  if (temp === "caliente") return "🔥";
  if (temp === "tibio") return "🌡";
  return "❄️";
}

function displayName(lead: Lead): string {
  return lead.conv_name ?? lead.name ?? `+${lead.conv_phone}`;
}

export default function LeadsPage() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [detail, setDetail] = useState<DetailData | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [loadingSummary, setLoadingSummary] = useState(false);
  const [editingField, setEditingField] = useState<{ field: string; value: string } | null>(null);
  const [notes, setNotes] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [copiedPhone, setCopiedPhone] = useState(false);
  const [mobileView, setMobileView] = useState<"list" | "detail">("list");
  const [viewMode, setViewMode] = useState<"list" | "kanban">("kanban");

  const notesTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchLeads = useCallback(async () => {
    try {
      const res = await fetch("/api/leads");
      if (res.ok) {
        const data = await res.json();
        setLeads(data.leads ?? data);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchLeads();
    const interval = setInterval(fetchLeads, 5000);
    return () => clearInterval(interval);
  }, [fetchLeads]);

  useEffect(() => {
    if (!selectedId) { setDetail(null); return; }
    setLoadingDetail(true);
    setConfirmDelete(false);
    setEditingField(null);
    fetch(`/api/leads/${selectedId}`)
      .then((r) => r.ok ? r.json() : null)
      .then((data) => {
        if (data) {
          setDetail(data);
          setNotes(data.lead?.notes ?? "");
        }
      })
      .finally(() => setLoadingDetail(false));
  }, [selectedId]);

  const selectedLead = leads.find((l) => l.id === selectedId) ?? null;
  const summary = parseSummary(selectedLead?.summary);
  const previewMessages = detail?.messages.slice(-5) ?? [];

  async function changeStatus(id: number, status: Lead["status"]) {
    setLeads((prev) => prev.map((l) => (l.id === id ? { ...l, status } : l)));
    await fetch(`/api/leads/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
  }

  async function saveField(field: string, value: string) {
    if (!selectedId) return;
    setEditingField(null);
    setLeads((prev) => prev.map((l) => (l.id === selectedId ? { ...l, [field]: value } : l)));
    await fetch(`/api/leads/${selectedId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ [field]: value }),
    });
  }

  function handleNotesChange(value: string) {
    setNotes(value);
    if (notesTimer.current) clearTimeout(notesTimer.current);
    notesTimer.current = setTimeout(() => {
      if (!selectedId) return;
      setLeads((prev) => prev.map((l) => (l.id === selectedId ? { ...l, notes: value } : l)));
      fetch(`/api/leads/${selectedId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notes: value }),
      });
    }, 900);
  }

  async function generateSummary() {
    if (!selectedId) return;
    setLoadingSummary(true);
    try {
      const res = await fetch(`/api/leads/${selectedId}/summary`);
      if (res.ok) {
        const data = await res.json();
        const summaryStr = JSON.stringify(data);
        setLeads((prev) => prev.map((l) => (l.id === selectedId ? { ...l, summary: summaryStr } : l)));
      }
    } finally {
      setLoadingSummary(false);
    }
  }

  async function deleteLead(id: number) {
    await fetch(`/api/leads/${id}`, { method: "DELETE" });
    setLeads((prev) => prev.filter((l) => l.id !== id));
    setSelectedId(null);
    setDetail(null);
    setConfirmDelete(false);
    setMobileView("list");
  }

  function handleSelectLead(id: number) {
    setSelectedId(id);
    setMobileView("detail");
  }

  function handleBackToList() {
    setMobileView("list");
  }

  async function copyPhone(phone: string) {
    await navigator.clipboard.writeText(`+${phone}`);
    setCopiedPhone(true);
    setTimeout(() => setCopiedPhone(false), 2000);
  }

  const newCount = leads.filter((l) => l.status === "nuevo").length;

  return (
    <div className="flex flex-col h-dvh bg-[var(--color-wa-bg-main)]">
      <TopNav />
      <div className="px-5 py-3 flex flex-wrap gap-3 items-center justify-between border-b border-[var(--color-wa-sep)] bg-[var(--color-wa-panel-l)]">
        <div>
          <h1 className="text-lg font-semibold text-[var(--color-wa-text-main)]">Gestión de Leads</h1>
          <p className="text-sm text-[var(--color-wa-text-sec)]">{leads.length} contactos en total</p>
        </div>
        <div className="flex bg-[var(--color-wa-bg-main)] rounded-lg p-1 border border-[var(--color-wa-sep)]">
          <button onClick={() => setViewMode('list')} className={`px-4 py-1.5 text-sm font-semibold rounded-md transition-colors ${viewMode === 'list' ? 'bg-white dark:bg-[var(--color-wa-panel-l)] shadow text-[var(--color-wa-text-main)]' : 'text-[var(--color-wa-text-sec)] hover:text-[var(--color-wa-text-main)]'}`}>Lista</button>
          <button onClick={() => setViewMode('kanban')} className={`px-4 py-1.5 text-sm font-semibold rounded-md transition-colors ${viewMode === 'kanban' ? 'bg-white dark:bg-[var(--color-wa-panel-l)] shadow text-[var(--color-wa-text-main)]' : 'text-[var(--color-wa-text-sec)] hover:text-[var(--color-wa-text-main)]'}`}>Tablero</button>
        </div>
      </div>
      <div className="flex flex-1 overflow-hidden md:p-3 md:gap-3">
        {viewMode === 'kanban' ? (
          <KanbanBoard leads={leads} onSelectLead={handleSelectLead} onStatusChange={changeStatus} />
        ) : (
          <>

      {/* Center column */}
      <aside className={`
        ${mobileView === "detail" ? "hidden" : "flex"} md:flex
        w-full md:w-[350px] md:flex-shrink-0
        bg-white dark:bg-[var(--color-wa-panel-l)] flex-col
        md:rounded-2xl md:shadow-[0_1px_4px_rgba(0,0,0,0.08)] md:overflow-hidden
      `}>
        <div className="px-4 py-3 bg-[var(--color-wa-header)] border-b border-[var(--color-wa-sep)]">
          <h2 className="text-base font-semibold text-[var(--color-wa-text-main)]">Leads</h2>
          <p className="text-sm text-[var(--color-wa-text-sec)]">{leads.length} contactos</p>
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
              {leads.map((lead) => {
                const sm = parseSummary(lead.summary);
                return (
                  <li key={lead.id}>
                    <button
                      onClick={() => handleSelectLead(lead.id)}
                      className={`w-full text-left px-4 py-4 flex items-center gap-3 border-b border-[var(--color-wa-sep)] hover:bg-[var(--color-wa-hover)] active:bg-[var(--color-wa-hover)] transition-colors ${
                        selectedId === lead.id ? "bg-[var(--color-wa-hover)]" : ""
                      }`}
                    >
                      {/* Avatar Removed */}
                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-center gap-1">
                          <span className="text-base font-medium text-[var(--color-wa-text-main)] truncate">
                            {displayName(lead)}
                          </span>
                          <span className="text-xs text-[var(--color-wa-text-sec)] flex-shrink-0">{timeStr(lead.created_at)}</span>
                        </div>
                        <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                          <span className={`px-1.5 py-0.5 rounded text-xs font-semibold ${STATUS_STYLES[lead.status]}`}>
                            {STATUS_LABELS[lead.status]}
                          </span>
                          {sm ? (
                            <span className={`px-1.5 py-0.5 rounded text-xs font-semibold ${tempBadgeStyle(sm.temperatura)}`}>
                              {tempEmoji(sm.temperatura)} {sm.temperatura}
                            </span>
                          ) : (
                            <span className="text-sm text-[var(--color-wa-text-sec)] truncate">
                              {lead.business || `+${lead.conv_phone}`}
                            </span>
                          )}
                        </div>
                      </div>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </aside>

      {/* Right column: detail */}
      <main className={`
        ${mobileView === "list" ? "hidden" : "flex"} md:flex
        flex-1 bg-white dark:bg-[var(--color-wa-panel-r)] flex-col overflow-y-auto
        md:rounded-2xl md:shadow-[0_1px_4px_rgba(0,0,0,0.08)] md:overflow-hidden
      `}>
        {!selectedLead ? (
          <div className="flex flex-col items-center justify-center h-full text-center px-8">
            <svg className="w-16 h-16 text-[var(--color-wa-text-sec)] opacity-20 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            <h1 className="text-2xl font-light text-[var(--color-wa-text-main)] mb-2">Seleccioná un Lead</h1>
            <p className="text-sm text-[var(--color-wa-text-sec)]">
              Revisá la información recolectada, generá un resumen IA y cambiá el estado.
            </p>
          </div>
        ) : loadingDetail && !detail ? (
          <div className="flex items-center justify-center h-full">
            <p className="text-sm text-[var(--color-wa-text-sec)]">Cargando...</p>
          </div>
        ) : (
          <div className="p-5 max-w-2xl w-full mx-auto space-y-4 pb-12">

            {/* Mobile back button */}
            <button
              onClick={handleBackToList}
              className="md:hidden flex items-center gap-2 text-sm text-[var(--color-wa-text-sec)] active:text-[var(--color-wa-text-main)] -mt-1 mb-1 min-h-[44px]"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
              </svg>
              Volver a leads
            </button>

            {/* HEADER */}
            <div className="bg-[var(--color-wa-panel-l)] rounded-xl border border-[var(--color-wa-sep)] p-5 flex items-start justify-between gap-4">
              <div className="flex items-center gap-4">
                {/* Avatar Removed */}
                <div>
                  <h2 className="text-lg font-semibold text-[var(--color-wa-text-main)] leading-tight">
                    {displayName(selectedLead)}
                  </h2>
                  <button
                    onClick={() => copyPhone(selectedLead.conv_phone)}
                    className="text-sm text-[var(--color-wa-text-sec)] hover:text-[var(--color-wa-text-main)] transition-colors flex items-center gap-1 mt-0.5"
                  >
                    +{selectedLead.conv_phone}
                    <span className="text-xs ml-1 opacity-70">{copiedPhone ? "✓ copiado" : "⎘"}</span>
                  </button>
                  <p className="text-xs text-[var(--color-wa-text-sec)] mt-1">
                    Lead desde {new Date(selectedLead.created_at * 1000).toLocaleDateString("es-AR")}
                  </p>
                </div>
              </div>
              <select
                value={selectedLead.status}
                onChange={(e) => changeStatus(selectedLead.id, e.target.value as Lead["status"])}
                className={`text-sm font-semibold px-3 py-1.5 rounded-lg border-0 cursor-pointer outline-none flex-shrink-0 ${STATUS_STYLES[selectedLead.status]}`}
              >
                {(Object.keys(STATUS_LABELS) as Lead["status"][]).map((s) => (
                  <option key={s} value={s}>{STATUS_LABELS[s]}</option>
                ))}
              </select>
            </div>

            {/* RESUMEN IA */}
            <div className="bg-[var(--color-wa-panel-l)] rounded-xl border border-[var(--color-wa-sep)] p-5">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <span className="text-base leading-none">✨</span>
                  <h3 className="text-base font-semibold text-[var(--color-wa-text-main)]">Resumen de la conversación</h3>
                </div>
                {!summary && (
                  <button
                    onClick={generateSummary}
                    disabled={loadingSummary}
                    className="text-sm px-3 py-1.5 bg-[var(--color-wa-green)] text-[var(--color-wa-green-text)] rounded-lg hover:bg-[var(--color-wa-green-dark)] disabled:opacity-50 transition-colors"
                  >
                    {loadingSummary ? "Generando…" : "Generar resumen"}
                  </button>
                )}
              </div>
              {summary ? (
                <div className="space-y-2">
                  <div className="grid grid-cols-2 gap-2">
                    <div className="bg-[var(--color-wa-bg-main)] rounded-lg p-3">
                      <p className="text-xs font-semibold uppercase tracking-wider text-[var(--color-wa-text-sec)] mb-1">Qué busca</p>
                      <p className="text-sm text-[var(--color-wa-text-main)]">{summary.interes}</p>
                    </div>
                    <div className="bg-[var(--color-wa-bg-main)] rounded-lg p-3">
                      <p className="text-xs font-semibold uppercase tracking-wider text-[var(--color-wa-text-sec)] mb-1">Temperatura</p>
                      <span className={`inline-flex items-center gap-1 text-sm font-semibold px-2 py-0.5 rounded-full ${tempBadgeStyle(summary.temperatura)}`}>
                        {tempEmoji(summary.temperatura)} {summary.temperatura.charAt(0).toUpperCase() + summary.temperatura.slice(1)}
                      </span>
                    </div>
                  </div>
                  <div className="bg-[var(--color-wa-bg-main)] rounded-lg p-3">
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--color-wa-text-sec)] mb-1">Resumen</p>
                    <p className="text-sm text-[var(--color-wa-text-main)]">{summary.resumen}</p>
                  </div>
                  <div className="bg-[var(--color-wa-bg-main)] rounded-lg p-3">
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--color-wa-text-sec)] mb-1">Próximo paso</p>
                    <p className="text-sm text-[var(--color-wa-text-main)]">{summary.siguiente_paso}</p>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-[var(--color-wa-text-sec)] italic">
                  Generá un resumen automático usando IA para entender mejor qué quiere este contacto.
                </p>
              )}
            </div>

            {/* DATOS */}
            <div className="bg-[var(--color-wa-panel-l)] rounded-xl border border-[var(--color-wa-sep)] p-5">
              <h3 className="text-sm font-semibold uppercase tracking-wider text-[var(--color-wa-text-sec)] mb-3">Datos del contacto</h3>
              <div>
                {/* Teléfono */}
                <div className="flex items-center py-2.5 border-b border-[var(--color-wa-sep)] gap-3">
                  <span className="text-sm text-[var(--color-wa-text-sec)] w-20 flex-shrink-0">Teléfono</span>
                  <div className="flex items-center gap-2 flex-1">
                    <span className="text-sm font-mono text-[var(--color-wa-text-main)]">+{selectedLead.conv_phone}</span>
                    <button
                      onClick={() => copyPhone(selectedLead.conv_phone)}
                      className="text-xs text-[var(--color-wa-text-sec)] hover:text-[var(--color-wa-text-main)] transition-colors"
                      title="Copiar"
                    >
                      {copiedPhone ? "✓" : "⎘"}
                    </button>
                  </div>
                </div>

                {/* Nombre */}
                <div className="flex items-center py-2.5 border-b border-[var(--color-wa-sep)] gap-3">
                  <span className="text-sm text-[var(--color-wa-text-sec)] w-20 flex-shrink-0">Nombre</span>
                  {editingField?.field === "name" ? (
                    <input
                      autoFocus
                      type="text"
                      value={editingField.value}
                      onChange={(e) => setEditingField({ field: "name", value: e.target.value })}
                      onBlur={() => saveField("name", editingField.value)}
                      onKeyDown={(e) => e.key === "Enter" && saveField("name", editingField.value)}
                      className="flex-1 text-sm bg-[var(--color-wa-input)] border border-[var(--color-wa-sep)] rounded px-2 py-1 text-[var(--color-wa-text-main)] focus:outline-none focus:border-[var(--color-wa-green)]"
                    />
                  ) : (
                    <span
                      onClick={() => setEditingField({ field: "name", value: selectedLead.name ?? "" })}
                      className="flex-1 text-sm text-[var(--color-wa-text-main)] cursor-pointer hover:text-[var(--color-wa-green)] transition-colors"
                    >
                      {selectedLead.name ?? <span className="italic text-[var(--color-wa-text-sec)]">— clic para editar</span>}
                    </span>
                  )}
                </div>

                {/* Negocio */}
                <div className="flex items-center py-2.5 border-b border-[var(--color-wa-sep)] gap-3">
                  <span className="text-sm text-[var(--color-wa-text-sec)] w-20 flex-shrink-0">Negocio</span>
                  {editingField?.field === "business" ? (
                    <input
                      autoFocus
                      type="text"
                      value={editingField.value}
                      onChange={(e) => setEditingField({ field: "business", value: e.target.value })}
                      onBlur={() => saveField("business", editingField.value)}
                      onKeyDown={(e) => e.key === "Enter" && saveField("business", editingField.value)}
                      className="flex-1 text-sm bg-[var(--color-wa-input)] border border-[var(--color-wa-sep)] rounded px-2 py-1 text-[var(--color-wa-text-main)] focus:outline-none focus:border-[var(--color-wa-green)]"
                    />
                  ) : (
                    <span
                      onClick={() => setEditingField({ field: "business", value: selectedLead.business ?? "" })}
                      className="flex-1 text-sm text-[var(--color-wa-text-main)] cursor-pointer hover:text-[var(--color-wa-green)] transition-colors"
                    >
                      {selectedLead.business ?? <span className="italic text-[var(--color-wa-text-sec)]">— clic para editar</span>}
                    </span>
                  )}
                </div>

                {/* Problema */}
                <div className="flex items-start py-2.5 gap-3">
                  <span className="text-xs text-[var(--color-wa-text-sec)] w-20 flex-shrink-0 pt-1">Problema</span>
                  {editingField?.field === "problem" ? (
                    <textarea
                      autoFocus
                      rows={3}
                      value={editingField.value}
                      onChange={(e) => setEditingField({ field: "problem", value: e.target.value })}
                      onBlur={() => saveField("problem", editingField.value)}
                      className="flex-1 text-sm bg-[var(--color-wa-input)] border border-[var(--color-wa-sep)] rounded px-2 py-1 text-[var(--color-wa-text-main)] focus:outline-none focus:border-[var(--color-wa-green)] resize-none"
                    />
                  ) : (
                    <span
                      onClick={() => setEditingField({ field: "problem", value: selectedLead.problem ?? "" })}
                      className="flex-1 text-sm text-[var(--color-wa-text-main)] cursor-pointer hover:text-[var(--color-wa-green)] transition-colors whitespace-pre-wrap"
                    >
                      {selectedLead.problem ?? <span className="italic text-[var(--color-wa-text-sec)]">— clic para editar</span>}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* NOTAS */}
            <div className="bg-[var(--color-wa-panel-l)] rounded-xl border border-[var(--color-wa-sep)] p-5">
              <h3 className="text-sm font-semibold uppercase tracking-wider text-[var(--color-wa-text-sec)] mb-3">Notas internas</h3>
              <textarea
                key={selectedId}
                rows={4}
                value={notes}
                onChange={(e) => handleNotesChange(e.target.value)}
                placeholder="Agregar notas del seguimiento..."
                className="w-full text-base bg-[var(--color-wa-bg-main)] border border-[var(--color-wa-sep)] rounded-lg p-3 text-[var(--color-wa-text-main)] focus:outline-none focus:border-[var(--color-wa-green)] resize-none placeholder:italic placeholder:text-[var(--color-wa-text-sec)] transition-colors"
              />
            </div>

            {/* HISTORIAL */}
            {previewMessages.length > 0 && (
              <div className="bg-[var(--color-wa-panel-l)] rounded-xl border border-[var(--color-wa-sep)] p-5">
                <h3 className="text-sm font-semibold uppercase tracking-wider text-[var(--color-wa-text-sec)] mb-3">Últimos mensajes</h3>
                <div className="space-y-2">
                  {previewMessages.map((m, i) => (
                    <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                      <div className={`max-w-[82%] px-3 py-2 rounded-xl text-sm leading-relaxed ${
                        m.role === "user"
                          ? "bg-[var(--color-wa-green)] text-[var(--color-wa-green-text)] rounded-br-sm"
                          : "bg-[var(--color-wa-bg-main)] text-[var(--color-wa-text-main)] rounded-bl-sm"
                      }`}>
                        {m.content.length > 140 ? m.content.slice(0, 140) + "…" : m.content}
                      </div>
                    </div>
                  ))}
                </div>
                <div className="mt-3 text-center">
                  <a
                    href={`/?id=${selectedLead.conversation_id}`}
                    className="text-sm font-medium text-[var(--color-wa-green)] hover:underline"
                  >
                    Ver conversación completa →
                  </a>
                </div>
              </div>
            )}

            {/* ACCIONES */}
            <div className="flex justify-end pt-1">
              {confirmDelete ? (
                <div className="flex items-center gap-3">
                  <span className="text-sm text-[var(--color-wa-text-sec)]">¿Confirmar eliminación?</span>
                  <button
                    onClick={() => deleteLead(selectedLead.id)}
                    className="px-4 py-2 bg-red-500 text-[var(--color-wa-green-text)] text-sm font-medium rounded-lg hover:bg-red-600 transition-colors"
                  >
                    Eliminar
                  </button>
                  <button
                    onClick={() => setConfirmDelete(false)}
                    className="px-3 py-2 text-sm text-[var(--color-wa-text-sec)] hover:text-[var(--color-wa-text-main)] transition-colors"
                  >
                    Cancelar
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setConfirmDelete(true)}
                  className="text-sm text-red-500 hover:underline"
                >
                  Eliminar lead
                </button>
              )}
            </div>

          </div>
        )}
      </main>

      </>
      )}
      </div>
    </div>
  );
}
