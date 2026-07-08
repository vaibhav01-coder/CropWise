import { useEffect, useMemo, useRef, useState, useCallback } from "react";

const STATUS_LABELS = {
  idle: "Idle",
  listening: "🎤 Listening...",
  processing: "📝 Converting...",
  thinking: "🤖 Thinking...",
  speaking: "🔊 Speaking...",
  completed: "✅ Done",
  error: "Error",
};

function getLanguageCode(preferredLanguage) {
  const language = (preferredLanguage || "english").toLowerCase();
  if (language.startsWith("gu")) return "gu-IN";
  if (language.startsWith("hi")) return "hi-IN";
  if (language.startsWith("en")) return "en-IN";
  return "en-IN";
}

function detectLanguage(text) {
  if (!text) return null;
  if (/[\u0A80-\u0AFF]/.test(text)) return "gujarati";
  if (/[\u0900-\u097F]/.test(text)) return "hindi";
  if (/[\u0B80-\u0BFF]/.test(text)) return "tamil";
  if (/[\u0C00-\u0C7F]/.test(text)) return "telugu";
  if (/[\u0C80-\u0CFF]/.test(text)) return "kannada";
  if (/[\u0D00-\u0D7F]/.test(text)) return "malayalam";
  if (/[\u0A00-\u0A7F]/.test(text)) return "punjabi";
  if (/[\u0980-\u09FF]/.test(text)) return "bengali";
  if (/[\u0B00-\u0B7F]/.test(text)) return "odia";
  if (/[\u0600-\u06FF\u0750-\u077F]/.test(text)) return "urdu";
  if (/[\u0900-\u097F]/.test(text)) return "marathi";
  if (/[a-zA-Z]/.test(text)) return "english";
  return null;
}

function languageToBCP47(detectedLang) {
  const map = { english: "en-IN", gujarati: "gu-IN", hindi: "hi-IN", tamil: "ta-IN", telugu: "te-IN", kannada: "kn-IN", malayalam: "ml-IN", punjabi: "pa-IN", bengali: "bn-IN", odia: "or-IN", urdu: "ur-IN", marathi: "mr-IN" };
  return map[detectedLang] || null;
}

