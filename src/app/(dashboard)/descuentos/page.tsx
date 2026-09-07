"use client";

/**
 * Códigos de descuento.
 *
 * El código se guarda siempre en MAYÚSCULAS y es UNIQUE: dos promos con el
 * mismo código serían ambiguas al aplicarlo. `usos_actuales` lo incrementa el
 * motor de reservas al confirmar una cita, no esta pantalla — acá es solo
 * lectura.
 *
 * Un código ya usado en alguna cita no se borra: se desactiva. Borrarlo dejaría
 * esas citas apuntando a un descuento inexistente.
 */

import { useCallback, useEffect, useState } from "react";
import {
  PantallaPanel,
  Tarjeta,
  TituloSeccion,
  Boton,
  Campo,
  claseInput,
  campoFechaForm,
  Aviso,
  Vacio,
  Select,
} from "@/components/panel/PanelChrome";
import { plata, hoyISO } from "@/lib/format";

interface Descuento {
  id: number;
  codigo: string;
  tipo: "porcentaje" | "monto";
  valor: number;
  vigencia_desde: string | null;
  vigencia_hasta: string | null;
  usos_max: number | null;
  usos_actuales: number;
  activo: number;
}

const FORM_VACIO = {
  codigo: "",
  tipo: "porcentaje" as "porcentaje" | "monto",
  valor: "",
  vigencia_desde: "",
  vigencia_hasta: "",
  usos_max: "",
};

/** Por qué un código no está aplicándose hoy, o null si está vigente. */
function motivoNoVigente(d: Descuento): string | null {
  const hoy = hoyISO();
  if (!d.activo) return "Desactivado";
  if (d.vigencia_desde && hoy < d.vigencia_desde) return "Todavía no arrancó";
  if (d.vigencia_hasta && hoy > d.vigencia_hasta) return "Vencido";
  if (d.usos_max !== null && d.usos_actuales >= d.usos_max) return "Agotado";
  return null;
}

