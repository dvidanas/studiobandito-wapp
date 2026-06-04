"use client";
import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";

const KEYS = ["1","2","3","4","5","6","7","8","9","←","0","✓"];
const PIN_LENGTH = 4;

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
      if (pin.length === PIN_LENGTH) submit(pin);
      return;
    }
    if (pin.length >= PIN_LENGTH) return;
    const next = pin + key;
    setPin(next);
    if (next.length === PIN_LENGTH) submit(next);
  }

  const canSubmit = pin.length === PIN_LENGTH && !loading;

  return (
    <div style={{
      minHeight: "100dvh",
      background: "radial-gradient(circle at 50% 0%, var(--bg-panel-l) 0%, var(--bg-main) 100%)",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      gap: "2.5rem",
      padding: "1.5rem",
      fontFamily: "var(--font-sans), system-ui, -apple-system, sans-serif",
      color: "var(--text-main)",
      position: "relative"
    }}>

      {/* Brand */}
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "0.75rem" }}>
        <div style={{
          width: "4.5rem",
          height: "4.5rem",
          borderRadius: "50%",
          background: "radial-gradient(circle, var(--bg-panel-r) 0%, var(--bg-input) 100%)",
          border: "2.5px solid var(--wa-green)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          boxShadow: "var(--shadow-card)",
          color: "var(--wa-green)",
          marginBottom: "0.5rem"
        }}>
          <svg style={{ width: "2rem", height: "2rem" }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="6" cy="6" r="3" />
            <circle cx="6" cy="18" r="3" />
            <line x1="9.8" y1="8.2" x2="20" y2="17" />
            <line x1="9.8" y1="15.8" x2="20" y2="7" />
          </svg>
        </div>
        <h1 style={{
          fontSize: "1.5rem",
          fontWeight: 700,
          letterSpacing: "0.08em",
          color: "var(--text-main)",
          margin: 0,
        }}>
          STUDIO BANDITO
        </h1>
        <p style={{
          color: "var(--text-sec)",
          fontSize: "0.75rem",
          letterSpacing: "0.15em",
          textTransform: "uppercase",
          margin: 0,
          fontWeight: 500
        }}>
          Ingresá tu código
        </p>
      </div>

      {/* PIN bubbles (Elasticized) */}
      <div style={{ display: "flex", gap: "0.75rem", alignItems: "center", height: "3rem" }}>
        {Array.from({ length: PIN_LENGTH }).map((_, i) => {
          const isActive = pin.length > i;
          return (
            <div
              key={i}
              style={{
                width: isActive ? "3rem" : "1.25rem",
                height: "1.25rem",
                borderRadius: "1rem",
                border: `1.5px solid ${error ? "#ef4444" : isActive ? "var(--wa-green)" : "var(--color-sep)"}`,
                background: error ? "#ef4444" : isActive ? "var(--wa-green)" : "transparent",
                transition: "all 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)",
                boxShadow: isActive && !error ? "0 4px 12px rgba(0,0,0,0.12)" : "none",
              }}
            />
          );
        })}
      </div>

      {/* Keypad */}
      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(3, 1fr)",
        gap: "0.75rem",
        width: "16rem",
      }}>
        {KEYS.map((key) => {
          const isConfirm = key === "✓";
          const isBack = key === "←";
          const isNumber = !isConfirm && !isBack;

          return (
            <button
              key={key}
              onClick={() => handleKey(key)}
              disabled={loading || (isConfirm && !canSubmit)}
              style={{
                height: "4rem",
                borderRadius: "1.25rem",
                fontSize: isNumber ? "1.5rem" : "1.25rem",
                fontWeight: isNumber ? 500 : 400,
                cursor: loading ? "default" : "pointer",
                transition: "all 0.2s cubic-bezier(0.25, 0.46, 0.45, 0.94)",
                border: "1px solid var(--color-sep)",
                background: isConfirm
                  ? canSubmit ? "var(--wa-green)" : "var(--bg-hover)"
                  : "var(--bg-input)",
                color: isConfirm
                  ? canSubmit ? "var(--wa-green-text)" : "var(--text-sec)"
                  : "var(--text-main)",
                outline: "none",
                WebkitTapHighlightColor: "transparent",
                boxShadow: isNumber ? "var(--shadow-card)" : "none",
                display: "flex",
                alignItems: "center",
                justifyContent: "center"
              }}
            >
              {key === "✓" && loading ? (
                <span style={{
                  display: "inline-block",
                  width: "1.25rem",
                  height: "1.25rem",
                  border: "2px solid rgba(255,255,255,0.1)",
                  borderTop: `2px solid ${canSubmit ? "var(--wa-green-text)" : "var(--text-main)"}`,
                  borderRadius: "50%",
                  animation: "spin 0.8s linear infinite",
                }} />
              ) : key}
            </button>
          );
        })}
      </div>

      {error && (
        <p style={{ 
          color: "#ef4444", 
          fontSize: "0.85rem", 
          letterSpacing: "0.05em", 
          position: "absolute", 
          bottom: "5rem",
          animation: "shake 0.4s ease-in-out" 
        }}>
          PIN incorrecto
        </p>
      )}

      <p style={{ fontSize: "11px", color: "var(--text-sec)", opacity: 0.6, position: "absolute", bottom: "1.5rem", letterSpacing: "0.05em" }}>
        DESARROLLADO POR{" "}
        <a href="https://www.feer.com.ar" target="_blank" rel="noopener noreferrer"
          style={{ color: "var(--wa-green)", textDecoration: "none", fontWeight: 600 }}>
          FEER
        </a>
      </p>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-5px); }
          50% { transform: translateX(5px); }
          75% { transform: translateX(-5px); }
        }
        button:not(:disabled):active { 
          transform: scale(0.95);
          background: var(--bg-hover) !important;
        }
      `}</style>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div style={{ minHeight: "100dvh", background: "#f0f0f3" }} />}>
      <LoginForm />
    </Suspense>
  );
}
