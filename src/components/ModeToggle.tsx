"use client";

interface Props {
  conversationId: number;
  mode: "AI" | "HUMAN";
  onChange: (mode: "AI" | "HUMAN") => void;
}

export function ModeToggle({ conversationId, mode, onChange }: Props) {
  async function toggle() {
    const next = mode === "AI" ? "HUMAN" : "AI";
    const res = await fetch(`/api/mode/${conversationId}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mode: next }),
    });
    if (res.ok) onChange(next);
  }

  return (
    <button
      onClick={toggle}
      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-colors ${
        mode === "AI"
          ? "bg-[var(--color-wa-green)] text-[var(--color-wa-green-text)] hover:bg-[var(--color-wa-green-dark)]"
          : "bg-amber-500 text-[var(--color-wa-green-text)] hover:bg-amber-600"
      }`}
    >
      <span
        className={`w-1.5 h-1.5 rounded-full bg-white`}
      />
      {mode === "AI" ? "IA" : "HUMANO"}
    </button>
  );
}
