import { useCallback, useEffect, useRef, useState } from "react";
import {
  getSpeechLang,
  getVoiceCandidates,
  isIndicLanguage,
} from "./speechLanguages";
import {
  isGoogleTtsAvailable,
  speakGoogleTts,
  stopGoogleTts,
} from "./googleTtsPlayer";

function loadVoicesList() {
  if (typeof window === "undefined" || !window.speechSynthesis) return [];
  return window.speechSynthesis.getVoices();
}

export function useSpeechSynthesis(language = "en") {
  const [supported, setSupported] = useState(false);
  const [voices, setVoices] = useState([]);
  const [speaking, setSpeaking] = useState(false);
  const [fallbackNotice, setFallbackNotice] = useState("");
  const [ttsError, setTtsError] = useState("");
  const speakQueueRef = useRef(0);

  useEffect(() => {
    setSupported(typeof window !== "undefined" && "speechSynthesis" in window);
  }, []);

  const refreshVoices = useCallback(() => {
    const list = loadVoicesList();
    if (list.length > 0) setVoices(list);
    return list;
  }, []);

  useEffect(() => {
    if (!supported) return undefined;
    refreshVoices();
    const onVoicesChanged = () => refreshVoices();
    window.speechSynthesis.addEventListener("voiceschanged", onVoicesChanged);
    return () => window.speechSynthesis.removeEventListener("voiceschanged", onVoicesChanged);
  }, [supported, refreshVoices]);

  const stop = useCallback(() => {
    speakQueueRef.current += 1;
    stopGoogleTts();
    window.speechSynthesis?.cancel();
    setSpeaking(false);
  }, []);

  const tryBrowserSpeakSync = useCallback(
    (text) => {
      if (!supported || !window.speechSynthesis) return false;

      const availableVoices = voices.length ? voices : loadVoicesList();
      const candidate =
        getVoiceCandidates(availableVoices, language).find((c) => c.voice) ||
        getVoiceCandidates(availableVoices, language)[0];

      if (!candidate) return false;

      let started = false;
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = candidate.lang || getSpeechLang(language);
      if (candidate.voice) utterance.voice = candidate.voice;
      utterance.rate = language === "en" ? 0.95 : 0.85;

      utterance.onstart = () => {
        started = true;
        setSpeaking(true);
      };
      utterance.onend = () => setSpeaking(false);
      utterance.onerror = () => setSpeaking(false);

      window.speechSynthesis.resume();
      window.speechSynthesis.speak(utterance);

      return started;
    },
    [supported, language, voices],
  );

  const speak = useCallback(
    (text) => {
      if (!text) return;

      speakQueueRef.current += 1;
      const queueId = speakQueueRef.current;

      stopGoogleTts();
      window.speechSynthesis?.cancel();
      setSpeaking(true);
      setFallbackNotice("");
      setTtsError("");

      void (async () => {
        try {
          if (isIndicLanguage(language)) {
            setFallbackNotice("online");
            await speakGoogleTts(text, language);
            if (speakQueueRef.current === queueId) setSpeaking(false);
            return;
          }

          if (language === "en" && supported) {
            tryBrowserSpeakSync(text);
            window.setTimeout(() => {
              if (speakQueueRef.current === queueId) setSpeaking(false);
            }, 8000);
            return;
          }

          if (isGoogleTtsAvailable(language)) {
            setFallbackNotice("online");
            await speakGoogleTts(text, language);
            if (speakQueueRef.current === queueId) setSpeaking(false);
          }
        } catch {
          if (speakQueueRef.current !== queueId) return;

          if (supported && language === "en") {
            tryBrowserSpeakSync(text);
            return;
          }

          setTtsError("no-voice");
          setFallbackNotice("failed");
          setSpeaking(false);
        }
      })();
    },
    [language, supported, voices, tryBrowserSpeakSync],
  );

  useEffect(() => () => stop(), [stop]);
  useEffect(() => {
    stop();
  }, [language, stop]);

  return {
    supported: supported || isGoogleTtsAvailable(language),
    speaking,
    speak,
    stop,
    fallbackNotice,
    ttsError,
    refreshVoices,
  };
}

export { getSpeechLang };
