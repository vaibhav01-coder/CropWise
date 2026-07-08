import json
import logging
import os
import re
import time
import traceback
from typing import Any, Dict, Generator, List, Optional

from dotenv import load_dotenv
import requests

load_dotenv()

logger = logging.getLogger(__name__)

_SYSTEM_PROMPT = (
    "You are Kisan AI, an expert agricultural advisor for Indian farmers.\n"
    "Rules: Respond in the SAME language as the user. Never translate. "
    "Never mix languages. Use simple farmer-friendly words. "
    "If info missing (soil, weather, crop, location), ask follow-ups. "
    "Never invent data. Keep answers short, practical, step-by-step."
)

_LANG_CODE_TO_NAME = {
    "en-in": "english", "en": "english",
    "hi-in": "hindi", "hi": "hindi",
    "gu-in": "gujarati", "gu": "gujarati",
    "mr-in": "marathi", "mr": "marathi",
    "ta-in": "tamil", "ta": "tamil",
    "te-in": "telugu", "te": "telugu",
    "kn-in": "kannada", "kn": "kannada",
    "ml-in": "malayalam", "ml": "malayalam",
    "pa-in": "punjabi", "pa": "punjabi",
    "bn-in": "bengali", "bn": "bengali",
    "or-in": "odia", "or": "odia",
    "ur-in": "urdu", "ur": "urdu",
    "sa-in": "sanskrit", "sa": "sanskrit",
}


def _sanitize_text(text: str, max_length: int = 2000) -> str:
    if not text:
        return ""
    cleaned = "".join(ch for ch in text if ch.isprintable() or ch in "\n\r\t")
    return cleaned.strip()[:max_length]


def _build_context(question: str, profile: dict) -> str:
    q = question.lower()
    parts = []
    crop_kw = ["crop","plant","seed","fertilizer","pest","disease","leaf","yellow","yield","harvest","weed","insect"]
    soil_kw = ["soil","land","clay","sandy","loam","fertile"]
    water_kw = ["water","rain","irrigation","drought","weather","humid","moisture"]
    if any(k in q for k in crop_kw):
        if profile.get("primary_crop"): parts.append(f"Crop: {profile['primary_crop']}")
        if profile.get("crop_stage"):   parts.append(f"Stage: {profile['crop_stage']}")
    if any(k in q for k in soil_kw) and profile.get("soil_type"):
        parts.append(f"Soil: {profile['soil_type']}")
    if any(k in q for k in water_kw):
        if profile.get("weather"):   parts.append(f"Weather: {profile['weather']}")
    if profile.get("state"):
        loc = " ".join(filter(None, [profile.get("village",""), profile.get("district",""), profile["state"]]))
        if loc.strip(): parts.append(f"Location: {loc}")
    return "\n".join(parts)


def build_voice_prompt(
    question: str,
    profile: Optional[Dict[str, Any]] = None,
    history: Optional[List[Dict[str, Any]]] = None,
    language: Optional[str] = None,
) -> str:
    profile = profile or {}
    history = history or []

    lang = (language or profile.get("preferred_language") or "english").strip().lower()
    lang_name = _LANG_CODE_TO_NAME.get(lang, lang)

    context = _build_context(question, profile)

    history_text = ""
    if history:
        recent = [f"{h.get('role','user')}: {h.get('content','')}" for h in history[-3:] if h.get('content')]
        if recent:
            history_text = "Previous:\n" + "\n".join(recent)

    parts = [_SYSTEM_PROMPT]
    if context:
        parts.append(context)
    if history_text:
        parts.append(history_text)
    parts.append(f"Q ({lang_name}): {question}")
    parts.append(f"A ({lang_name}):")
    return "\n".join(parts)


def _fallback_reply(
    question: str,
    profile: Optional[Dict[str, Any]] = None,
    language: Optional[str] = None,
) -> str:
    profile = profile or {}
    crop = (profile.get("primary_crop") or "your crop").strip()
    lang = (language or profile.get("preferred_language") or "english").strip().lower()
    if lang.startswith("hi"):
        return (
            f"नमस्ते! आपने {crop} के बारे में पूछा है। यहाँ कुछ सामान्य सुझाव दिए गए हैं:\n\n"
            "1. मिट्टी की नमी जाँचें - 6 इंच गहराई तक मिट्टी सूखी है तो पानी दें।\n"
            "2. कीटों के लिए पत्तियों के नीचे का निरीक्षण करें।\n"
            "3. मौसम के पूर्वानुमान की जाँच करें।\n"
            "4. अपने स्थानीय कृषि अधिकारी से संपर्क करें।\n\n"
            "कृपया अपने प्रश्न के बारे में और अधिक जानकारी दें ताकि मैं बेहतर सलाह दे सकूँ।"
        )
    if lang.startswith("gu"):
        return (
            f"નમસ્તે! તમે {crop} વિશે પૂછ્યું છે. અહીં કેટલીક સામાન્ય સલાહ આપેલ છે:\n\n"
            "1. જમીનની ભેજ તપાસો - 6 ઇંચ ઊંડા સુકા હોય તો પાણી આપો.\n"
            "2. જીવાત માટે પાંદડાની નીચે તપાસ કરો.\n"
            "3. હવામાનનો અંદાજ તપાસો.\n"
            "4. તમારા સ્થાનિક કૃષિ અધિકારીનો સંપર્ક કરો.\n\n"
            "કૃપા કરીને તમારા પ્રશ્ન વિશે વધુ માહિતી આપો જેથી હું વધુ સારી સલાહ આપી શકું."
        )
    return (
        f"Hello! You asked about {crop}. Here are some general tips:\n\n"
        "1. Check soil moisture - if dry 6 inches deep, irrigate.\n"
        "2. Inspect leaves for pests.\n"
        "3. Check weather forecast before any farm activity.\n"
        "4. Consult your local agriculture officer for field-specific advice.\n\n"
        "Please share more details about your specific concern so I can give better advice."
    )


