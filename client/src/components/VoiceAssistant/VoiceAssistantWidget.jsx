import { useCallback, useEffect, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import { useTranslator } from "../../translation/TranslationProvider";
import ChatBubble from "./ChatBubble";
import {
  CHAT_LANGUAGES,
  getUiStrings,
  getWelcomeMessage,
  processUserMessage,
} from "./intentMatcher";
import { navigateToTab } from "./navigationMap";
import { primeAudioPlayback } from "./googleTtsPlayer";
import { useSpeechRecognition } from "./useSpeechRecognition";
import { useSpeechSynthesis } from "./useSpeechSynthesis";

const CHAT_LANG_OPTIONS = [
  { code: "en", label: "English" },
  { code: "gu", label: "ગુજરાતી" },
  { code: "hi", label: "हिन्दी" },
];

function ChatIcon({ className = "w-6 h-6" }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 01-2.555-.337A5.972 5.972 0 015.41 20.97a5.969 5.969 0 01-.474-.065 4.48 4.48 0 00.978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25z"
      />
    </svg>
  );
}

function MicIcon({ className = "w-5 h-5" }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M12 18.75a6 6 0 006-6v-1.5m-6 7.5a6 6 0 01-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 01-3-3V4.5a3 3 0 116 0v8.25a3 3 0 01-3 3z"
      />
    </svg>
  );
}

function CloseIcon({ className = "w-5 h-5" }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
    </svg>
  );
}

