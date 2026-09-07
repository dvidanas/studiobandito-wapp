"use client";
import { useState, useEffect, useMemo, useCallback } from "react";
import { PullToRefresh } from "@/components/PullToRefresh";
import { Pagination, PAGE_SIZE } from "@/components/panel/Pagination";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { Campo, Boton, claseInput } from "@/components/panel/PanelChrome";

/**
 * Tabla plana de clientes. Las filas no son clickeables a propósito: no hay
 * panel de detalle, ni modal, ni página por cliente — solo lo que hace falta
 * para ubicar a alguien y, si hace falta, corregir nombre/teléfono o borrarlo.
 *
 * Visitas, última visita, total gastado y ausencias se calculan en la misma
 * consulta que la lista, no con un pedido por cliente. Tampoco se guardan como
 * contadores en `clientes`: la fuente de verdad es `citas`. El listado solo
 * muestra Nombre, Teléfono y Última visita — visitas/no vino/total gastado
 * siguen viniendo en la respuesta de la API por si algún día vuelve un detalle,
 * pero no se pintan acá.
 */

interface Cliente {
  id: number;
  nombre: string;
  telefono: string | null;
  visitas: number;
  ultima_visita: string | null;
  total_gastado: number;
  no_vino: number;
}

/** "2026-08-20" → "20/08/2026". Compacto, que es lo que pide una columna. */
function formatVisita(fecha: string | null): string {
  if (!fecha) return "—";
  const [y, m, d] = fecha.split("-");
  return `${d}/${m}/${y}`;
}

