"use client";
import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { clientConfig } from "@/lib/client.config";

const KEYS = ["1","2","3","4","5","6","7","8","9","←","0","✓"];

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const [pin, setPin] = useState("");
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(false);

  async function submit(value: string) {
    setLoading(true);
    setError(false);
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pin: value }),
    });
    if (res.ok) {
      router.push(params.get("from") ?? "/");
    } else {
      setError(true);
      setLoading(false);
      setTimeout(() => {
        setPin("");
        setError(false);
      }, 600);
    }
  }

  function handleKey(key: string) {
    if (loading) return;
    if (key === "←") {
      setPin((p) => p.slice(0, -1));
      setError(false);
      return;
    }
    if (key === "✓") {
      if (pin.length === 4) submit(pin);
      return;
    }
    if (pin.length >= 4) return;
    const next = pin + key;
    setPin(next);
    if (next.length === 4) submit(next);
  }

  return (
    <div className="min-h-screen bg-[var(--color-wa-bg-main)] flex flex-col items-center justify-center gap-10 px-4">

      {/* Header */}
      <div className="text-center">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-[var(--color-wa-green)] mb-4">
          <span className="text-[var(--color-wa-green-text)] font-bold text-2xl">
            {clientConfig.businessName.charAt(0)}
          </span>
        </div>
        <h1 className="text-lg font-semibold text-[var(--color-wa-text-main)]">
          {clientConfig.businessName}
        </h1>
        <p className="text-xs text-[var(--color-wa-text-sec)] mt-1">Ingresá tu PIN</p>
      </div>

      {/* PIN dots */}
      <div className="flex gap-4">
        {[0,1,2,3].map((i) => (
          <div
            key={i}
            className={`w-3.5 h-3.5 rounded-full transition-all duration-150 ${
              error
                ? "bg-red-500"
                : pin.length > i
                ? "bg-[var(--color-wa-green)] scale-110"
                : "bg-[var(--color-wa-sep)] border border-[var(--color-wa-sep)]"
            }`}
          />
        ))}
      </div>

      {/* Keypad */}
      <div className="grid grid-cols-3 gap-3 w-56">
        {KEYS.map((key) => (
          <button
            key={key}
            onClick={() => handleKey(key)}
            disabled={loading || (key === "✓" && pin.length < 4)}
            className={`
              h-16 rounded-2xl text-lg font-medium transition-all duration-100 active:scale-95
              ${key === "✓"
                ? "bg-[var(--color-wa-green)] text-[var(--color-wa-green-text)] disabled:opacity-30"
                : key === "←"
                ? "bg-transparent text-[var(--color-wa-text-sec)] hover:text-[var(--color-wa-text-main)]"
                : "bg-[var(--color-wa-panel-l)] text-[var(--color-wa-text-main)] hover:bg-[var(--color-wa-input)] border border-[var(--color-wa-sep)]"
              }
            `}
          >
            {key}
          </button>
        ))}
      </div>

      <p style={{ fontSize: "10px", color: "var(--color-wa-text-sec)", opacity: 0.35 }}>
        Desarrollado por{" "}
        <a href="https://www.feer.com.ar" target="_blank" rel="noopener noreferrer" className="hover:underline">
          Feer
        </a>
      </p>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[var(--color-wa-bg-main)]" />}>
      <LoginForm />
    </Suspense>
  );
}