export default function DescuentosPage() {
  const [lista, setLista] = useState<Descuento[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const [form, setForm] = useState(FORM_VACIO);
  const [editandoId, setEditandoId] = useState<number | null>(null);
  const [guardando, setGuardando] = useState(false);

  const cargar = useCallback(async () => {
    setCargando(true);
    try {
      const r = await fetch("/api/descuentos");
      const j = await r.json();
      if (!r.ok) throw new Error(j.error ?? "No se pudieron cargar los códigos.");
      setLista(j);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    cargar();
  }, [cargar]);

  function limpiar() {
    setForm(FORM_VACIO);
    setEditandoId(null);
    setError(null);
  }

  function editar(d: Descuento) {
    setEditandoId(d.id);
    setForm({
      codigo: d.codigo,
      tipo: d.tipo,
      valor: String(d.valor),
      vigencia_desde: d.vigencia_desde ?? "",
      vigencia_hasta: d.vigencia_hasta ?? "",
      usos_max: d.usos_max != null ? String(d.usos_max) : "",
    });
    setError(null);
    setAviso(null);
  }

  async function enviar(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setAviso(null);

    if (!form.codigo.trim()) return setError("El código no puede estar vacío.");
    const valor = Number(form.valor);
    if (!Number.isFinite(valor) || valor <= 0) return setError("El valor tiene que ser mayor a cero.");
    if (form.tipo === "porcentaje" && valor > 100) return setError("Un porcentaje no puede superar 100.");
    if (form.vigencia_desde && form.vigencia_hasta && form.vigencia_hasta < form.vigencia_desde) {
      return setError("La vigencia termina antes de empezar.");
    }

    setGuardando(true);
    try {
      const cuerpo = {
        codigo: form.codigo.trim(),
        tipo: form.tipo,
        valor,
        vigencia_desde: form.vigencia_desde || null,
        vigencia_hasta: form.vigencia_hasta || null,
        usos_max: form.usos_max ? Number(form.usos_max) : null,
      };
      const r = await fetch(editandoId ? `/api/descuentos/${editandoId}` : "/api/descuentos", {
        method: editandoId ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(cuerpo),
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error);
      limpiar();
      await cargar();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setGuardando(false);
    }
  }

  async function alternarActivo(d: Descuento) {
    await fetch(`/api/descuentos/${d.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ activo: d.activo ? 0 : 1 }),
    });
    await cargar();
  }

  async function borrar(d: Descuento) {
    setError(null);
    const r = await fetch(`/api/descuentos/${d.id}`, { method: "DELETE" });
    const j = await r.json();
    // Si ya se usó, el backend lo desactiva y devuelve el motivo en `aviso`.
    setAviso(j.aviso ?? null);
    if (editandoId === d.id) limpiar();
    await cargar();
  }

  return (
    <PantallaPanel
      titulo="Códigos de descuento"
      descripcion="Se aplican al momento de reservar, desde la landing o el panel"
    >
      <div className="flex flex-col gap-5">
        {error && <Aviso texto={error} />}
        {aviso && <Aviso texto={aviso} tono="ok" />}

        <Tarjeta>
          <TituloSeccion>{editandoId ? "Editar código" : "Nuevo código"}</TituloSeccion>
          <form onSubmit={enviar} className="flex flex-wrap items-end gap-3 px-4 md:px-5 py-4">
            <Campo etiqueta="Código">
              <input
                value={form.codigo}
                onChange={(e) => setForm({ ...form, codigo: e.target.value.toUpperCase() })}
                placeholder="BIENVENIDO15"
                className={`${claseInput} w-40 uppercase`}
              />
            </Campo>
            <Campo etiqueta="Tipo">
              <Select
                value={form.tipo}
                onChange={(e) => setForm({ ...form, tipo: e.target.value as "porcentaje" | "monto" })}
                className={claseInput}
              >
                <option value="porcentaje">Porcentaje</option>
                <option value="monto">Monto fijo</option>
              </Select>
            </Campo>
            <Campo etiqueta={form.tipo === "porcentaje" ? "% de descuento" : "Monto a descontar"}>
              <input
                type="number"
                min="1"
                step="any"
                value={form.valor}
                onChange={(e) => setForm({ ...form, valor: e.target.value })}
                placeholder={form.tipo === "porcentaje" ? "15" : "2000"}
                className={`${claseInput} tnum w-32`}
              />
            </Campo>
            <Campo etiqueta="Desde">
              <input
                type="date"
                value={form.vigencia_desde}
                onChange={(e) => setForm({ ...form, vigencia_desde: e.target.value })}
                className={campoFechaForm}
              />
            </Campo>
            <Campo etiqueta="Hasta">
              <input
                type="date"
                value={form.vigencia_hasta}
                onChange={(e) => setForm({ ...form, vigencia_hasta: e.target.value })}
                className={campoFechaForm}
              />
            </Campo>
            <Campo etiqueta="Usos máx.">
              <input
                type="number"
                min="1"
                value={form.usos_max}
                onChange={(e) => setForm({ ...form, usos_max: e.target.value })}
                placeholder="sin tope"
                className={`${claseInput} tnum w-28`}
              />
            </Campo>
            <Boton submit disabled={guardando}>
              {guardando ? "Guardando…" : editandoId ? "Guardar cambios" : "Crear código"}
            </Boton>
            {editandoId && (
              <Boton tipo="secundario" onClick={limpiar}>
                Cancelar
              </Boton>
            )}
          </form>
        </Tarjeta>

        <Tarjeta>
          <TituloSeccion>Códigos cargados</TituloSeccion>
          {cargando ? (
            <Vacio>Cargando…</Vacio>
          ) : lista.length === 0 ? (
            <Vacio>Todavía no hay ningún código cargado.</Vacio>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm min-w-[720px]">
                <thead>
                  <tr className="text-[11px] font-bold uppercase tracking-wider text-[var(--color-wa-text-sec)]">
                    <th className="text-left px-4 md:px-5 py-2.5">Código</th>
                    <th className="text-left px-3 py-2.5">Descuento</th>
                    <th className="text-left px-3 py-2.5">Vigencia</th>
                    <th className="text-right px-3 py-2.5">Usos</th>
                    <th className="text-left px-3 py-2.5">Estado</th>
                    <th className="text-right px-4 md:px-5 py-2.5">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--color-wa-sep)]">
                  {lista.map((d) => {
                    const problema = motivoNoVigente(d);
                    return (
                      <tr key={d.id}>
                        <td className="px-4 md:px-5 py-3">
                          <span className="font-mono font-bold text-[var(--color-wa-text-main)]">
                            {d.codigo}
                          </span>
                        </td>
                        <td className="px-3 py-3 text-[var(--color-wa-text-main)]">
                          {d.tipo === "porcentaje" ? `${d.valor}%` : plata(d.valor)}
                        </td>
                        <td className="px-3 py-3 text-[var(--color-wa-text-sec)] text-xs">
                          {d.vigencia_desde || d.vigencia_hasta
                            ? `${d.vigencia_desde ?? "—"} → ${d.vigencia_hasta ?? "—"}`
                            : "Sin límite de fechas"}
                        </td>
                        <td className="tnum px-3 py-3 text-right text-[var(--color-wa-text-main)]">
                          {d.usos_actuales}
                          {d.usos_max !== null && (
                            <span className="text-[var(--color-wa-text-sec)]"> / {d.usos_max}</span>
                          )}
                        </td>
                        <td className="px-3 py-3">
                          <span
                            className="text-xs font-semibold px-2 py-1 rounded-lg"
                            style={{
                              color: problema ? "var(--color-wa-text-sec)" : "var(--color-wa-exito)",
                              border: `1px solid ${problema ? "var(--color-wa-sep)" : "var(--color-wa-exito)"}`,
                            }}
                          >
                            {problema ?? "Vigente"}
                          </span>
                        </td>
                        <td className="px-4 md:px-5 py-3">
                          <div className="flex items-center justify-end gap-1.5">
                            <Boton tipo="secundario" chico onClick={() => editar(d)}>
                              Editar
                            </Boton>
                            <Boton tipo="secundario" chico onClick={() => alternarActivo(d)}>
                              {d.activo ? "Desactivar" : "Activar"}
                            </Boton>
                            <Boton tipo="peligro" chico onClick={() => borrar(d)}>
                              Borrar
                            </Boton>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </Tarjeta>
      </div>
    </PantallaPanel>
  );
}
