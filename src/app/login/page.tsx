"use client";
import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";

const KEYS = ["1","2","3","4","5","6","7","8","9","←","0","✓"];
const PIN_LENGTH = 4;

function BanditoLogo() {
  return (
    <svg viewBox="0 0 220 60" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ width: 220, height: 60 }}>
      {/* Scissors icon */}
      <g transform="translate(0, 6)">
        <circle cx="8" cy="10" r="5" stroke="white" strokeWidth="1.5" fill="none"/>
        <circle cx="8" cy="38" r="5" stroke="white" strokeWidth="1.5" fill="none"/>
        <line x1="12" y1="7" x2="38" y2="26" stroke="white" strokeWidth="1.5" strokeLinecap="round"/>
        <line x1="12" y1="41" x2="38" y2="22" stroke="white" strokeWidth="1.5" strokeLinecap="round"/>
        <circle cx="38" cy="24" r="2" fill="white"/>
      </g>
      {/* STUDIO BANDITO text */}
      <text x="52" y="20" fill="rgba(255,255,255,0.5)" fontSize="9" fontFamily="system-ui, sans-serif" letterSpacing="4" fontWeight="400">STUDIO</text>
      <text x="50" y="46" fill="white" fontSize="24" fontFamily="system-ui, sans-serif" letterSpacing="2" fontWeight="800">BANDITO</text>
    </svg>
  );
}

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
      background: "#0a0a0a",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      gap: "2.5rem",
      padding: "1.5rem",
      fontFamily: "system-ui, -apple-system, sans-serif",
    }}>

      {/* Brand */}
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "1.25rem" }}>
        <BanditoLogo />
        <p style={{
          color: "rgba(255,255,255,0.35)",
          fontSize: "0.6875rem",
          letterSpacing: "0.18em",
          textTransform: "uppercase",
          margin: 0,
        }}>
          Ingresá tu PIN
        </p>
      </div>

      {/* PIN bubbles */}
      <div style={{ display: "flex", gap: "1rem", alignItems: "center" }}>
        {Array.from({ length: PIN_LENGTH }).map((_, i) => (
          <div
            key={i}
            style={{
              width: "3.25rem",
              height: "3.25rem",
              borderRadius: "50%",
              border: `2px solid ${error ? "#ef4444" : pin.length > i ? "#fff" : "rgba(255,255,255,0.2)"}`,
              background: error ? "#ef4444" : pin.length > i ? "#fff" : "transparent",
              transition: "all 0.15s cubic-bezier(0.34, 1.56, 0.64, 1)",
              transform: pin.length > i ? "scale(1.08)" : "scale(1)",
            }}
          />
        ))}
      </div>

      {/* Keypad */}
      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(3, 1fr)",
        gap: "0.625rem",
        width: "13.5rem",
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
                height: "3.875rem",
                borderRadius: "50%",
                fontSize: isNumber ? "1.375rem" : "1.125rem",
                fontWeight: isNumber ? 500 : 400,
                cursor: loading ? "default" : "pointer",
                transition: "all 0.1s ease",
                border: isConfirm
                  ? "none"
                  : isBack
                  ? "none"
                  : "1.5px solid rgba(255,255,255,0.12)",
                background: isConfirm
                  ? canSubmit ? "#fff" : "rgba(255,255,255,0.08)"
                  : isBack
                  ? "transparent"
                  : "transparent",
                color: isConfirm
                  ? canSubmit ? "#000" : "rgba(255,255,255,0.2)"
                  : "rgba(255,255,255,0.82)",
                outline: "none",
                WebkitTapHighlightColor: "transparent",
              }}
            >
              {key === "✓" && loading ? (
                <span style={{
                  display: "inline-block",
                  width: "1rem",
                  height: "1rem",
                  border: "2px solid rgba(0,0,0,0.3)",
                  borderTop: "2px solid #000",
                  borderRadius: "50%",
                  animation: "spin 0.7s linear infinite",
                }} />
              ) : key}
            </button>
          );
        })}
      </div>

      {error && (
        <p style={{ color: "#ef4444", fontSize: "0.8125rem", letterSpacing: "0.04em", marginTop: "-1rem" }}>
          PIN incorrecto
        </p>
      )}

      <p style={{ fontSize: "10px", color: "rgba(255,255,255,0.12)", marginTop: "0.5rem" }}>
        Desarrollado por{" "}
        <a href="https://www.feer.com.ar" target="_blank" rel="noopener noreferrer"
          style={{ color: "inherit", textDecoration: "none" }}>
          Feer
        </a>
      </p>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        button:not(:disabled):active { transform: scale(0.92) !important; }
      `}</style>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div style={{ minHeight: "100dvh", background: "#0a0a0a" }} />}>
      <LoginForm />
    </Suspense>
  );
}
