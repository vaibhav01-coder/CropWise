function SpeakerIcon({ className = "w-4 h-4" }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M19.114 5.636a9 9 0 010 12.728M16.463 8.288a5.25 5.25 0 010 7.424M6.75 8.25l4.72-4.72a.75.75 0 011.28.53v15.88a.75.75 0 01-1.28.53l-4.72-4.72H4.51c-.88 0-1.704-.507-1.938-1.354A9.01 9.01 0 012.25 12c0-.83.112-1.633.322-2.396C2.806 8.756 3.63 8.25 4.51 8.25H6.75z"
      />
    </svg>
  );
}

export default function ChatBubble({
  message,
  isUser = false,
  onSpeak,
  isSpeaking = false,
  listenLabel = "Listen",
  playingLabel = "Playing…",
  ttsFallbackLabel = "",
  ttsErrorLabel = "",
}) {
  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"} mb-3`}>
      <div
        className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed shadow-sm ${
          isUser
            ? "bg-emerald-600 text-white rounded-br-md"
            : "bg-white/10 text-emerald-50 border border-white/10 rounded-bl-md backdrop-blur-sm"
        }`}
      >
        <p className="whitespace-pre-wrap break-words">{message.text}</p>

        {!isUser && onSpeak && (
          <div className="mt-2 flex flex-col gap-1">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => onSpeak(message.text)}
                className={`inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs transition-colors ${
                  isSpeaking
                    ? "bg-emerald-500/30 text-emerald-200"
                    : "bg-emerald-500/10 text-emerald-300 hover:bg-emerald-500/20"
                }`}
                aria-label={listenLabel}
              >
                <SpeakerIcon className={`w-3.5 h-3.5 ${isSpeaking ? "animate-pulse" : ""}`} />
                {isSpeaking ? playingLabel : listenLabel}
              </button>
            </div>
            {isSpeaking && ttsFallbackLabel && (
              <span className="text-[10px] text-amber-200/80">{ttsFallbackLabel}</span>
            )}
            {isSpeaking && ttsErrorLabel && (
              <span className="text-[10px] text-red-200/80">{ttsErrorLabel}</span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
