"use client";
import { useEffect, useState } from "react";
import { ConfigScreen } from "./ConfigScreen";

interface Status {
  status: string;
  missing?: string[];
  phone?: string;
  quality?: string;
  message?: string;
}

interface Props {
  children: (status: Status) => React.ReactNode;
}

export function ConnectionGate({ children }: Props) {
  const [status, setStatus] = useState<Status | null>(null);

  useEffect(() => {
    fetch("/api/connection/status")
      .then((r) => r.json())
      .then(setStatus)
      .catch(() => setStatus({ status: "error", message: "No se pudo verificar la conexión" }));
  }, []);

  if (!status) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-sm text-gray-500">Verificando configuración...</p>
      </div>
    );
  }

  if (status.status === "missing_config") {
    return <ConfigScreen missing={status.missing ?? []} />;
  }

  return <>{children(status)}</>;
}
