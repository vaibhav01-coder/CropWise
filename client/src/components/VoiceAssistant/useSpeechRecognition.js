import { useCallback, useEffect, useRef, useState } from "react";
import { getSttLangCandidates, isIndicLanguage } from "./speechLanguages";

function getRecognitionConstructor() {
  if (typeof window === "undefined") return null;
  return window.SpeechRecognition || window.webkitSpeechRecognition || null;
}

const SILENCE_MS = { en: 1500, hi: 2800, gu: 2800 };

export function useSpeechRecognition(language = "en", { onResult, onError } = {}) {
  const [supported, setSupported] = useState(false);
  const [listening, setListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [activeLang, setActiveLang] = useState("");
  const [usedLangFallback, setUsedLangFallback] = useState(false);
  const recognitionRef = useRef(null);
  const silenceTimerRef = useRef(null);
  const langIndexRef = useRef(0);
  const onResultRef = useRef(onResult);
  const onErrorRef = useRef(onError);
  const deliveredRef = useRef(false);
  const transcriptRef = useRef("");

  onResultRef.current = onResult;
  onErrorRef.current = onError;

  useEffect(() => {
    setSupported(Boolean(getRecognitionConstructor()));
  }, []);

  const clearSilenceTimer = useCallback(() => {
    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = null;
    }
  }, []);

  const stop = useCallback(() => {
    clearSilenceTimer();
    if (recognitionRef.current) {
      try {
        recognitionRef.current.onresult = null;
        recognitionRef.current.onerror = null;
        recognitionRef.current.onend = null;
        recognitionRef.current.stop();
      } catch {
        /* already stopped */
      }
      recognitionRef.current = null;
    }
    setListening(false);
  }, [clearSilenceTimer]);

  const deliverResult = useCallback(
    (text) => {
      const trimmed = String(text || "").trim();
      if (!trimmed || deliveredRef.current) return;
      deliveredRef.current = true;
      clearSilenceTimer();
      stop();
      if (onResultRef.current) onResultRef.current(trimmed);
    },
    [clearSilenceTimer, stop],
  );

  const startWithLangIndex = useCallback(
    (langIndex = 0) => {
      const Recognition = getRecognitionConstructor();
      if (!Recognition) return;

      const candidates = getSttLangCandidates(language);
      const langTag = candidates[langIndex] || candidates[0];
      langIndexRef.current = langIndex;
      deliveredRef.current = false;

      stop();

      const recognition = new Recognition();
      recognition.lang = langTag;
      recognition.interimResults = true;
      recognition.continuous = isIndicLanguage(language);
      recognition.maxAlternatives = 3;

      setActiveLang(langTag);
      setUsedLangFallback(langIndex > 0);

      recognition.onstart = () => {
        setListening(true);
        setTranscript("");
        transcriptRef.current = "";
      };

      recognition.onresult = (event) => {
        let combined = "";
        for (let i = event.resultIndex; i < event.results.length; i += 1) {
          combined += event.results[i][0].transcript;
        }
        setTranscript(combined);
        transcriptRef.current = combined;

        clearSilenceTimer();
        const silenceMs = SILENCE_MS[language] || SILENCE_MS.en;
        silenceTimerRef.current = window.setTimeout(() => {
          deliverResult(combined);
        }, silenceMs);

        const last = event.results[event.results.length - 1];
        if (last?.isFinal && combined.trim()) {
          deliverResult(combined);
        }
      };

      recognition.onerror = (event) => {
        const code = event.error || "recognition-error";

        if (
          (code === "language-not-supported" || code === "service-not-allowed") &&
          langIndexRef.current + 1 < candidates.length
        ) {
          startWithLangIndex(langIndexRef.current + 1);
          return;
        }

        setListening(false);
        if (onErrorRef.current) onErrorRef.current(code);
      };

      recognition.onend = () => {
        setListening(false);
        if (!deliveredRef.current && transcriptRef.current.trim()) {
          deliverResult(transcriptRef.current);
        }
      };

      recognitionRef.current = recognition;

      try {
        recognition.start();
      } catch {
        if (langIndex + 1 < candidates.length) {
          startWithLangIndex(langIndex + 1);
          return;
        }
        setListening(false);
        if (onErrorRef.current) onErrorRef.current("start-failed");
      }
    },
    [language, stop, clearSilenceTimer, deliverResult],
  );

  const start = useCallback(() => {
    startWithLangIndex(0);
  }, [startWithLangIndex]);

  const toggle = useCallback(() => {
    if (listening) {
      const current = transcript;
      stop();
      if (current.trim()) {
        deliverResult(current);
      }
    } else {
      start();
    }
  }, [listening, start, stop, transcript, deliverResult]);

  useEffect(() => {
    return () => stop();
  }, [stop]);

  useEffect(() => {
    if (listening) stop();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [language]);

  return {
    supported,
    listening,
    transcript,
    activeLang,
    usedLangFallback,
    start,
    stop,
    toggle,
  };
}