export default function VoiceAssistantWidget() {
  const location = useLocation();
  const { language, setLanguage } = useTranslator();
  const [voiceLang, setVoiceLang] = useState(() =>
    CHAT_LANGUAGES.includes(language) ? language : "en",
  );

  useEffect(() => {
    if (CHAT_LANGUAGES.includes(language)) {
      setVoiceLang(language);
    }
  }, [language]);

  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState([]);
  const [processing, setProcessing] = useState(false);
  const [speakingText, setSpeakingText] = useState("");
  const [sttError, setSttError] = useState("");
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  const sendMessageRef = useRef(null);

  const ui = getUiStrings(voiceLang);
  const onDashboard = location.pathname === "/dashboard";

  const {
    speaking,
    speak,
    fallbackNotice,
    ttsError,
    refreshVoices,
  } = useSpeechSynthesis(voiceLang);

  const sendMessage = useCallback(
    async (rawText) => {
      const text = String(rawText ?? input).trim();
      if (!text || processing) return;

      const userMsg = { id: `u-${Date.now()}`, role: "user", text };
      setMessages((prev) => [...prev, userMsg]);
      setInput("");
      setProcessing(true);
      setSttError("");

      try {
        const result = await processUserMessage(text, voiceLang, { canNavigate: onDashboard });

        if (result.intent === "navigate" && result.shouldNavigate && result.targetTab) {
          navigateToTab(result.targetTab);
        }

        const botMsg = {
          id: `b-${Date.now()}`,
          role: "bot",
          text: result.reply,
        };
        setMessages((prev) => [...prev, botMsg]);
      } catch {
        setMessages((prev) => [
          ...prev,
          {
            id: `err-${Date.now()}`,
            role: "bot",
            text: ui.loginFirst,
          },
        ]);
      } finally {
        setProcessing(false);
      }
    },
    [input, processing, voiceLang, onDashboard, ui.loginFirst],
  );

  sendMessageRef.current = sendMessage;

  const handleVoiceResult = useCallback((text) => {
    setInput(text);
    setSttError("");
    if (text.trim() && sendMessageRef.current) {
      sendMessageRef.current(text);
    }
  }, []);

  const handleSttError = useCallback((code) => {
    if (code === "no-speech") {
      setSttError(ui.sttError);
      return;
    }
    if (code !== "aborted") {
      setSttError(ui.sttError);
    }
  }, [ui.sttError]);

  const {
    supported: sttSupported,
    listening,
    usedLangFallback,
    toggle: toggleMic,
    stop: stopMic,
  } = useSpeechRecognition(voiceLang, {
    onResult: handleVoiceResult,
    onError: handleSttError,
  });

  useEffect(() => {
    if (open && messages.length === 0) {
      setMessages([{ id: "welcome", role: "bot", text: getWelcomeMessage(voiceLang) }]);
    }
  }, [open, messages.length, voiceLang]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, processing]);

  useEffect(() => {
    if (open) {
      refreshVoices();
      window.speechSynthesis?.getVoices();
      setTimeout(() => inputRef.current?.focus(), 100);
    } else {
      stopMic();
    }
  }, [open, stopMic, refreshVoices]);

  const handleSpeak = useCallback(
    (text) => {
      if (!text) return;
      primeAudioPlayback();
      setSpeakingText(text);
      speak(text);
    },
    [speak],
  );

  useEffect(() => {
    if (!speaking) setSpeakingText("");
  }, [speaking]);

  const handleLanguageChange = (code) => {
    setVoiceLang(code);
    setLanguage(code);
    setSttError("");
    setMessages([{ id: `welcome-${code}`, role: "bot", text: getWelcomeMessage(code) }]);
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    sendMessage();
  };

  const ttsFallbackLabel =
    fallbackNotice === "fallback"
      ? ui.ttsFallback
      : fallbackNotice === "online"
        ? ui.ttsOnline
        : fallbackNotice === "failed"
          ? ui.ttsFailed
          : "";
  const ttsErrorLabel = ttsError === "no-voice" ? ui.ttsFailed : "";

  return (
    <>
      {!open && (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="fixed bottom-5 right-5 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-emerald-600 to-teal-600 text-white shadow-lg shadow-emerald-900/30 transition-transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-emerald-400/50"
          aria-label={ui.open}
        >
          <ChatIcon />
        </button>
      )}

      {open && (
        <div className="fixed bottom-5 right-5 z-50 flex w-[min(100vw-2rem,380px)] flex-col overflow-hidden rounded-2xl border border-emerald-500/20 bg-gradient-to-br from-emerald-900 via-teal-800 to-emerald-900 shadow-2xl shadow-emerald-950/40">
          <div className="pointer-events-none absolute -top-16 -right-16 h-40 w-40 rounded-full bg-emerald-500/20 blur-2xl" />

          <div className="relative flex items-center justify-between border-b border-white/10 px-4 py-3">
            <div>
              <h2 className="text-sm font-semibold text-emerald-100">{ui.title}</h2>
              {!onDashboard && (
                <p className="text-[10px] text-amber-200/70 mt-0.5">{ui.loginFirst}</p>
              )}
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="rounded-lg p-1.5 text-emerald-200/70 hover:bg-white/10 hover:text-white transition-colors"
              aria-label={ui.close}
            >
              <CloseIcon />
            </button>
          </div>

          <div className="relative flex gap-1 border-b border-white/10 px-3 py-2">
            {CHAT_LANG_OPTIONS.map((opt) => (
              <button
                key={opt.code}
                type="button"
                onClick={() => handleLanguageChange(opt.code)}
                className={`flex-1 rounded-lg px-2 py-1.5 text-xs font-medium transition-colors ${
                  voiceLang === opt.code
                    ? "bg-emerald-500/25 text-emerald-100"
                    : "text-emerald-200/60 hover:bg-white/5 hover:text-emerald-100"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>

          <div className="relative flex-1 max-h-[340px] min-h-[240px] overflow-y-auto px-3 py-3">
            {messages.map((msg) => (
              <ChatBubble
                key={msg.id}
                message={msg}
                isUser={msg.role === "user"}
                onSpeak={msg.role === "bot" ? handleSpeak : undefined}
                isSpeaking={speaking && speakingText === msg.text}
                listenLabel={ui.listen}
                playingLabel={ui.playing}
                ttsFallbackLabel={msg.role === "bot" && speakingText === msg.text ? ttsFallbackLabel : ""}
                ttsErrorLabel={msg.role === "bot" && speakingText === msg.text ? ttsErrorLabel : ""}
              />
            ))}
            {processing && (
              <div className="flex justify-start mb-3">
                <div className="rounded-2xl rounded-bl-md bg-white/10 px-4 py-2 text-xs text-emerald-200/70">
                  …
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          <form onSubmit={handleSubmit} className="relative border-t border-white/10 p-3">
            <div className="flex items-end gap-2">
              <div className="relative flex-1">
                <input
                  ref={inputRef}
                  type="text"
                  value={listening ? (input || ui.listening) : input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder={ui.placeholder}
                  disabled={processing}
                  className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 pr-2 text-sm text-emerald-50 placeholder:text-emerald-200/40 focus:border-emerald-400/40 focus:outline-none focus:ring-1 focus:ring-emerald-400/30 disabled:opacity-60"
                />
              </div>

              {sttSupported ? (
                <button
                  type="button"
                  onClick={toggleMic}
                  className={`shrink-0 rounded-xl p-2.5 transition-colors ${
                    listening
                      ? "bg-red-500/30 text-red-200 animate-pulse"
                      : "bg-white/10 text-emerald-200 hover:bg-white/15"
                  }`}
                  aria-label="Voice input"
                  title={listening ? ui.listening : "Microphone"}
                >
                  <MicIcon />
                </button>
              ) : (
                <button
                  type="button"
                  disabled
                  className="shrink-0 rounded-xl bg-white/5 p-2.5 text-emerald-200/30 cursor-not-allowed"
                  title={ui.micUnsupported}
                  aria-label={ui.micUnsupported}
                >
                  <MicIcon />
                </button>
              )}

              <button
                type="submit"
                disabled={processing || !input.trim()}
                className="shrink-0 rounded-xl bg-emerald-500/80 px-3 py-2.5 text-xs font-semibold text-white hover:bg-emerald-500 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                {ui.send}
              </button>
            </div>
            {!sttSupported && (
              <p className="mt-2 text-[10px] text-emerald-200/50">{ui.micUnsupported}</p>
            )}
            {sttSupported && usedLangFallback && listening && (
              <p className="mt-2 text-[10px] text-amber-200/70">{ui.sttLangFallback}</p>
            )}
            {sttError && (
              <p className="mt-2 text-[10px] text-red-200/70">{sttError}</p>
            )}
          </form>
        </div>
      )}
    </>
  );
}
