interface Message {
  id: number;
  role: "user" | "assistant" | "human";
  content: string;
  wa_message_id: string | null;
  created_at: number;
}

interface Props {
  message: Message;
}

function formatTime(ts: number) {
  return new Date(ts * 1000).toLocaleTimeString("es-AR", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function MessageBubble({ message }: Props) {
  const isIncoming = message.role === "user";
  const isAssistant = message.role === "assistant";
  const isHuman = message.role === "human";
  const failedToSend = (isAssistant || isHuman) && !message.wa_message_id;

  return (
    <div
      className={`flex ${isIncoming ? "justify-start" : "justify-end"} mb-2`}
    >
      <div
        className={`max-w-[75%] rounded-2xl px-4 py-2 text-sm shadow-sm ${
          isIncoming
            ? "bg-white text-gray-900 rounded-tl-sm"
            : isAssistant
            ? "bg-emerald-500 text-white rounded-tr-sm"
            : "bg-amber-400 text-amber-950 rounded-tr-sm"
        }`}
      >
        {(isAssistant || isHuman) && (
          <span
            className={`block text-[10px] font-semibold mb-0.5 ${
              isAssistant ? "text-emerald-100" : "text-amber-800"
            }`}
          >
            {isAssistant ? "IA" : "Agente"}
          </span>
        )}
        <p className="whitespace-pre-wrap break-words">{message.content}</p>
        <div
          className={`flex items-center gap-1 mt-1 ${
            isIncoming ? "justify-start" : "justify-end"
          }`}
        >
          <span
            className={`text-[10px] ${
              isIncoming
                ? "text-gray-400"
                : isAssistant
                ? "text-emerald-100"
                : "text-amber-800"
            }`}
          >
            {formatTime(message.created_at)}
          </span>
          {failedToSend && (
            <span title="No se pudo enviar por WhatsApp">
              <svg
                className="w-3 h-3 text-red-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
