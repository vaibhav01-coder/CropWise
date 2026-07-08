# BeejRakshak AIML — Unified API

Single FastAPI application that mounts **Mandi Intelligence** and **Scrapbot (Scheme Assistant)**. One server, two modules.

---

## What It Does

- **Mandi** (`/mandi`): ML-based mandi price recommendations and farmer feedback. Uses `commodity_price.csv`, XGBoost per mandi–crop, arbitrage engine (net profit with transport/storage/perishability).
- **Schemes** (`/schemes`): Government scheme recommendations by state/category; PMFBY claim PDF generation (FPDF). Serves scrapbot static files (e.g. claim PDFs at `/static/`).
- **Kisan AI Chatbot** (`/voice`): AI-powered multilingual farming assistant. Uses Ollama + qwen3:1.7b locally. Supports text chat, voice input/output, and personalised guidance based on farmer dashboard context.

---

## Tech Stack

- **Runtime**: Python 3.x, FastAPI, Uvicorn.
- **Mandi**: Pandas, XGBoost, scikit-learn. Dataset: `mandi_intelligence/dataset/commodity_price.csv` (AGMARKNET-style). Models in `mandi_intelligence/ml_arbitrage/models/` (pickled XGBoost).
- **Scrapbot**: FPDF (claim PDFs), JSON `schemes_db.json`; scheme_scraper, scheme_matcher, claim_generator.
- **Kisan AI Chatbot**: Ollama (local LLM server), qwen3:1.7b, Web Speech API (STT/TTS), `voice_assistant.py`, `AskKisanAI.jsx`.

---

## Layout

```
AIML/
├── main.py                    # Unified app: CORS, mount /mandi, /schemes, /voice; root /health, /mandis, /response, /respond
├── voice_assistant.py         # Ollama-powered Kisan AI Chatbot (streaming LLM client)
├── mandi_intelligence/       # Mandi API + ml_arbitrage + dataset (see mandi_intelligence/README.md)
└── scrapbot/                  # Scheme API + scraper + matcher + claims (see scrapbot/README.md)
```

---

## Run

From repo root or `AIML/`:

```bash
# Dependencies (in AIML or mandi_intelligence)
pip install -r mandi_intelligence/requirements.txt
pip install fpdf   # for claim PDFs

# Start unified API (default port 8000)
python main.py
# or: uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

- **Docs**: http://localhost:8000/docs  
- **Mandi**: http://localhost:8000/mandi/docs  
- **Schemes**: http://localhost:8000/schemes/docs (if scrapbot loaded)

If FPDF is missing, schemes mount may be skipped; a fallback route for `/schemes/api/v1/schemes/recommend` can still serve scheme recommendations via `scheme_matcher`.

---

## Endpoints (root)

- `GET /`, `GET /health` — status.
- `GET /mandis` — list mandis (from Mandi).
- `POST /response` — mandi recommendation (body: crop, quantity, optional farmer_location, latitude, longitude).
- `POST /respond` — submit farmer feedback/sale data.
- `GET /mandi-health` — Mandi health.
- Schemes: under `/schemes/` (e.g. recommend, claims/generate) when scrapbot is loaded.
- `POST /voice/assistant` — Ask the Kisan AI Chatbot a question (supports `stream: true` for real-time SSE streaming).
- `GET /voice/health` — Check if Ollama is reachable.

---

## Kisan AI Chatbot (Voice Assistant)

### Prerequisites

- **Ollama** must be installed ([https://ollama.com](https://ollama.com)).
- **Model** must be pulled: `ollama pull qwen3:1.7b`.

### Configuration

| Variable | Default | Description |
|----------|---------|-------------|
| `OLLAMA_URL` | `http://localhost:11434` | Ollama server address |
| `OLLAMA_MODEL` | `qwen3:1.7b` | Model to use for responses |

### Running

1. Ensure Ollama is running and `ollama list` shows `qwen3:1.7b`.
2. Start the API: `uvicorn main:app --reload --host 0.0.0.0 --port 8000`.
3. Test: `curl http://localhost:8000/voice/health`.

### Files

| File | Purpose |
|------|---------|
| `voice_assistant.py` | Ollama client, prompt builder, streaming handler |
| `AskKisanAI.jsx` | Chat UI component (in `client/src/components/`) |

---

Part of **BeejRakshak**. See root `README.md` for full project overview.
