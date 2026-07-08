import { getTabLabel, isValidTabId } from "./navigationMap";

/** Supported chatbot UI / voice languages only. */
export const CHAT_LANGUAGES = ["en", "hi", "gu"];

export const NAVIGATION_KEYWORDS = {
  mandi: {
    en: [
      "mandi price",
      "market price",
      "crop price",
      "sell price",
      "mandi",
      "show me mandi",
      "mandi prices",
    ],
    hi: ["मंडी भाव", "बाजार भाव", "फसल का दाम", "मंडी", "मंडी दिखाओ", "भाव दिखाओ"],
    gu: ["મંડી ભાવ", "બજાર ભાવ", "પાકનો ભાવ", "મંડી", "મંડી બતાવો", "ભાવ બતાવો"],
  },
  disease: {
    en: [
      "disease",
      "crop disease",
      "sick plant",
      "leaf problem",
      "check disease",
      "disease check",
      "disease scan",
      "show me disease",
    ],
    hi: [
      "बीमारी",
      "फसल की बीमारी",
      "पत्ती की समस्या",
      "रोग जांच",
      "रोग तपास",
      "बीमारी जांच",
    ],
    gu: [
      "રોગ",
      "પાક રોગ",
      "પાનની સમસ્યા",
      "રોગ તપાસ",
      "રોગ તપાસો",
      "બીમારી",
    ],
  },
  fertilizer: {
    en: [
      "fertilizer",
      "fertilizer plan",
      "nutrients",
      "fertilizer advice",
      "show fertilizer",
    ],
    hi: ["खाद", "उर्वरक", "उर्वरक योजना", "खाद सलाह"],
    gu: ["ખાતર", "ખાતર યોજના", "ખાતર સલાહ"],
  },
  schemes: {
    en: [
      "scheme",
      "government scheme",
      "subsidy",
      "govt scheme",
      "show schemes",
      "government schemes",
    ],
    hi: ["योजना", "सरकारी योजना", "सब्सिडी", "योजनाएं"],
    gu: ["યોજના", "સરકારી યોજના", "સબસિડી", "યોજનાઓ"],
  },
  alerts: {
    en: ["alert", "alerts", "notification", "take me to alerts", "show alerts"],
    hi: ["चेतावनी", "अलर्ट", "सूचना"],
    gu: ["ચેતવણી", "એલર્ટ", "સૂચના"],
  },
  advisory: {
    en: ["crop advisory", "advisory", "crop advice", "what crop", "show advisory"],
    hi: ["फसल सलाह", "सलाह", "फसल सुझाव"],
    gu: ["પાક સલાહ", "સલાહ", "પાક સૂચન"],
  },
  weather: {
    en: ["weather", "forecast", "rain", "show weather"],
    hi: ["मौसम", "मौसम की जानकारी", "बारिश"],
    gu: ["હવામાન", "હવામાન માહિતી", "વરસાદ"],
  },
  overview: {
    en: ["overview", "home", "dashboard home", "take me home"],
    hi: ["अवलोकन", "होम", "मुख्य पृष्ठ"],
    gu: ["ઝાંખી", "હોમ", "મુખ્ય પાનું"],
  },
  calendar: {
    en: ["calendar", "adaptive calendar", "farm calendar", "show calendar"],
    hi: ["कैलेंडर", "कृषि कैलेंडर"],
    gu: ["કેલેન્ડર", "કૃષિ કેલેન્ડર"],
  },
};

const NAVIGATION_VERBS = {
  en: ["show", "open", "go to", "take me to", "navigate", "switch to", "view"],
  hi: ["दिखाओ", "खोलो", "ले जाओ", "जाओ", "बताओ"],
  gu: ["બતાવો", "ખોલો", "લઈ જાઓ", "જાઓ"],
};