OLLAMA_URL = os.getenv("OLLAMA_URL", "http://localhost:11434")
OLLAMA_MODEL = os.getenv("OLLAMA_MODEL", "qwen3:1.7b")

_OLLAMA_OPTIONS = {
    "num_predict": 2048,
    "num_ctx": 2048,
    "temperature": 0.4,
    "num_thread": 4,
}


def _ask_ollama(prompt: str) -> Optional[str]:
    try:
        try:
            requests.get(f"{OLLAMA_URL}/api/tags", timeout=3)
        except requests.exceptions.ConnectionError:
            logger.info("Ollama not available (is the service running?)")
            return None

        resp = requests.post(
            f"{OLLAMA_URL}/api/generate",
            json={
                "model": OLLAMA_MODEL,
                "prompt": prompt,
                "stream": False,
                "options": _OLLAMA_OPTIONS,
                "keep_alive": "5m",
            },
            timeout=180,
        )
        if resp.status_code != 200:
            logger.error("Ollama returned status=%s body=%s", resp.status_code, resp.text)
            return None
        data = resp.json()
        text = data.get("response", "")
        if text:
            logger.info("Ollama response OK, model=%s length=%d", OLLAMA_MODEL, len(text))
            return text
        logger.warning("Ollama returned empty response (model=%s, data_keys=%s)", OLLAMA_MODEL, list(data.keys()))
        return None
    except requests.exceptions.Timeout:
        logger.warning("Ollama timed out after 180s")
        return None
    except Exception as exc:
        logger.error("Ollama error:\n%s", traceback.format_exc())
        return None


def _ask_ollama_stream(prompt: str) -> Generator[str, None, None]:
    """Yield tokens as Ollama generates them."""
    try:
        requests.get(f"{OLLAMA_URL}/api/tags", timeout=3)
    except requests.exceptions.ConnectionError:
        logger.info("Ollama not available (is the service running?)")
        yield "Sorry, I couldn't connect to the AI model. Please make sure Ollama is running and try again."
        return

    try:
        resp = requests.post(
            f"{OLLAMA_URL}/api/generate",
            json={
                "model": OLLAMA_MODEL,
                "prompt": prompt,
                "stream": True,
                "options": _OLLAMA_OPTIONS,
                "keep_alive": "5m",
            },
            stream=True,
            timeout=180,
        )
        if resp.status_code != 200:
            logger.error("Ollama stream returned status=%s body=%s", resp.status_code, resp.text[:500])
            yield f"[Ollama Error: HTTP {resp.status_code}] {resp.text[:300]}"
            return
        for line in resp.iter_lines(decode_unicode=True):
            if not line:
                continue
            data = json.loads(line)
            if data.get("done"):
                break
            token = data.get("response", "")
            if token:
                yield token
    except Exception as exc:
        logger.error("Ollama stream error:\n%s", traceback.format_exc())
        yield f"[Ollama Error] {type(exc).__name__}: {exc}"


def _build_ollama_prompt(
    question: str,
    profile: Optional[Dict[str, Any]] = None,
    history: Optional[List[Dict[str, Any]]] = None,
    language: Optional[str] = None,
) -> str:
    profile = profile or {}
    lang = (language or profile.get("preferred_language") or "english").strip().lower()
    lang_name = _LANG_CODE_TO_NAME.get(lang, lang)
    crop = profile.get("primary_crop") or ""
    context = _build_context(question, profile)
    parts = [_SYSTEM_PROMPT]
    if crop:
        parts.append(f"Crop: {crop}")
    if context:
        parts.append(context)
    if history:
        recent = [f"{h.get('role','user')}: {h.get('content','')}" for h in history[-3:] if h.get('content')]
        if recent:
            parts.append("Previous:\n" + "\n".join(recent))
    parts.append(f"Q ({lang_name}): {question}")
    parts.append(f"A ({lang_name}):")
    return "\n".join(parts)


def get_gemini_reply(
    question: str,
    profile: Optional[Dict[str, Any]] = None,
    history: Optional[List[Dict[str, Any]]] = None,
    language: Optional[str] = None,
) -> str:
    question = _sanitize_text(question, max_length=2000)
    if not question:
        return _fallback_reply(question, profile, language)

    t0 = time.time()
    prompt = build_voice_prompt(
        question, profile=profile, history=history, language=language
    )
    t1 = time.time()
    logger.info("Timing: prompt_build=%.0fms", (t1 - t0) * 1000)

    reply = _ask_ollama(prompt)
    t2 = time.time()
    logger.info(
        "Timing: ollama=%.0fms total=%.0fms",
        (t2 - t1) * 1000,
        (t2 - t0) * 1000,
    )
    if reply:
        return reply

    logger.warning("Ollama failed - using fallback reply")
    return _fallback_reply(question, profile, language)


def get_gemini_reply_stream(
    question: str,
    profile: Optional[Dict[str, Any]] = None,
    history: Optional[List[Dict[str, Any]]] = None,
    language: Optional[str] = None,
) -> Generator[str, None, None]:
    """Streaming version — yields tokens as they arrive."""
    question = _sanitize_text(question, max_length=2000)
    if not question:
        yield _fallback_reply(question, profile, language)
        return

    prompt = build_voice_prompt(
        question, profile=profile, history=history, language=language
    )
    yield from _ask_ollama_stream(prompt)

