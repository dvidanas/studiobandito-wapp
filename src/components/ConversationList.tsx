"use client";

interface Conversation {
  id: number;
  phone: string;
  name: string | null;
  mode: "AI" | "HUMAN";
  has_lead: number;
  last_message_at: number | null;
  created_at: number;
}

interface Props {
  conversations: Conversation[];
  selectedId: number | null;
  onSelect: (id: number) => void;
}

function timeAgo(ts: number | null): string {
  if (!ts) return "";
  const diff = Math.floor(Date.now() / 1000) - ts;
  if (diff < 60) return "ahora";
  if (diff < 3600) return `hace ${Math.floor(diff / 60)} min`;
  if (diff < 86400) return `hace ${Math.floor(diff / 3600)} h`;
  return `hace ${Math.floor(diff / 86400)} d`;
}

export function ConversationList({ conversations, selectedId, onSelect }: Props) {
  if (conversations.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full py-16 px-4 text-center">
        <p className="text-sm text-[var(--color-wa-text-sec)]">Sin conversaciones aún</p>
      </div>
    );
  }

  return (
    <ul>
      {conversations.map((c, index) => (
        <li key={c.id} className="animate-in" style={{ animationDelay: `${index * 25}ms` }}>
          <button
            onClick={() => onSelect(c.id)}
            className={`w-full text-left px-4 py-4 flex items-center gap-3 hover:bg-[var(--color-wa-hover)] active:bg-[var(--color-wa-hover)] transition-colors border-b border-[var(--color-wa-sep)] min-h-[64px] ${
              selectedId === c.id ? "bg-[var(--color-wa-hover)]" : ""
            }`}
          >
            {/* Avatar Removed */}

            {/* Info */}
            <div className="flex-1 min-w-0 flex flex-col justify-center">
              <div className="flex items-center justify-between gap-2">
                <span className="text-base font-medium text-[var(--color-wa-text-main)] truncate">
                  {c.name ?? `+${c.phone}`}
                </span>
                <span className="text-xs text-[var(--color-wa-text-sec)] flex-shrink-0">
                  {timeAgo(c.last_message_at ?? c.created_at)}
                </span>
              </div>
              <div className="flex items-center gap-2 mt-0.5">
                <span
                  className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold ${
                    c.mode === "AI"
                      ? "bg-[var(--color-wa-green)] text-[var(--color-wa-green-text)]"
                      : "bg-amber-500 text-[var(--color-wa-green-text)]"
                  }`}
                >
                  {c.mode === "AI" ? "IA" : "HUMANO"}
                </span>
                {c.has_lead === 1 && (
                  <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-blue-500 text-white">
                    LEAD
                  </span>
                )}
                <span className="text-sm text-[var(--color-wa-text-sec)] truncate">
                  último mensaje...
                </span>
              </div>
            </div>
          </button>
        </li>
      ))}
    </ul>
  );
}