const FAQ_ENTRIES = [
  {
    id: "about",
    keywords: {
      en: ["what is cropwise", "what is beejrakshak", "about cropwise", "about this app"],
      hi: ["क्रॉपवाइज क्या है", "बीजरक्षक क्या है", "इस ऐप के बारे"],
      gu: ["ક્રોપવાઇઝ શું છે", "બીજરક્ષક શું છે", "આ એપ વિશે"],
    },
    replies: {
      en: "CropWise (BeejRakshak) is an agricultural AI platform for Indian farmers. It helps with mandi prices, crop advisory, fertilizer plans, disease detection, government schemes, weather, and alerts — all in one dashboard.",
      hi: "क्रॉपवाइज (बीजरक्षक) भारतीय किसानों के लिए एक कृषि AI प्लेटफॉर्म है। यह मंडी भाव, फसल सलाह, उर्वरक योजना, रोग जांच, सरकारी योजनाएं, मौसम और अलर्ट — सब एक ही डैशबोर्ड में देता है।",
      gu: "ક્રોપવાઇઝ (બીજરક્ષક) ભારતીય ખેડૂતો માટે કૃષિ AI પ્લેટફોર્મ છે. તે મંડી ભાવ, પાક સલાહ, ખાતર યોજના, રોગ તપાસ, સરકારી યોજનાઓ, હવામાન અને ચેતવણી — બધું એક ડેશબોર્ડમાં આપે છે.",
    },
  },
  {
    id: "disease_how",
    keywords: {
      en: ["how do i check disease", "how to check disease", "how disease works"],
      hi: ["बीमारी कैसे जांचें", "रोग कैसे जांचूं"],
      gu: ["રોગ કેવી રીતે તપાસવો", "રોગ તપાસ કેવી રીતે"],
    },
    replies: {
      en: "Open the Disease Scan tab, upload a clear photo of an affected leaf, and tap Analyze. The AI model will suggest the likely disease and basic treatment advice. Want me to take you there?",
      hi: "रोग जांच टैब खोलें, प्रभावित पत्ती की स्पष्ट फोटो अपलोड करें और विश्लेषण पर टैप करें। AI मॉडल संभावित रोग और उपचार सलाह देगा। क्या मैं आपको वहां ले जाऊं?",
      gu: "રોગ તપાસ ટેબ ખોલો, પ્રભાવિત પાનની સ્પષ્ટ ફોટો અપલોડ કરો અને Analyze પર ટેપ કરો. AI મોડેલ સંભવિત રોગ અને સારવાર સલાહ આપશે. શું હું તમને ત્યાં લઈ જાઉં?",
    },
    suggestTab: "disease",
  },
  {
    id: "schemes_how",
    keywords: {
      en: ["what schemes", "how schemes work", "available schemes", "subsidy help"],
      hi: ["कौन सी योजनाएं", "योजनाएं कैसे", "उपलब्ध योजनाएं"],
      gu: ["કઈ યોજનાઓ", "યોજનાઓ કેવી રીતે", "ઉપલબ્ધ યોજનાઓ"],
    },
    replies: {
      en: "The Govt Schemes tab matches your profile (state, land size, category) to relevant subsidies and can generate claim PDFs like PMFBY crop insurance. Want me to open it?",
      hi: "सरकारी योजनाएं टैब आपकी प्रोफ़ाइल (राज्य, जमीन, श्रेणी) के अनुसार योजनाएं सुझाता है और PMFBY जैसे दावे PDF बना सकता है। क्या मैं इसे खोलूं?",
      gu: "સરકારી યોજનાઓ ટેબ તમારી પ્રોફાઇલ (રાજ્ય, જમીન, શ્રેણી) મુજબ યોજનાઓ સૂચવે છે અને PMFBY જેવા દાવાના PDF બનાવી શકે છે. શું હું તે ખોલું?",
    },
    suggestTab: "schemes",
  },
  {
    id: "kisan_helpline",
    keywords: {
      en: [
        "national kisan call centre",
        "kisan call centre",
        "kisan helpline",
        "kcc helpline",
        "farmer helpline",
        "helpline number",
        "scheme helpline",
      ],
      hi: ["किसान कॉल सेंटर", "किसान हेल्पलाइन", "हेल्पलाइन नंबर", "केसीसी हेल्पलाइन"],
      gu: ["કિસાન કોલ સેન્ટર", "ખેડૂત હેલ્પલાઇન", "હેલ્પલાઇન નંબર", "કેસીસી હેલ્પલાઇન"],
    },
    replies: {
      en: "National Kisan Call Centre (KCC) helpline: 1800-180-1551. It is toll-free and available from 6:00 AM to 10:00 PM, all seven days.",
      hi: "नेशनल किसान कॉल सेंटर (KCC) हेल्पलाइन 1800-180-1551 है। यह टोल-फ्री है और सुबह 6:00 बजे से रात 10:00 बजे तक, सप्ताह के सातों दिन उपलब्ध है।",
      gu: "નેશનલ કિસાન કોલ સેન્ટર (KCC) હેલ્પલાઇન 1800-180-1551 છે. આ ટોલ-ફ્રી છે અને સવારે 6:00 થી રાત્રે 10:00 સુધી, અઠવાડિયાના સાતેય દિવસ ઉપલબ્ધ છે.",
    },
    suggestTab: "schemes",
    redirect: true,
  },
  {
    id: "mandi_how",
    keywords: {
      en: ["how mandi works", "how to get mandi price", "price forecast"],
      hi: ["मंडी कैसे काम करती है", "भाव कैसे देखें"],
      gu: ["મંડી કેવી રીતે કામ કરે", "ભાવ કેવી રીતે જોવા"],
    },
    replies: {
      en: "Mandi Prices uses historical market data and ML to forecast prices and suggest where to sell for better profit. Select your crop and quantity to get a recommendation.",
      hi: "मंडी भाव ऐतिहासिक डेटा और ML से भाव का अनुमान लगाता है और बेहतर लाभ के लिए बिक्री की सलाह देता है। अपनी फसल और मात्रा चुनकर सिफारिश पाएं।",
      gu: "મંડી ભાવ ઐતિહાસિક ડેટા અને ML થી ભાવ અનુમાન કરે છે અને વધુ નફા માટે વેચાણ સલાહ આપે છે. તમારો પાક અને જથ્થો પસંદ કરીને સૂચન મેળવો.",
    },
    suggestTab: "mandi",
  },
  {
    id: "help",
    keywords: {
      en: ["help", "what can you do", "commands", "how to use"],
      hi: ["मदद", "आप क्या कर सकते", "कमांड", "कैसे उपयोग"],
      gu: ["મદદ", "તમે શું કરી શકો", "આદેશ", "કેવી રીતે વાપરવું"],
    },
    replies: {
      en: "I can navigate you to Mandi Prices, Disease Scan, Fertilizer Plan, Govt Schemes, Alerts, Weather, Crop Advisory, and more. Try: \"Show mandi prices\" or \"Check crop disease\". You can type or use the microphone.",
      hi: "मैं आपको मंडी भाव, रोग जांच, उर्वरक योजना, सरकारी योजनाएं, अलर्ट, मौसम, फसल सलाह आदि पर ले जा सकता हूं। कोशिश करें: \"मंडी भाव दिखाओ\" या \"फसल की बीमारी जांचें\"।",
      gu: "હું તમને મંડી ભાવ, રોગ તપાસ, ખાતર યોજના, સરકારી યોજનાઓ, ચેતવણી, હવામાન, પાક સલાહ વગેરે પર લઈ જઈ શકું. પ્રયત્ન કરો: \"મંડી ભાવ બતાવો\" અથવા \"પાક રોગ તપાસો\".",
    },
  },
];

