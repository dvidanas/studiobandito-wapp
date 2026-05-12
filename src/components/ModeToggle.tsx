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
          ? "bg-emerald-100 text-emerald-800 hover:bg-emerald-200"
          : "bg-amber-100 text-amber-800 hover:bg-amber-200"
      }`}
    >
      <span
        className={`w-1.5 h-1.5 rounded-full ${
          mode === "AI" ? "bg-emerald-500" : "bg-amber-500"
        }`}
      />
      {mode === "AI" ? "IA" : "HUMANO"}
    </button>
  );
}
