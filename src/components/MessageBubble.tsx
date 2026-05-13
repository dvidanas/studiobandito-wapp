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
      className={`flex ${isIncoming ? "justify-start" : "justify-end"} mb-1.5`}
    >
      <div
        className={`relative max-w-[85%] sm:max-w-[70%] px-2.5 pt-1.5 pb-1.5 text-[14.2px] leading-[19px] shadow-sm ${
          isIncoming
            ? "bg-[var(--color-wa-bubble-in)] text-[var(--color-wa-text-main)] rounded-lg rounded-tl-none"
            : "bg-[var(--color-wa-bubble-out)] text-[var(--color-wa-text-main)] rounded-lg rounded-tr-none"
        }`}
      >
        {(isAssistant || isHuman) && (
          <span
            className="block text-[11px] font-semibold mb-0.5 text-[var(--color-wa-text-sec)] opacity-80"
          >
            {isAssistant ? "IA" : "Agente"}
          </span>
        )}
        <div className="relative">
          <span className="whitespace-pre-wrap break-words">
            {message.content.replace(/\n\s*\n/g, '\n')}
          </span>
          {/* Espaciador invisible para evitar que la hora se encime */}
          <span className="inline-block w-[75px] h-[18px] align-bottom"></span>
          
          <div
            className="absolute bottom-0 right-0 flex items-center gap-1"
          >
            <span className="text-[10px] leading-none text-[var(--color-wa-text-sec)]">
              {formatTime(message.created_at)}
            </span>
            {!isIncoming && (
              <span className="flex items-center text-[var(--color-wa-text-sec)]">
                {failedToSend ? (
                  <svg className="w-3.5 h-3.5 -mt-[1px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                ) : (
                  <svg className="w-3.5 h-3.5 -mt-[1px]" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z"/>
                  </svg>
                )}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
