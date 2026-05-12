"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { clientConfig } from "@/lib/client.config";

interface ConnectionStatus {
  status: "connected" | "error" | "missing_config" | "loading";
  phone?: string;
  quality?: string;
  message?: string;
}

interface Props {
  initialStatus: ConnectionStatus;
}

export function DashboardHeader({ initialStatus }: Props) {
  const router = useRouter();
  const [status, setStatus] = useState<ConnectionStatus>(initialStatus);
  const [checking, setChecking] = useState(false);

  async function checkConnection() {
    setChecking(true);
    try {
      const res = await fetch("/api/connection/status");
      const data = await res.json();
      setStatus(data);
    } catch {
      setStatus({ status: "error", message: "No se pudo conectar" });
    } finally {
      setChecking(false);
    }
  }

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
  }

  return (
    <header className="bg-white border-b border-gray-200 px-5 py-3 flex items-center justify-between gap-4">
      {/* Logo + nombre */}
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg bg-emerald-500 flex items-center justify-center">
          <svg
            className="w-4 h-4 text-white"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-3 3v-3z"
            />
          </svg>
        </div>
        <div>
          <h1 className="text-sm font-semibold text-gray-900">
            {clientConfig.businessName}
          </h1>
          {status.phone && (
            <p className="text-xs text-gray-500">{status.phone}</p>
          )}
        </div>
      </div>

      {/* Estado + acciones */}
      <div className="flex items-center gap-3">
        {/* Indicador de estado */}
        <div className="hidden sm:flex items-center gap-1.5">
          <span
            className={`w-2 h-2 rounded-full ${
              status.status === "connected"
                ? "bg-emerald-400"
                : status.status === "loading"
                ? "bg-gray-300 animate-pulse"
                : "bg-red-400"
            }`}
          />
          <span className="text-xs text-gray-500">
            {status.status === "connected"
              ? "Conectado"
              : status.status === "loading"
              ? "Verificando..."
              : "Sin conexión"}
          </span>
        </div>

        <button
          onClick={checkConnection}
          disabled={checking}
          className="text-xs px-3 py-1.5 border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50 disabled:opacity-50 transition-colors"
        >
          {checking ? "Verificando..." : "Probar conexión"}
        </button>

        <button
          onClick={handleLogout}
          className="text-xs px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors"
        >
          Cerrar sesión
        </button>
      </div>
    </header>
  );
}