export default function ClientesPage() {
  const [clients, setClients] = useState<Cliente[]>([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);

  const [editing, setEditing] = useState<Cliente | null>(null);
  const [editNombre, setEditNombre] = useState("");
  const [editTelefono, setEditTelefono] = useState("");
  const [editError, setEditError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState<Cliente | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    const url = query ? `/api/clientes?q=${encodeURIComponent(query)}` : "/api/clientes";
    const res = await fetch(url);
    if (res.ok) {
      const data = await res.json();
      setClients(Array.isArray(data) ? data : []);
    }
    setLoading(false);
  }, [query]);

  useEffect(() => {
    setLoading(true);
    const timeout = setTimeout(fetchData, 250);
    return () => clearTimeout(timeout);
  }, [fetchData]);

  // Una búsqueda nueva puede dejar menos páginas que la actual: volver al inicio.
  useEffect(() => {
    setPage(1);
  }, [query]);

  const totalPages = Math.max(1, Math.ceil(clients.length / PAGE_SIZE));
  const paginaActual = Math.min(page, totalPages);
  const clientesPagina = useMemo(
    () => clients.slice((paginaActual - 1) * PAGE_SIZE, paginaActual * PAGE_SIZE),
    [clients, paginaActual]
  );

  function openEdit(c: Cliente) {
    setEditing(c);
    setEditNombre(c.nombre);
    setEditTelefono(c.telefono ?? "");
    setEditError(null);
  }

  async function saveEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!editing) return;
    if (!editNombre.trim()) {
      setEditError("El nombre es obligatorio.");
      return;
    }
    setSaving(true);
    setEditError(null);
    try {
      const res = await fetch(`/api/clientes/${editing.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nombre: editNombre.trim(), telefono: editTelefono.trim() || null }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setEditError(data.error || "No se pudo guardar. Intentá nuevamente.");
        return;
      }
      setClients((prev) =>
        prev.map((c) =>
          c.id === editing.id ? { ...c, nombre: editNombre.trim(), telefono: editTelefono.trim() || null } : c
        )
      );
      setEditing(null);
    } finally {
      setSaving(false);
    }
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    const res = await fetch(`/api/clientes/${deleteTarget.id}`, { method: "DELETE" });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      // El cliente tiene turnos cargados: se avisa por qué no se borró, en
      // vez de forzarlo — ver el comentario en deleteCliente() del panel.
      setDeleteError(data.error || "No se pudo borrar. Intentá nuevamente.");
      setDeleteTarget(null);
      return;
    }
    setClients((prev) => prev.filter((c) => c.id !== deleteTarget.id));
    setDeleteTarget(null);
  }

  return (
    <div className="flex flex-col h-full min-h-0">
      <PullToRefresh onRefresh={fetchData} className="flex-1 flex flex-col overflow-hidden">
        <div className="flex-1 overflow-y-auto p-3 md:p-4">
          <div className="space-y-4 max-w-4xl">
            <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
              <h1 className="text-lg font-bold text-[var(--color-wa-text-main)]">Clientes</h1>
              {!loading && (
                <span className="text-xs text-[var(--color-wa-text-sec)]">
                  {clients.length} {clients.length === 1 ? "cliente" : "clientes"}
                  {query && (clients.length === 1 ? " encontrado" : " encontrados")}
                </span>
              )}
            </div>

            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar por nombre o teléfono..."
              className="w-full max-w-sm text-sm bg-[var(--color-wa-input)] border border-[var(--color-wa-sep)] rounded-lg px-3 py-2 text-[var(--color-wa-text-main)] focus:outline-none focus:border-[var(--color-wa-green)] placeholder:text-[var(--color-wa-text-sec)]"
            />

            {loading ? (
              <div className="space-y-2">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="h-12 rounded-xl bg-[var(--color-wa-sep)] animate-pulse" />
                ))}
              </div>
            ) : clients.length === 0 ? (
              <p className="text-sm text-[var(--color-wa-text-sec)]">
                {query ? "Ningún cliente coincide con la búsqueda." : "No hay clientes para mostrar."}
              </p>
            ) : (
              <>
                {/* overflow-x-auto: en pantallas angostas la tabla se desplaza
                    en lugar de aplastar las columnas. */}
                <div className="border border-[var(--color-wa-sep)] rounded-2xl overflow-hidden bg-[var(--color-wa-panel-l)]">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm min-w-[520px]">
                      <thead>
                        <tr className="border-b border-[var(--color-wa-sep)] text-left text-xs uppercase tracking-wider text-[var(--color-wa-text-sec)]">
                          <th className="px-4 py-3 font-semibold">Nombre</th>
                          <th className="px-4 py-3 font-semibold">Teléfono</th>
                          <th className="px-4 py-3 font-semibold">Última visita</th>
                          <th className="px-4 py-3 font-semibold text-right">Acciones</th>
                        </tr>
                      </thead>
                      <tbody>
                        {clientesPagina.map((c) => (
                          <tr key={c.id} className="border-b border-[var(--color-wa-sep)] last:border-0">
                            <td className="px-4 py-3 font-medium text-[var(--color-wa-text-main)]">{c.nombre}</td>
                            <td className="px-4 py-3 text-[var(--color-wa-text-sec)] tabular-nums">{c.telefono ?? "—"}</td>
                            <td className="px-4 py-3 text-[var(--color-wa-text-sec)] tabular-nums">
                              {formatVisita(c.ultima_visita)}
                            </td>
                            <td className="px-4 py-3">
                              <div className="flex items-center justify-end gap-1">
                                <button
                                  onClick={() => openEdit(c)}
                                  className="p-2 rounded-full hover:bg-[var(--color-wa-hover)] active:scale-90 transition-all cursor-pointer text-[var(--color-wa-text-sec)]"
                                  title="Editar cliente"
                                  aria-label="Editar cliente"
                                >
                                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                  </svg>
                                </button>
                                <button
                                  onClick={() => setDeleteTarget(c)}
                                  className="p-2 rounded-full hover:bg-[var(--color-wa-hover)] active:scale-90 transition-all cursor-pointer"
                                  style={{ color: "var(--color-wa-error)" }}
                                  title="Borrar cliente"
                                  aria-label="Borrar cliente"
                                >
                                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                  </svg>
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                <Pagination currentPage={paginaActual} totalPages={totalPages} onPageChange={setPage} />
              </>
            )}
          </div>
        </div>
      </PullToRefresh>

      {editing && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
          onClick={() => !saving && setEditing(null)}
        >
          <form
            onSubmit={saveEdit}
            onClick={(e) => e.stopPropagation()}
            className="bg-[var(--color-wa-panel-l)] rounded-2xl shadow-xl p-6 mx-4 max-w-sm w-full space-y-4"
          >
            <h2 className="text-base font-bold text-[var(--color-wa-text-main)]">Editar cliente</h2>
            <Campo etiqueta="Nombre">
              <input
                value={editNombre}
                onChange={(e) => setEditNombre(e.target.value)}
                className={`${claseInput} w-full`}
                autoFocus
              />
            </Campo>
            <Campo etiqueta="Teléfono">
              <input
                type="tel"
                value={editTelefono}
                onChange={(e) => setEditTelefono(e.target.value)}
                placeholder="2645551234"
                className={`${claseInput} w-full`}
              />
            </Campo>
            {editError && <p className="text-xs" style={{ color: "var(--color-wa-error)" }}>{editError}</p>}
            <div className="flex gap-2 justify-end pt-1">
              <Boton tipo="secundario" onClick={() => setEditing(null)} disabled={saving}>
                Cancelar
              </Boton>
              <Boton submit disabled={saving}>
                {saving ? "Guardando…" : "Guardar"}
              </Boton>
            </div>
          </form>
        </div>
      )}

      {deleteTarget && (
        <ConfirmDialog
          message={`¿Borrar a ${deleteTarget.nombre}? Esta acción no se puede deshacer.`}
          onConfirm={confirmDelete}
          onCancel={() => setDeleteTarget(null)}
        />
      )}

      {deleteError && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
          onClick={() => setDeleteError(null)}
        >
          <div
            className="bg-[var(--color-wa-panel-l)] rounded-2xl shadow-xl p-6 mx-4 max-w-sm w-full"
            onClick={(e) => e.stopPropagation()}
          >
            <p className="text-[var(--color-wa-text-main)] text-sm font-medium mb-5">{deleteError}</p>
            <div className="flex justify-end">
              <Boton onClick={() => setDeleteError(null)}>Entendido</Boton>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
