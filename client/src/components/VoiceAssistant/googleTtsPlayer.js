/** TTS playback for Hindi/Gujarati — uses Vite proxy (no backend required). */

const TTS_LANG = { en: "en", hi: "hi", gu: "gu" };
const MAX_CHUNK_LEN = 200;

let activeAudio = null;
let activeSession = null;

/** Call synchronously inside a click handler to unlock audio playback. */
export function primeAudioPlayback() {
  if (typeof window === "undefined") return;

  if (window.speechSynthesis) {
    window.speechSynthesis.cancel();
    window.speechSynthesis.resume();
  }

  try {
    const silent = new Audio(
      "data:audio/wav;base64,UklGRigAAABXQVZFZm10IBIAAAABAAEARKwAAIhYAQACABAAZGF0YQQAAAAAAA==",
    );
    silent.volume = 0.01;
    void silent.play().catch(() => {});
  } catch {
    /* ignore */
  }
}

function splitIntoChunks(text) {
  const cleaned = String(text || "").trim();
  if (!cleaned) return [];
  if (cleaned.length <= MAX_CHUNK_LEN) return [cleaned];

  const chunks = [];
  let remaining = cleaned;

  while (remaining.length > MAX_CHUNK_LEN) {
    let splitAt = remaining.lastIndexOf(". ", MAX_CHUNK_LEN);
    if (splitAt < 40) splitAt = remaining.lastIndexOf(" ", MAX_CHUNK_LEN);
    if (splitAt < 40) splitAt = MAX_CHUNK_LEN;
    chunks.push(remaining.slice(0, splitAt).trim());
    remaining = remaining.slice(splitAt).trim();
  }
  if (remaining) chunks.push(remaining);
  return chunks;
}

function isAudioBlob(blob) {
  if (!blob || blob.size < 256) return false;
  const type = (blob.type || "").toLowerCase();
  if (type.includes("text/html") || type.includes("json")) return false;
  if (type.includes("audio") || type.includes("mpeg")) return true;
  return blob.size > 800;
}

function ttsFetchUrls(text, language) {
  const lang = TTS_LANG[language] || "en";
  const q = encodeURIComponent(text);

  return [
    `/tts-google?ie=UTF-8&client=gtx&tl=${lang}&q=${q}`,
    `/tts-google?ie=UTF-8&client=tw-ob&tl=${lang}&q=${q}`,
    `/tts-api?lang=${lang}&q=${q}`,
  ];
}

async function fetchAudioBlob(text, language) {
  const urls = ttsFetchUrls(text, language);
  let lastError = null;

  for (const url of urls) {
    try {
      const response = await fetch(url, { method: "GET", cache: "no-store" });
      if (!response.ok) {
        lastError = new Error(`HTTP ${response.status} for ${url}`);
        continue;
      }
      const blob = await response.blob();
      if (!isAudioBlob(blob)) {
        lastError = new Error(`Not audio (${blob.type || "unknown"}, ${blob.size} bytes)`);
        continue;
      }
      return blob;
    } catch (err) {
      lastError = err;
    }
  }

  throw lastError || new Error("tts-fetch-failed");
}

function playBlob(blob, session) {
  return new Promise((resolve, reject) => {
    if (session !== activeSession) {
      resolve(false);
      return;
    }

    const blobUrl = URL.createObjectURL(blob);
    const audio = new Audio();
    activeAudio = audio;

    const cleanup = () => {
      audio.onended = null;
      audio.onerror = null;
      URL.revokeObjectURL(blobUrl);
      if (activeAudio === audio) activeAudio = null;
    };

    audio.onended = () => {
      cleanup();
      resolve(true);
    };

    audio.onerror = () => {
      cleanup();
      reject(new Error("audio-playback-failed"));
    };

    audio.src = blobUrl;
    audio.load();
    audio.play().catch((err) => {
      cleanup();
      reject(err);
    });
  });
}

export function stopGoogleTts() {
  activeSession = null;
  if (activeAudio) {
    activeAudio.pause();
    activeAudio.removeAttribute("src");
    activeAudio.load();
    activeAudio = null;
  }
}

export async function speakGoogleTts(text, language = "hi") {
  const chunks = splitIntoChunks(text);
  if (!chunks.length) return false;

  const session = Symbol("tts-session");
  activeSession = session;

  try {
    for (const chunk of chunks) {
      if (activeSession !== session) return false;
      const blob = await fetchAudioBlob(chunk, language);
      if (activeSession !== session) return false;
      await playBlob(blob, session);
    }
    return activeSession === session;
  } catch (err) {
    console.warn("[VoiceAssistant] TTS failed:", err);
    throw err;
  } finally {
    if (activeSession === session) activeSession = null;
  }
}

export function isGoogleTtsAvailable(language) {
  return language === "hi" || language === "gu" || language === "en";
}