function normalizeText(text) {
  return String(text || "")
    .toLowerCase()
    .trim()
    .replace(/\s+/g, " ");
}

function languageOrEn(language) {
  return CHAT_LANGUAGES.includes(language) ? language : "en";
}

/**
 * Layer 1: offline keyword/phrase matching — zero network dependency.
 * @returns {{ intent: 'navigate', targetTab: string, confidence: number } | null}
 */
export function matchIntentByKeyword(message, language = "en") {
  const lang = languageOrEn(language);
  const normalized = normalizeText(message);
  if (!normalized) return null;

  let bestMatch = null;

  for (const [tabId, phrasesByLang] of Object.entries(NAVIGATION_KEYWORDS)) {
    const phrases = [
      ...(phrasesByLang[lang] || []),
      ...(phrasesByLang.en || []),
    ];

    for (const phrase of phrases) {
      const needle = normalizeText(phrase);
      if (!needle) continue;

      if (normalized.includes(needle)) {
        const score = needle.length / normalized.length;
        if (!bestMatch || score > bestMatch.confidence) {
          bestMatch = { intent: "navigate", targetTab: tabId, confidence: Math.min(0.99, 0.6 + score) };
        }
      }
    }
  }

  const verbs = [...(NAVIGATION_VERBS[lang] || []), ...(NAVIGATION_VERBS.en || [])];
  const hasNavVerb = verbs.some((verb) => normalized.includes(normalizeText(verb)));

  if (bestMatch && (hasNavVerb || bestMatch.confidence >= 0.75)) {
    return bestMatch;
  }

  if (bestMatch && bestMatch.confidence >= 0.85) {
    return bestMatch;
  }

  return null;
}

