/** Single source of truth for valid Dashboard tab ids (matches Dashboard.jsx NAV_ITEMS). */
export const VALID_TAB_IDS = [
  "overview",
  "weather",
  "mandi",
  "advisory",
  "fertilizer",
  "disease",
  "schemes",
  "alerts",
  "calendar",
];

export const TAB_LABELS = {
  overview: { en: "Overview", hi: "अवलोकन", gu: "ઝાંખી" },
  weather: { en: "Weather", hi: "मौसम", gu: "હવામાન" },
  mandi: { en: "Mandi Prices", hi: "मंडी भाव", gu: "મંડી ભાવ" },
  advisory: { en: "Crop Advisory", hi: "फसल सलाह", gu: "પાક સલાહ" },
  fertilizer: { en: "Fertilizer Plan", hi: "उर्वरक योजना", gu: "ખાતર યોજના" },
  disease: { en: "Disease Scan", hi: "रोग जांच", gu: "રોગ તપાસ" },
  schemes: { en: "Govt Schemes", hi: "सरकारी योजनाएं", gu: "સરકારી યોજનાઓ" },
  alerts: { en: "Alert System", hi: "चेतावनी प्रणाली", gu: "ચેતવણી સિસ્ટમ" },
  calendar: { en: "Adaptive Calendar", hi: "अनुकूली कैलेंडर", gu: "અનુકૂળ કેલેન્ડર" },
};

export function isValidTabId(tabId) {
  return VALID_TAB_IDS.includes(tabId);
}

export function getTabLabel(tabId, language = "en") {
  const labels = TAB_LABELS[tabId];
  if (!labels) return tabId;
  return labels[language] || labels.en;
}

/** Dispatches a tab-switch event consumed by Dashboard.jsx. */
export function navigateToTab(tabId) {
  if (!isValidTabId(tabId)) return false;
  window.dispatchEvent(
    new CustomEvent("cropwise:navigate", { detail: { tab: tabId } }),
  );
  return true;
}
