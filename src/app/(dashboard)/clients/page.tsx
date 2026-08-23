"use client";
import { useState, useEffect, useMemo, useCallback } from "react";
import { PullToRefresh } from "@/components/PullToRefresh";
import { Pagination, PAGE_SIZE } from "@/components/panel/Pagination";

/**
 * Tabla de clientes, con el patrón del panel de Pasta Lovers.
 *
 * Antes era maestro-detalle: la lista de la izquierda abría el historial del
 * cliente a la derecha (y a pantalla completa en móvil). Se reemplazó por una
 * tabla plana de cuatro columnas. Las filas no son clickeables a propósito: no
 * hay panel de detalle, ni modal, ni página por cliente.
 *
 * De paso desaparece un N+1: la vista anterior pedía /api/clients/{id} una vez
 * por cliente solo para contar sus turnos. Ahora visitas y última visita vienen
 * calculadas en la misma consulta que la lista.
 */

interface Client {
  id: number;
  name: string;
  phone: string;
  visits: number;
  last_visit: string | null;
}

/** "2026-08-20" → "20/08/2026". Compacto, que es lo que pide una columna. */
function formatVisita(fecha: string | null): string {
  if (!fecha) return "—";
  const [y, m, d] = fecha.split("-");
  return `${d}/${m}/${y}`;
}

export default function ClientsPage() {
  const [clients, setClients] = useState<Client[]>([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);

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
                          <th className="px-4 py-3 font-semibold">Visitas</th>
                          <th className="px-4 py-3 font-semibold">Última visita</th>
                        </tr>
                      </thead>
                      <tbody>
                        {clientesPagina.map((c) => (
                          <tr key={c.id} className="border-b border-[var(--color-wa-sep)] last:border-0">
                            <td className="px-4 py-3 font-medium text-[var(--color-wa-text-main)]">{c.name}</td>
                            <td className="px-4 py-3 text-[var(--color-wa-text-sec)] tabular-nums">{c.phone}</td>
                            <td className="px-4 py-3 text-[var(--color-wa-text-main)] tabular-nums">{c.visits}</td>
                            <td className="px-4 py-3 text-[var(--color-wa-text-sec)] tabular-nums">
                              {formatVisita(c.last_visit)}
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
    </div>
  );
}