/**
 * Layer 2: LLM-based fallback — DISABLED for MVP (no backend).
 * Returns null always. Enable when AIML voice_assistant router is deployed.
 * @returns {Promise<{ intent: string, targetTab?: string, reply?: string, confidence?: number } | null>}
 */
export async function matchIntentByLLM(_message, _language = "en", _context = {}) {
  return null;
}

/**
 * Static FAQ matching — client-side, offline.
 * @returns {{ intent: 'faq', reply: string, suggestTab?: string, redirect?: boolean } | null}
 */
export function matchFAQ(message, language = "en") {
  const lang = languageOrEn(language);
  const normalized = normalizeText(message);
  if (!normalized) return null;

  for (const entry of FAQ_ENTRIES) {
    const keywords = [...(entry.keywords[lang] || []), ...(entry.keywords.en || [])];
    for (const keyword of keywords) {
      if (normalized.includes(normalizeText(keyword))) {
        return {
          intent: "faq",
          reply: entry.replies[lang] || entry.replies.en,
          suggestTab: entry.suggestTab,
          redirect: entry.redirect === true,
        };
      }
    }
  }

  return null;
}

/**
 * Process a user message and return a bot response payload.
 */
export async function processUserMessage(message, language = "en", options = {}) {
  const lang = languageOrEn(language);
  const { canNavigate = true } = options;

  const keywordMatch = matchIntentByKeyword(message, lang);
  if (keywordMatch && isValidTabId(keywordMatch.targetTab)) {
    const tabLabel = getTabLabel(keywordMatch.targetTab, lang);
    const navReplies = {
      en: (label) => `Opening ${label} for you now.`,
      hi: (label) => `अब ${label} खोल रहा हूं।`,
      gu: (label) => `હવે ${label} ખોલી રહ્યો છું.`,
    };
    const replyFn = navReplies[lang] || navReplies.en;
    return {
      intent: "navigate",
      targetTab: keywordMatch.targetTab,
      reply: canNavigate
        ? replyFn(tabLabel)
        : getLoginFirstMessage(lang),
      confidence: keywordMatch.confidence,
      shouldNavigate: canNavigate,
    };
  }

  const llmMatch = await matchIntentByLLM(message, lang);
  if (llmMatch?.intent === "navigate" && isValidTabId(llmMatch.targetTab)) {
    return {
      intent: "navigate",
      targetTab: llmMatch.targetTab,
      reply: llmMatch.reply || getLoginFirstMessage(lang),
      confidence: llmMatch.confidence || 0.5,
      shouldNavigate: canNavigate,
    };
  }
  if (llmMatch?.intent === "faq" && llmMatch.reply) {
    return { intent: "faq", reply: llmMatch.reply, shouldNavigate: false };
  }

  const faqMatch = matchFAQ(message, lang);
  if (faqMatch) {
    if (faqMatch.redirect && faqMatch.suggestTab && isValidTabId(faqMatch.suggestTab)) {
      const tabLabel = getTabLabel(faqMatch.suggestTab, lang);
      const navReplies = {
        en: (label) => `Opening ${label} for you now.`,
        hi: (label) => `अब ${label} खोल रहा हूं।`,
        gu: (label) => `હવે ${label} ખોલી રહ્યો છું.`,
      };
      const replyFn = navReplies[lang] || navReplies.en;
      return {
        intent: "navigate",
        targetTab: faqMatch.suggestTab,
        reply: canNavigate
          ? `${faqMatch.reply} ${replyFn(tabLabel)}`
          : `${faqMatch.reply} ${getLoginFirstMessage(lang)}`,
        shouldNavigate: canNavigate,
      };
    }

    return {
      intent: "faq",
      reply: faqMatch.reply,
      suggestTab: faqMatch.suggestTab,
      shouldNavigate: false,
    };
  }

  return {
    intent: "unknown",
    reply: getUnknownMessage(lang),
    shouldNavigate: false,
  };
}

