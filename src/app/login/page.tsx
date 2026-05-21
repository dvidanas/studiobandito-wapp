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
      background: "radial-gradient(circle at 50% 0%, #1a1a1a 0%, #000000 100%)",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      gap: "3rem",
      padding: "1.5rem",
      fontFamily: "system-ui, -apple-system, sans-serif",
      color: "#fff",
      position: "relative"
    }}>

      {/* Brand */}
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "1.5rem" }}>
        <img 
          src="/logo.png" 
          alt="Studio Bandito Barberia" 
          style={{ 
            height: "140px", 
            width: "auto", 
            objectFit: "contain",
            filter: "invert(1) drop-shadow(0px 4px 10px rgba(0,0,0,0.5))"
          }} 
        />
        <p style={{
          color: "rgba(255,255,255,0.4)",
          fontSize: "0.75rem",
          letterSpacing: "0.25em",
          textTransform: "uppercase",
          margin: 0,
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
                border: `1px solid ${error ? "#ef4444" : isActive ? "#fff" : "rgba(255,255,255,0.15)"}`,
                background: error ? "#ef4444" : isActive ? "#fff" : "transparent",
                transition: "all 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)",
                boxShadow: isActive && !error ? "0 0 15px rgba(255,255,255,0.2)" : "none",
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
                fontWeight: isNumber ? 300 : 400,
                cursor: loading ? "default" : "pointer",
                transition: "all 0.2s cubic-bezier(0.25, 0.46, 0.45, 0.94)",
                border: "1px solid rgba(255,255,255,0.05)",
                background: isConfirm
                  ? canSubmit ? "#fff" : "rgba(255,255,255,0.03)"
                  : "rgba(255,255,255,0.03)",
                color: isConfirm
                  ? canSubmit ? "#000" : "rgba(255,255,255,0.2)"
                  : "rgba(255,255,255,0.8)",
                outline: "none",
                WebkitTapHighlightColor: "transparent",
                backdropFilter: "blur(10px)",
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
                  border: "2px solid rgba(0,0,0,0.1)",
                  borderTop: "2px solid #000",
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

      <p style={{ fontSize: "11px", color: "rgba(255,255,255,0.15)", position: "absolute", bottom: "1.5rem", letterSpacing: "0.05em" }}>
        DESARROLLADO POR{" "}
        <a href="https://www.feer.com.ar" target="_blank" rel="noopener noreferrer"
          style={{ color: "#fff", textDecoration: "none", opacity: 0.8 }}>
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
          background: rgba(255,255,255,0.08) !important;
        }
      `}</style>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div style={{ minHeight: "100dvh", background: "#000" }} />}>
      <LoginForm />
    </Suspense>
  );
}
