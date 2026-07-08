/** BCP-47 tags for Web Speech API (STT + TTS). */
export const SPEECH_LANG_MAP = {
  en: "en-IN",
  hi: "hi-IN",
  gu: "gu-IN",
};

/** STT tries these in order when the primary locale is unsupported. */
export const STT_LANG_FALLBACKS = {
  en: ["en-IN", "en-US", "en-GB"],
  hi: ["hi-IN", "en-IN"],
  gu: ["gu-IN", "hi-IN", "en-IN"],
};

/** TTS voice search order per UI language. */
export const TTS_VOICE_SEARCH = {
  en: ["en-IN", "en-US", "en-GB", "en"],
  hi: ["hi-IN", "hi"],
  gu: ["gu-IN", "gu", "hi-IN", "hi"],
};

/** Match Microsoft / Google voice names when lang tag is missing or wrong. */
export const TTS_VOICE_NAME_HINTS = {
  hi: [/hindi/i, /kalpana/i, /heera/i, /madhur/i, /swara/i],
  gu: [/gujarati/i, /dhwani/i, /niranjan/i, /heera/i],
};

export function getSpeechLang(language) {
  return SPEECH_LANG_MAP[language] || "en-IN";
}

export function getSttLangCandidates(language) {
  return STT_LANG_FALLBACKS[language] || STT_LANG_FALLBACKS.en;
}

function normalizeLang(tag) {
  return String(tag || "").toLowerCase().replace("_", "-");
}

function voiceMatchesLang(voice, target) {
  const vLang = normalizeLang(voice.lang);
  const tLang = normalizeLang(target);
  const prefix = tLang.split("-")[0];
  return vLang === tLang || vLang.startsWith(`${prefix}-`) || vLang === prefix;
}

function findVoicesByLang(voices, target) {
  const prefix = target.split("-")[0];
  return voices.filter(
    (v) =>
      normalizeLang(v.lang) === normalizeLang(target) ||
      normalizeLang(v.lang).startsWith(`${prefix}-`) ||
      normalizeLang(v.lang) === prefix,
  );
}

function findVoicesByName(voices, language) {
  const hints = TTS_VOICE_NAME_HINTS[language] || [];
  return voices.filter((v) => hints.some((re) => re.test(v.name || "")));
}

/**
 * Ordered TTS attempts: native voice first, then lang-only (browser default engine).
 * Never pairs English voice with Hindi/Gujarati script text.
 */
export function getVoiceCandidates(voices, language) {
  const targetLang = getSpeechLang(language);
  const candidates = [];
  const seen = new Set();

  function add(voice, lang, usedFallback = false) {
    const key = `${voice?.name || "none"}::${lang}`;
    if (seen.has(key)) return;
    seen.add(key);
    candidates.push({ voice: voice || null, lang, usedFallback });
  }

  if (!voices?.length) {
    add(null, targetLang, language !== "en");
    return candidates;
  }

  const searchOrder = TTS_VOICE_SEARCH[language] || TTS_VOICE_SEARCH.en;

  for (const target of searchOrder) {
    for (const voice of findVoicesByLang(voices, target)) {
      add(voice, voice.lang || target, false);
    }
  }

  if (language === "hi" || language === "gu") {
    for (const voice of findVoicesByName(voices, language)) {
      add(voice, voice.lang || targetLang, false);
    }
  }

  if (language === "en") {
    const english =
      findVoicesByLang(voices, "en-IN")[0] ||
      findVoicesByLang(voices, "en-US")[0] ||
      voices.find((v) => normalizeLang(v.lang).startsWith("en"));
    if (english) add(english, english.lang || "en-IN", false);
  }

  // Let the browser pick the engine for this locale (works when voice list is incomplete).
  add(null, targetLang, false);

  if (language === "hi" || language === "gu") {
    add(null, targetLang, true);
  }

  return candidates;
}

export function findVoiceForLanguage(voices, language) {
  const candidates = getVoiceCandidates(voices, language);
  return candidates[0] || { voice: null, lang: getSpeechLang(language), usedFallback: language !== "en" };
}

export function isIndicLanguage(language) {
  return language === "hi" || language === "gu";
}

export function containsIndicScript(text) {
  return /[\u0900-\u097F\u0A80-\u0AFF]/.test(String(text || ""));
}