export function getWelcomeMessage(language = "en") {
  const lang = languageOrEn(language);
  const messages = {
    en: "Hello! I'm your CropWise assistant. Ask me to open Mandi Prices, Disease Scan, Fertilizer Plan, Schemes, or Alerts — in English, Hindi, or Gujarati.",
    hi: "नमस्ते! मैं आपका क्रॉपवाइज सहायक हूं। मंडी भाव, रोग जांच, उर्वरक, योजनाएं या अलर्ट खोलने को कहें — हिंदी, अंग्रेजी या गुजराती में।",
    gu: "નમસ્તે! હું તમારો ક્રોપવાઇઝ સહાયક છું. મંડી ભાવ, રોગ તપાસ, ખાતર, યોજનાઓ અથવા ચેતવણી ખોલવા કહો — ગુજરાતી, હિંદી અથવા અંગ્રેજીમાં.",
  };
  return messages[lang];
}

function getUnknownMessage(language) {
  const messages = {
    en: "I'm not sure about that. Try asking to open a section (e.g. \"Show mandi prices\") or ask \"What is CropWise?\" or \"Help\".",
    hi: "मुझे समझ नहीं आया। किसी अनुभाग को खोलने को कहें (जैसे \"मंडी भाव दिखाओ\") या \"क्रॉपवाइज क्या है?\" पूछें।",
    gu: "મને સમજાયું નહીં. કોઈ વિભાગ ખોલવા કહો (જેમ કે \"મંડી ભાવ બતાવો\") અથવા \"ક્રોપવાઇઝ શું છે?\" પૂછો.",
  };
  return messages[language] || messages.en;
}

function getLoginFirstMessage(language) {
  const messages = {
    en: "Please log in and open the Dashboard first — then I can navigate you to that section.",
    hi: "कृपया पहले लॉग इन करें और डैशबोर्ड खोलें — फिर मैं आपको उस अनुभाग पर ले जा सकता हूं।",
    gu: "કૃપા કરીને પહેલા લોગ ઇન કરો અને ડેશબોર્ડ ખોલો — પછી હું તમને તે વિભાગ પર લઈ જઈ શકું.",
  };
  return messages[language] || messages.en;
}

