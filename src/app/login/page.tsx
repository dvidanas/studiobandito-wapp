"use client";
import { useState, type FormEvent, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { clientConfig } from "@/lib/client.config";

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const form = new FormData(e.currentTarget);
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        username: form.get("username"),
        password: form.get("password"),
      }),
    });
    if (res.ok) {
      router.push(params.get("from") ?? "/");
    } else {
      const data = await res.json();
      setError(data.error ?? "Error al iniciar sesión");
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-[var(--color-wa-bg-main)] flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="bg-[var(--color-wa-panel-l)] rounded-xl shadow-lg border border-[var(--color-wa-sep)] px-8 py-10">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-[var(--color-wa-green)] mb-4">
              <span className="text-white font-bold text-xl">F</span>
            </div>
            <h1 className="text-xl font-semibold text-[var(--color-wa-text-main)]">
              {clientConfig.businessName}
            </h1>
            <p className="text-sm text-[var(--color-wa-text-sec)] mt-1">Panel de WhatsApp</p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label
                htmlFor="username"
                className="block text-sm font-medium text-[var(--color-wa-text-main)] mb-1.5"
              >
                Usuario
              </label>
              <input
                id="username"
                name="username"
                type="text"
                autoComplete="username"
                required
                className="w-full px-3 py-2.5 bg-[var(--color-wa-input)] border border-[var(--color-wa-sep)] rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-[var(--color-wa-green)] focus:border-transparent text-[var(--color-wa-text-main)] placeholder-[var(--color-wa-text-sec)]"
                placeholder="admin"
              />
            </div>

            <div>
              <label
                htmlFor="password"
                className="block text-sm font-medium text-[var(--color-wa-text-main)] mb-1.5"
              >
                Contraseña
              </label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                className="w-full px-3 py-2.5 bg-[var(--color-wa-input)] border border-[var(--color-wa-sep)] rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-[var(--color-wa-green)] focus:border-transparent text-[var(--color-wa-text-main)] placeholder-[var(--color-wa-text-sec)]"
                placeholder="••••••••"
              />
            </div>

            {error && (
              <div className="bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2 text-center">
                <p className="text-sm text-red-500">{error}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 py-3 px-4 bg-[var(--color-wa-green)] hover:bg-[var(--color-wa-green-dark)] disabled:opacity-60 text-white text-sm font-medium rounded-lg transition-colors shadow-sm"
            >
              {loading ? "Ingresando..." : "Ingresar"}
            </button>
          </form>
        </div>
      </div>
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
