"use client";
import { useEffect, useState, useCallback } from "react";
import { ConfigScreen } from "./ConfigScreen";

interface Status {
  status: string;
  missing?: string[];
  phone?: string;
  qr?: string | null;
  message?: string;
}

interface Props {
  children: (status: Status, refetch: () => void) => React.ReactNode;
}

export function ConnectionGate({ children }: Props) {
  const [status, setStatus] = useState<Status | null>(null);

  const fetchStatus = useCallback(() => {
    fetch("/api/connection/status")
      .then((r) => r.json())
      .then(setStatus)
      .catch(() =>
        setStatus({ status: "error", message: "No se pudo verificar la conexión" })
      );
  }, []);

  useEffect(() => {
    fetchStatus();
  }, [fetchStatus]);

  // Polling automático mientras espera QR o reconecta
  useEffect(() => {
    if (!status) return;
    const polling = ["qr_pending", "connecting", "starting", "closed"];
    if (polling.includes(status.status)) {
      const t = setInterval(fetchStatus, 3000);
      return () => clearInterval(t);
    }
  }, [status?.status, fetchStatus]);

  if (!status) {
    return (
      <div className="min-h-screen bg-[var(--color-wa-bg-main,#f0f2f5)] flex items-center justify-center">
        <p className="text-sm text-[var(--color-wa-text-sec,#667781)]">Verificando configuración...</p>
      </div>
    );
  }

  if (status.status === "missing_config") {
    return <ConfigScreen missing={status.missing ?? []} />;
  }

  return <>{children(status, fetchStatus)}</>;
}