export const UI_STRINGS = {
  en: {
    title: "CropWise Assistant",
    placeholder: "Type a message…",
    send: "Send",
    open: "Open chat",
    close: "Close",
    listening: "Listening…",
    micUnsupported: "Voice input isn't supported in this browser — try Chrome or Edge.",
    ttsFallback: "Voice not available for this language — reading in English.",
    ttsOnline: "Using online voice (internet required).",
    ttsFailed: "Could not play audio. Hard-refresh (Ctrl+Shift+R), use Chrome/Edge, and stay on http://localhost:5173 with internet.",
    ttsNoVoice: "No Hindi/Gujarati voice found. Install it in Windows Settings → Time & language → Speech, then reload.",
    sttLangFallback: "Using alternate recognition language for this browser.",
    sttError: "Could not capture voice. Check mic permission and try Chrome or Edge.",
    loginFirst: "Please log in to the Dashboard to use navigation.",
    listen: "Listen",
    playing: "Playing…",
  },
  hi: {
    title: "क्रॉपवाइज सहायक",
    placeholder: "संदेश लिखें…",
    send: "भेजें",
    open: "चैट खोलें",
    close: "बंद करें",
    listening: "सुन रहा हूं…",
    micUnsupported: "इस ब्राउज़र में वॉइस इनपुट समर्थित नहीं — Chrome या Edge आज़माएं।",
    ttsFallback: "इस भाषा के लिए आवाज़ उपलब्ध नहीं — अंग्रेजी में पढ़ रहा हूं।",
    ttsOnline: "ऑनलाइन आवाज़ उपयोग हो रही है (इंटरनेट आवश्यक)।",
    ttsFailed: "ऑडियो नहीं चल सका। इंटरनेट जांचें और Chrome या Edge आज़माएं।",
    ttsNoVoice: "हिंदी/गुजराती आवाज़ नहीं मिली। Windows Settings → Time & language → Speech में भाषा इंस्टॉल करें, फिर पेज रीलोड करें।",
    sttLangFallback: "इस ब्राउज़र के लिए वैकल्पिक पहचान भाषा उपयोग हो रही है।",
    sttError: "आवाज़ कैप्चर नहीं हो सकी। माइक अनुमति जांचें और Chrome या Edge आज़माएं।",
    loginFirst: "नेविगेशन के लिए डैशबोर्ड पर लॉग इन करें।",
    listen: "सुनें",
    playing: "चल रहा है…",
  },
  gu: {
    title: "ક્રોપવાઇઝ સહાયક",
    placeholder: "સંદેશ લખો…",
    send: "મોકલો",
    open: "ચેટ ખોલો",
    close: "બંધ કરો",
    listening: "સાંભળી રહ્યો છું…",
    micUnsupported: "આ બ્રાઉઝરમાં વૉઇસ ઇનપુટ સપોર્ટેડ નથી — Chrome અથવા Edge અજમાવો.",
    ttsFallback: "આ ભાષા માટે અવાજ ઉપલબ્ધ નથી — અંગ્રેજીમાં વાંચી રહ્યો છું.",
    ttsOnline: "ઓનલાઇન અવાજ વપરાય છે (ઇન્ટરનેટ જરૂરી).",
    ttsFailed: "ઑડિયો ચાલી શક્યું નહીં. ઇન્ટરનેટ તપાસો અને Chrome અથવા Edge અજમાવો.",
    ttsNoVoice: "હિંદી/ગુજરાતી અવાજ મળ્યો નહીં. Windows Settings → Time & language → Speech માં ભાષા ઇન્સ્ટોલ કરો, પછી પેજ રીલોડ કરો.",
    sttLangFallback: "આ બ્રાઉઝર માટે વૈકલ્પિક ઓળખ ભાષા વપરાય છે.",
    sttError: "અવાજ કેપ્ચર થઈ શક્યો નહીં. માઇક પરમિશન તપાસો અને Chrome અથવા Edge અજમાવો.",
    loginFirst: "નેવિગેશન માટે ડેશબોર્ડ પર લોગ ઇન કરો.",
    listen: "સાંભળો",
    playing: "ચાલી રહ્યું છે…",
  },
};

export function getUiStrings(language = "en") {
  const lang = languageOrEn(language);
  return UI_STRINGS[lang] || UI_STRINGS.en;
}