function stripFormatting(text) {
  return text
    .replace(/\*\*(.+?)\*\*/g, "$1")
    .replace(/\*(.+?)\*/g, "$1")
    .replace(/`{1,3}[^`]*`{1,3}/g, "")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/^[-*]\s+/gm, "")
    .replace(/^\d+\.\s+/gm, "")
    .replace(/^>\s+/gm, "")
    .replace(/-{3,}/g, "")
    .replace(/[*_~]+/g, "")
    .replace(/[\u{1F600}-\u{1F64F}]/gu, "")
    .replace(/[\u{1F300}-\u{1F5FF}]/gu, "")
    .replace(/[\u{1F680}-\u{1F6FF}]/gu, "")
    .replace(/[\u{1F1E0}-\u{1F1FF}]/gu, "")
    .replace(/[\u2600-\u26FF\u2700-\u27BF]/gu, "")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .trim();
}

function renderMarkdown(text) {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*(.+?)\*/g, "<em>$1</em>")
    .replace(/`{3}([^`]+)`{3}/g, "<code>$1</code>")
    .replace(/`([^`]+)`/g, "<code>$1</code>")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '<a href="$2" class="underline text-emerald-700">$1</a>')
    .replace(/\n/g, "<br>");
}

function AskKisanAIErrorBoundary({ children }) {
  const [hasError, setHasError] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    const handler = (event) => {
      setHasError(true);
      setError(event.error || new Error("Component crashed"));
    };
    window.addEventListener("error", handler);
    return () => window.removeEventListener("error", handler);
  }, []);

  if (hasError) {
    return (
      <div className="rounded-2xl bg-white border border-stone-200/80 shadow-sm p-6">
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          Something went wrong. Please refresh the page and try again.
          {error && <p className="mt-1 text-xs opacity-70">{error.message}</p>}
        </div>
      </div>
    );
  }

  return children;
}

export default function AskKisanAI({ profile, session }) {
  const [status, setStatus] = useState("idle");
  const [draftText, setDraftText] = useState("");
  const [inputValue, setInputValue] = useState("");
  const [messages, setMessages] = useState([]);
  const [errorMessage, setErrorMessage] = useState("");
  const [isRecording, setIsRecording] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const [pausedIndex, setPausedIndex] = useState(-1);
  const [speechRetryCount, setSpeechRetryCount] = useState(0);
  const [speakingIndex, setSpeakingIndex] = useState(-1);
  const [voiceUnavailableLang, setVoiceUnavailableLang] = useState("");

  const recognitionRef = useRef(null);
  const voicesRef = useRef([]);
  const requestInFlightRef = useRef(false);
  const isRecordingRef = useRef(false);
  const latestTranscriptRef = useRef("");
  const abortControllerRef = useRef(null);
  const micDebounceRef = useRef(false);
  const isSpeakingRef = useRef(false);
  const lastSpokenTextRef = useRef("");
  const shouldAutoRestartRef = useRef(false);
  const startRecordingRef = useRef(null);

  const languageCode = useMemo(() => getLanguageCode(profile?.preferred_language), [profile?.preferred_language]);

  useEffect(() => {
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return undefined;

    const SpeechRecognitionAPI = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognitionAPI) return undefined;

    let retryTimeout;

    const setupRecognition = () => {
      const recognition = new SpeechRecognitionAPI();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = languageCode;

      recognition.onresult = (event) => {
        let interimText = "";
        let finalText = "";

        for (let index = event.resultIndex; index < event.results.length; index += 1) {
          const result = event.results[index];
          const transcript = result[0].transcript.trim();
          if (result.isFinal) {
            finalText += `${transcript} `;
          } else {
            interimText += `${transcript} `;
          }
        }

        const nextValue = (finalText || interimText).trim();
        if (nextValue) {
          latestTranscriptRef.current = nextValue;
          setDraftText(nextValue);
        }
      };

      recognition.onerror = (event) => {
        if (event.error === "aborted") return;
        if (event.error === "not-allowed") {
          setErrorMessage("Microphone permission was denied. Please allow microphone access and try again.");
        } else if (event.error === "no-speech") {
          setErrorMessage("No speech was detected. Please try again.");
        } else if (event.error === "audio-capture") {
          setErrorMessage("Microphone is unavailable. Please check your device.");
        } else {
          setErrorMessage("Speech recognition could not be completed. Please try again.");
        }
        setStatus("error");
        setIsRecording(false);
        isRecordingRef.current = false;
      };

      recognition.onend = () => {
        if (isRecordingRef.current && recognitionRef.current) {
          if (speechRetryCount < 3) {
            retryTimeout = setTimeout(() => {
              try {
                recognitionRef.current.start();
                setSpeechRetryCount((c) => c + 1);
              } catch {
              }
            }, 500);
          } else {
            setErrorMessage("Speech recognition failed repeatedly. Please try again.");
            setStatus("error");
            setIsRecording(false);
            isRecordingRef.current = false;
          }
        }
      };

      recognitionRef.current = recognition;
    };

    setupRecognition();

    return () => {
      clearTimeout(retryTimeout);
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch {
        }
        recognitionRef.current = null;
      }
    };
  }, [languageCode, speechRetryCount]);

  useEffect(() => {
    const loadVoices = () => {
      voicesRef.current = window.speechSynthesis?.getVoices() || [];
      console.debug("[AskKisanAI] TTS voices:", voicesRef.current.map(v => `${v.lang} (${v.name})`));
    };
    loadVoices();
    if (window.speechSynthesis) {
      window.speechSynthesis.onvoiceschanged = loadVoices;
    }
    return () => {
      if (window.speechSynthesis) {
        window.speechSynthesis.onvoiceschanged = null;
      }
    };
  }, []);

  useEffect(() => {
    return () => {
      stopAudio();
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  const findVoiceForLang = useCallback((bcp47) => {
    if (!bcp47) return null;
    const prefix = bcp47.split("-")[0];
    return voicesRef.current.find(v => v.lang.startsWith(prefix)) || null;
  }, []);

  const stopAudio = useCallback(() => {
    if (typeof window !== "undefined") {
      window.speechSynthesis.cancel();
    }
    isSpeakingRef.current = false;
    setIsSpeaking(false);
    setPausedIndex(-1);
    setSpeakingIndex(-1);
  }, []);

  const clearConversation = useCallback(() => {
    stopAudio();
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setMessages([]);
    setDraftText("");
    setInputValue("");
    setErrorMessage("");
    setStatus("idle");
  }, [stopAudio]);

  const stopRecording = useCallback(() => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {
      }
    }
    shouldAutoRestartRef.current = false;
    setIsRecording(false);
    isRecordingRef.current = false;
  }, []);

  const handlePauseResume = useCallback((index) => {
    if (pausedIndex === index) {
      if (typeof window !== "undefined" && window.speechSynthesis) {
        window.speechSynthesis.resume();
      }
      setPausedIndex(-1);
    } else if (speakingIndex === index) {
      if (typeof window !== "undefined" && window.speechSynthesis) {
        window.speechSynthesis.pause();
      }
      setPausedIndex(index);
    }
  }, [pausedIndex, speakingIndex]);

  const speakText = useCallback((text, onDone) => {
    if (typeof window === "undefined" || !text) return;
    const cleaned = stripFormatting(text);
    if (!cleaned) { onDone?.(); return; }
    const detectedLang = detectLanguage(text);
    const bcp47 = languageToBCP47(detectedLang) || languageCode;
    if (window.speechSynthesis) {
      const voice = findVoiceForLang(bcp47);
      if (!voice && detectedLang !== "english") {
        console.debug("[AskKisanAI] No TTS voice for", bcp47, "- skipping speech");
        setVoiceUnavailableLang(detectedLang || "");
        onDone?.();
        return;
      }
      setVoiceUnavailableLang("");
      const utterance = new SpeechSynthesisUtterance(cleaned);
      utterance.lang = bcp47;
      if (voice) utterance.voice = voice;
      utterance.onend = onDone;
      window.speechSynthesis.speak(utterance);
    }
  }, [languageCode, findVoiceForLang]);

  const handlePlayAgain = useCallback((message, index) => {
    if (typeof window === "undefined" || !message || !message.content) return;
    stopAudio();
    speakText(message.content, () => {
      isSpeakingRef.current = false;
      setIsSpeaking(false);
      setPausedIndex(-1);
      setSpeakingIndex(-1);
      setStatus("completed");
    });
    isSpeakingRef.current = true;
    setIsSpeaking(true);
    setSpeakingIndex(index);
  }, [stopAudio, speakText]);

  const speakReply = useCallback((text, messageIndex) => {
    if (typeof window === "undefined" || !text) return;
    lastSpokenTextRef.current = text;
    stopAudio();
    speakText(text, () => {
      isSpeakingRef.current = false;
      setIsSpeaking(false);
      setPausedIndex(-1);
      setSpeakingIndex(-1);
      setStatus("completed");
      if (shouldAutoRestartRef.current && startRecordingRef.current) {
        startRecordingRef.current();
      }
    });
    isSpeakingRef.current = true;
    setIsSpeaking(true);
    setSpeakingIndex(messageIndex);
    setStatus("speaking");
  }, [stopAudio, speakText]);

  const sendMessage = useCallback(async (question) => {
    const trimmed = question?.trim();
    if (!trimmed || requestInFlightRef.current) return;

    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();
    const { signal } = abortControllerRef.current;

    requestInFlightRef.current = true;
    stopAudio();
    setStatus("thinking");
    setErrorMessage("");
    setDraftText("");

    try {
      const detectedLang = detectLanguage(trimmed) || profile?.preferred_language || "english";
      console.debug("[AskKisanAI] Input lang:", detectedLang, "text:", trimmed.slice(0, 40));
      const res = await fetch("/mandi-api/voice/assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal,
        body: JSON.stringify({
          question: trimmed,
          profile: {
            ...(profile || {}),
            farmer_name: session?.name || profile?.farmer_name || "Farmer",
          },
          history: messages.map((message) => ({ role: message.role, content: message.content })),
          language: detectedLang,
          stream: true,
        }),
      });

      if (!res.ok) {
        throw new Error("The assistant is currently unavailable. Please try again in a moment.");
      }

      setMessages((prev) => [...prev, { role: "user", content: trimmed }]);
      setStatus("thinking");

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let reply = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const text = decoder.decode(value, { stream: true });
        const lines = text.split("\n").filter((l) => l.startsWith("data: "));
        for (const line of lines) {
          const payload = line.slice(6);
          if (payload === "[DONE]") break;
          try {
            const { chunk } = JSON.parse(payload);
            reply += chunk;
            setMessages((prev) => {
              const next = [...prev];
              if (next.length > 0 && next[next.length - 1].role === "assistant") {
                next[next.length - 1] = { ...next[next.length - 1], content: reply };
              } else {
                next.push({ role: "assistant", content: reply });
              }
              return next;
            });
          } catch {}
        }
      }

      const nextIndex = messages.length + 1;
      setStatus("completed");
      setInputValue("");
      if (reply) {
        speakReply(reply, nextIndex);
      } else {
        setMessages((prev) => [
          ...prev,
          { role: "assistant", content: "Sorry, I couldn't generate a response. Please try again." },
        ]);
      }
    } catch (error) {
      if (error.name === "AbortError") return;
      setStatus("error");
      setErrorMessage(error.message || "Unable to reach the assistant. Please check your connection and try again.");
    } finally {
      requestInFlightRef.current = false;
    }
  }, [profile, session, messages, stopAudio, speakReply]);

  useEffect(() => {
    startRecordingRef.current = startRecording;
  });

  const handleRetry = useCallback(() => {
    setErrorMessage("");
    setStatus("idle");
    if (startRecordingRef.current) {
      startRecordingRef.current();
    }
  }, []);

  const startRecording = useCallback(async () => {
    if (requestInFlightRef.current || micDebounceRef.current) return;
    stopAudio();
    micDebounceRef.current = true;
    setTimeout(() => { micDebounceRef.current = false; }, 300);

    if (isOffline) {
      setStatus("error");
      setErrorMessage("You are offline. Please connect to the internet and try again.");
      return;
    }

    const SpeechRecognitionAPI = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognitionAPI) {
      setStatus("error");
      setErrorMessage("This browser does not support speech recognition.");
      return;
    }

    shouldAutoRestartRef.current = true;
    setStatus("listening");
    setIsRecording(true);
    isRecordingRef.current = true;
    setSpeechRetryCount(0);
    setErrorMessage("");
    setDraftText("");
    latestTranscriptRef.current = "";

    if (recognitionRef.current) {
      try {
        recognitionRef.current.start();
      } catch {
      }
    }
  }, [isOffline, stopAudio]);

  const handleStopAndSend = useCallback(() => {
    const text = (latestTranscriptRef.current || "").trim();
    stopRecording();
    if (text && !requestInFlightRef.current) {
      setStatus("processing");
      sendMessage(text);
    } else {
      setStatus("error");
      setErrorMessage("No speech was detected. Please try again.");
    }
  }, [stopRecording, sendMessage]);

  const handleManualSubmit = useCallback((event) => {
    event.preventDefault();
    const value = inputValue.trim();
    if (!value) {
      setErrorMessage("Please enter a question or record your voice.");
      setStatus("error");
      return;
    }
    if (isOffline) {
      setStatus("error");
      setErrorMessage("You are offline. Please connect to the internet and try again.");
      return;
    }
    if (requestInFlightRef.current) return;
    setStatus("processing");
    sendMessage(value);
  }, [inputValue, isOffline, sendMessage]);

  const isProcessing = requestInFlightRef.current;

  const buttonBase = "rounded-xl border border-stone-200 bg-white px-3 py-2 text-sm font-medium text-stone-700 shadow-sm transition-colors hover:bg-stone-50 disabled:opacity-50 disabled:cursor-not-allowed";

  const showSkeleton = status === "thinking" || status === "processing";

  return (
    <AskKisanAIErrorBoundary>
      <div className="rounded-2xl bg-white border border-stone-200/80 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-stone-100 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="font-bold text-stone-800 flex items-center gap-2">
              <span className="text-xl">🎤</span>
              Ask Kisan AI
            </h3>
            <p className="text-sm text-stone-500 mt-1">
              Speak naturally and receive simple, practical farm guidance.
            </p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {isOffline && (
              <div className="rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700" role="alert">
                Offline
              </div>
            )}
            <div className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700" role="status" aria-live="polite">
              {STATUS_LABELS[status] || STATUS_LABELS.idle}
            </div>
          </div>
        </div>

        <div className="p-4 md:p-6 space-y-4">
          <div className="rounded-2xl border border-stone-200 bg-stone-50 p-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-semibold text-stone-700">Voice-first assistance</p>
                <p className="text-sm text-stone-500 mt-1">
                  Ask about crops, weather, irrigation, fertilizers, pests and more.
                </p>
              </div>
              <button
                type="button"
                onClick={isRecording ? handleStopAndSend : startRecording}
                disabled={isOffline || isProcessing}
                className={`inline-flex items-center justify-center rounded-full px-4 py-3 text-sm font-semibold transition-all ${isRecording ? "bg-rose-600 text-white hover:bg-rose-700" : "bg-emerald-600 text-white hover:bg-emerald-700"} disabled:opacity-50 disabled:cursor-not-allowed`}
                aria-label={isRecording ? "Stop recording" : "Start recording"}
                aria-disabled={isOffline || isProcessing}
              >
                <span className="mr-2">{isRecording ? "⏹" : "🎙️"}</span>
                {isRecording ? "Stop Recording" : "Start Recording"}
              </button>
            </div>
          </div>

          <div className="max-h-56 overflow-auto space-y-2 rounded-2xl border border-stone-200 bg-white p-3" role="log" aria-live="polite" aria-label="Conversation">
            {messages.length === 0 && !draftText && !showSkeleton && (
              <div className="rounded-xl bg-stone-50 px-3 py-3 text-sm text-stone-500">
                Press the microphone and ask your first question. The assistant will remember the current conversation for follow-up questions.
              </div>
            )}

            {showSkeleton && (
              <div className="rounded-xl bg-stone-50 px-3 py-3 text-sm text-stone-500 animate-pulse" role="status" aria-label="Loading response">
                🤖 Thinking...
              </div>
            )}

            {messages.map((message, index) => (
              <div key={`${message.role}-${index}`} className={`rounded-xl px-3 py-2 text-sm ${message.role === "user" ? "ml-auto bg-emerald-50 text-emerald-800 max-w-[85%]" : "bg-stone-50 text-stone-700 max-w-[90%]"}`}>
                <p className="text-[11px] font-semibold uppercase tracking-wide opacity-70">
                  {message.role === "user" ? "You" : "Kisan AI"}
                </p>
                <p className="mt-1 whitespace-pre-wrap" dangerouslySetInnerHTML={{ __html: renderMarkdown(message.content) }} />
                {message.role === "assistant" && (
                  <div className="mt-2 flex items-center gap-2 flex-wrap">
                    <button
                      type="button"
                      onClick={() => handlePauseResume(index)}
                      className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-1 rounded-full hover:bg-emerald-100 transition-colors"
                      aria-label={pausedIndex === index ? "Resume audio" : "Pause audio"}
                    >
                      {pausedIndex === index ? "▶ Resume" : "⏸ Pause"}
                    </button>
                    <button
                      type="button"
                      onClick={() => handlePlayAgain(message, index)}
                      className="text-[11px] font-semibold text-stone-700 bg-stone-100 border border-stone-200 px-2 py-1 rounded-full hover:bg-stone-200 transition-colors"
                      aria-label="Play again"
                    >
                      ▶ Play Again
                    </button>
                    {voiceUnavailableLang && (
                      <span className="text-[10px] text-amber-600" title={`No voice available for ${voiceUnavailableLang}`}>
                        🔇
                      </span>
                    )}
                  </div>
                )}
              </div>
            ))}

            {draftText ? (
              <div className="rounded-xl bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
                <p className="text-[11px] font-semibold uppercase tracking-wide opacity-70">Live text</p>
                <p className="mt-1 whitespace-pre-wrap">{draftText}</p>
              </div>
            ) : null}
          </div>

          <form onSubmit={handleManualSubmit} className="space-y-3">
            <label className="block text-xs font-semibold uppercase tracking-wider text-stone-500">
              Type a question
            </label>
            <textarea
              value={inputValue}
              onChange={(event) => setInputValue(event.target.value)}
              placeholder="Ask about fertilizer, irrigation, pests, or weather..."
              className="min-h-[84px] w-full rounded-xl border border-stone-200 bg-stone-50 px-3 py-2.5 text-sm text-stone-700 focus:outline-none focus:ring-2 focus:ring-emerald-400"
              aria-label="Type your question"
              disabled={isOffline || isProcessing}
            />
            <div className="flex flex-wrap gap-2">
              <button type="submit" disabled={isOffline || isProcessing || !inputValue.trim()} className="rounded-xl bg-emerald-600 px-3 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed">
                Send
              </button>
              <button type="button" onClick={handleRetry} disabled={isProcessing} className={buttonBase}>
                Retry
              </button>
              <button type="button" onClick={clearConversation} className={buttonBase}>
                Cancel
              </button>
            </div>
          </form>

          {errorMessage ? (
            <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">
              {errorMessage}
            </div>
          ) : null}
        </div>

      </div>
    </AskKisanAIErrorBoundary>
  );
}
