[README .md](https://github.com/user-attachments/files/29812456/README.md)
# 🌾 CropWise (BeejRakshak)

> **An end-to-end AI-powered agricultural intelligence platform** for Indian farmers — spanning a full-featured web app, a React Native mobile app, a unified Python AI/ML backend, and a satellite SAR processing pipeline.

---

## 📑 Table of Contents

1. [Project Overview](#-project-overview)
2. [Key Features](#-key-features)
3. [Architecture](#-architecture)
4. [Repository Structure](#-repository-structure)
5. [Tech Stack](#-tech-stack)
6. [Getting Started](#-getting-started)
   - [Prerequisites](#prerequisites)
   - [Environment Variables](#environment-variables)
   - [Database Setup (Supabase)](#database-setup-supabase)
   - [Running the Web Client](#running-the-web-client)
   - [Running the AI/ML Backend](#running-the-aiml-backend)
   - [Running the Mobile App](#running-the-mobile-app)
   - [Running Everything at Once](#running-everything-at-once)
7. [Module Breakdown](#-module-breakdown)
   - [Web Client (`client/`)](#web-client-client)
   - [AI/ML Backend (`AIML/`)](#aiml-backend-aiml)
   - [Mobile App (`mobile/`)](#mobile-app-mobile)
   - [SAR Processing (`sar_processing/`)](#sar-processing-sar_processing)
8. [API Reference](#-api-reference)
9. [Deployment](#-deployment)
10. [Contributing](#-contributing)

---

## 🌟 Project Overview

**CropWise** (internally called *BeejRakshak* — "seed guardian" in Hindi) is a comprehensive agricultural decision-support platform built for Indian farmers. It combines real-time weather data, ML-powered crop market intelligence, AI disease detection, fertilizer optimization, and government scheme discovery — all accessible via an intuitive web dashboard and a companion mobile app.

The platform is multilingual (English, Hindi, Gujarati, and 11 other Indian languages), voice-controlled, and designed to run in low-bandwidth rural environments.

---

## 🚀 Key Features

| Feature | Description |
|---|---|
| 🌤️ **Weather Intelligence** | Farm-specific weather via Open-Meteo (free, no key) or OpenWeatherMap. Includes 7-day forecast, air quality index, humidity, wind speed. |
| 📊 **Mandi Price Intelligence** | XGBoost ML models for 7-day price forecasting across Gujarat mandis. Spatial + temporal arbitrage engine calculates net profit after transport, storage, and perishability costs. |
| 🔬 **Disease Detection** | MobileNetV2-powered CNN model (`disease_model.keras`) classifies leaf images into crop/disease pairs with confidence scores and actionable advice. |
| 🧪 **Fertilizer Advisor** | District-aware NPK recommendation engine for Gujarat. Adjusts for soil pH, soil type, NDVI (vegetation index), irrigation ratio, and rainfall. Generates a phased application schedule. |
| 📋 **Government Schemes** | Automatic matching of Central and state government agricultural schemes based on farmer profile. Includes integrated PMFBY crop insurance claim generation (PDF). |
| 🛡️ **Alert System** | Rule-based anomaly alerts for weather, market prices, and disease risk with automatic crop advisory generation. |
| 📅 **Adaptive Crop Calendar** | Smart sowing/harvesting calendar tailored to the farmer's primary crop, district, and current crop stage. |
| 🎙️ **Voice Assistant** | In-browser multilingual voice assistant (EN/HI/GU) supporting navigation commands, weather queries, mandi lookups, and disease scan via speech. |
| 🌍 **Translation** | Google Translate integration with 15 Indian language options (English, Hindi, Bengali, Telugu, Marathi, Tamil, Urdu, Gujarati, Kannada, Malayalam, Punjabi, Odia, Assamese, Nepali, Sanskrit). |
| 📡 **SAR Satellite Pipeline** | Sentinel-1 SAR backscatter processing via Google Earth Engine for field-level moisture anomaly detection and flood flagging. |

---

## 🏗️ Architecture

```
┌──────────────────────────────────────────────────────────────────┐
│                         CLIENT LAYER                             │
│  Web App (React + Vite)              Mobile App (Expo RN)        │
│  ├── Dashboard (9 tabs)              ├── Login / Register        │
│  ├── Login / Register                ├── Dashboard               │
│  ├── Profile                         │   ├── Overview            │
│  └── VoiceAssistant                  │   ├── Mandi Prices        │
│                                      │   ├── Advisory            │
│                                      │   └── Alerts              │
└──────────────┬───────────────────────┴──────────┬────────────────┘
               │  REST API (HTTP / Vite Proxy)     │
               ▼                                   ▼
┌──────────────────────────────────────────────────────────────────┐
│                  UNIFIED AI/ML BACKEND (FastAPI)                  │
│  Port 8001  |  beejrakshak.onrender.com (production)             │
│                                                                  │
│  /mandi/*    Mandi Intelligence (XGBoost arbitrage engine)       │
│  /disease/*  Disease Detection (TensorFlow / MobileNetV2)        │
│  /api/*      Fertilizer Advisor (Rule-based NPK engine)          │
│  /schemes/*  Govt Scheme Matcher + PMFBY Claim Generator (PDF)   │
│  /yield/*    Crop Yield Prediction (Java subprocess)             │
└──────────────────────────┬───────────────────────────────────────┘
                           │
               ┌───────────┴──────────┐
               ▼                      ▼
┌─────────────────────┐  ┌────────────────────────────────────────┐
│  Supabase (Postgres) │  │   SAR Processing Pipeline              │
│  ├── farmers         │  │   (Google Earth Engine + PostGIS)      │
│  └── registrations   │  │   Sentinel-1 VV/VH → moisture + flood  │
└─────────────────────┘  └────────────────────────────────────────┘
```

---

## 📁 Repository Structure

```
CropWise-main/
│
├── .env.example                 # Environment variable template
├── .gitignore
├── package.json                 # Root monorepo scripts (concurrently)
├── run-servers.bat              # Windows one-click startup script
│
├── client/                      # React Web Application (Vite)
│   ├── index.html
│   ├── vite.config.js           # Proxy config: /mandi-api, /disease-api, /schemes-api
│   ├── tailwind.config.js
│   ├── vercel.json              # SPA rewrite + Render.com proxy rules
│   └── src/
│       ├── App.jsx              # Route guard logic (login → registration → dashboard)
│       ├── main.jsx
│       ├── index.css
│       ├── pages/
│       │   ├── Dashboard.jsx    # Main app shell (9 navigation tabs)
│       │   ├── Login.jsx        # Name + mobile phone login (no Supabase Auth)
│       │   ├── Registration.jsx # Multi-step farmer onboarding form
│       │   └── Profile.jsx      # Edit farmer profile
│       ├── components/
│       │   ├── DiseaseCheckUpload.jsx   # Image upload → /disease-api/predict
│       │   ├── FertilizerAdvisor.jsx    # NPK recommendation UI
│       │   ├── GovernmentSchemes.jsx    # Scheme browser + PMFBY claim form
│       │   └── VoiceAssistant/
│       │       ├── VoiceAssistantWidget.jsx  # Floating mic UI, chat bubbles
│       │       ├── intentMatcher.js          # EN/HI/GU keyword matching
│       │       ├── navigationMap.js          # Tab ID → label mapping
│       │       ├── speechLanguages.js        # TTS language config
│       │       ├── useSpeechRecognition.js   # Web Speech API hook
│       │       ├── useSpeechSynthesis.js     # TTS hook (Web Speech + Google TTS)
│       │       └── googleTtsPlayer.js        # Google Translate TTS audio player
│       ├── hooks/
│       │   └── useAuth.js               # Session management (localStorage)
│       ├── lib/
│       │   ├── supabase.js              # Supabase client + local session helpers
│       │   ├── registration.js          # CRUD for registrations table
│       │   ├── localDb.js               # localStorage fallback (no Supabase)
│       │   └── farmWeather.js           # Open-Meteo + OpenWeatherMap fetch logic
│       └── translation/
│           ├── TranslationProvider.jsx  # Google Translate context
│           ├── TranslateMenu.jsx        # Language picker dropdown
│           ├── GoogleTranslateWidget.jsx
│           ├── translator.js            # Translation API wrapper
│           ├── languages.js             # 15 language definitions
│           └── index.js
│
├── AIML/                        # Python AI/ML Backend (FastAPI, port 8001)
│   ├── main.py                  # Unified FastAPI app (mounts all sub-apps)
│   ├── requirements.txt         # fastapi, uvicorn, tensorflow, xgboost, etc.
│   ├── disease_detection/
│   │   ├── predict.py           # /disease/predict endpoint (MobileNetV2 CNN)
│   │   └── models/
│   │       ├── disease_model.keras    # Trained TF/Keras model
│   │       └── class_indices.json    # Label index → "Crop___Condition" mapping
│   ├── ml/
│   │   ├── fertilizer_router.py # /api/fertilizer/recommend (NPK engine)
│   │   └── gujarat_districts.csv # Soil type, pH, irrigation ratio per district
│   ├── mandi_intelligence/
│   │   ├── api/
│   │   │   ├── main.py          # Mandi FastAPI sub-app (mounted at /mandi)
│   │   │   └── ml_api.py        # ML prediction endpoints
│   │   ├── core/
│   │   │   ├── insight_generator.py  # Human-readable market insights
│   │   │   └── profit_calculator.py  # Net profit formula implementation
│   │   └── ml_arbitrage/
│   │       ├── data_loader.py         # Kaggle mandi CSV loader + synthetic fallback
│   │       ├── price_predictor.py     # XGBoost per-mandi-crop model
│   │       ├── arbitrage_engine.py    # Spatial + temporal arbitrage optimizer
│   │       ├── distance_calculator.py # Haversine distance + road cost estimate
│   │       └── models/               # Trained XGBoost .bin model files
│   └── scrapbot/
│       └── src/
│           ├── main.py           # Scheme assistant FastAPI sub-app (/schemes)
│           ├── scheme_matcher.py # Profile-based scheme scoring algorithm
│           ├── scheme_scraper.py # Web scraper to populate schemes_db.json
│           ├── schemes_db.json   # Curated Central + state scheme database
│           └── claim_generator.py # PMFBY insurance claim PDF generator (fpdf)
│
├── mobile/                      # React Native Mobile App (Expo SDK 50)
│   ├── App.js
│   ├── app.config.js            # Expo config (Cropwise, package: com.beejrakshak.mobile)
│   ├── eas.json                 # EAS build profiles
│   └── src/
│       ├── theme.js             # Color palette + spacing constants
│       ├── navigation/
│       │   └── AppNavigator.js  # React Navigation stack
│       ├── context/
│       │   └── AuthContext.js   # Auth provider for mobile
│       ├── screens/
│       │   ├── LoginScreen.js
│       │   ├── RegistrationScreen.js
│       │   └── DashboardScreen.js  # Overview / Mandi / Advisory / Alerts tabs
│       ├── components/
│       │   ├── Section.js
│       │   ├── StatCard.js
│       │   └── Badge.js
│       └── lib/
│           ├── registration.js   # Supabase registration fetch
│           ├── farmWeather.js    # Weather fetch (shared logic with web)
│           └── config.js         # API base URL config
│
├── sar_processing/              # Sentinel-1 SAR Pipeline (Python + GEE + PostGIS)
│   ├── config.py                # DB_URL, SAR_* env config
│   ├── db.py                    # PostgreSQL connection + field/SAR CRUD
│   ├── gee_client.py            # Google Earth Engine SAR fetch
│   ├── feature_extractor.py     # VV/VH 7-day delta computation
│   ├── anomaly_detection.py     # Moisture anomaly + flood flag rules
│   ├── worker.py                # Main pipeline runner (cron-compatible)
│   ├── bootstrap_db.py          # PostGIS schema creation (farmers, fields, sar_features)
│   └── seed_sample.py           # Sample data seeder for testing
│
└── docs/
    └── registration-table.sql   # Supabase schema: farmers + registrations tables
```

---

## 🛠️ Tech Stack

### Web Client
| Layer | Technology |
|---|---|
| Framework | React 18 + Vite 5 |
| Routing | React Router DOM v6 |
| Styling | Tailwind CSS 3.4 |
| Database | Supabase (PostgreSQL) + localStorage fallback |
| Auth | Custom mobile-number login (no Supabase Auth) |
| Weather | Open-Meteo (free) / OpenWeatherMap (optional) |
| Translation | Google Translate API (optional) |
| Voice | Web Speech API + Google TTS |

### AI/ML Backend
| Layer | Technology |
|---|---|
| Framework | FastAPI + Uvicorn |
| ML Models | TensorFlow 2.16 (MobileNetV2), XGBoost 2.x |
| Data Processing | pandas, scikit-learn |
| PDF Generation | fpdf |
| Image Processing | Pillow |
| HTTP Client | httpx, requests |
| Web Scraping | BeautifulSoup4 |

### Mobile App
| Layer | Technology |
|---|---|
| Framework | React Native 0.73.6 + Expo SDK 50 |
| Navigation | React Navigation v6 |
| Database | Supabase JS |
| Location | expo-location |
| UI | expo-linear-gradient, react-native-safe-area-context |

### SAR Pipeline
| Layer | Technology |
|---|---|
| Satellite Data | Google Earth Engine (Sentinel-1 GRD) |
| Database | PostgreSQL + PostGIS |
| ORM | psycopg2-binary |
| Geometry | shapely, earthengine-api |

---

## ⚡ Getting Started

### Prerequisites

- **Node.js** v18+ (v20 recommended; bundled in `.tools/` on Windows)
- **Python** 3.10+ with `pip` or `uv`
- **Java** JRE/JDK (for yield prediction subprocess — optional)
- **Supabase** project (free tier works)

---

### Environment Variables

Copy `.env.example` to `.env` in the project root and fill in your values:

```bash
cp .env.example .env
```

```env
# Required — Supabase (get from: Supabase Dashboard → Project Settings → API)
VITE_SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
VITE_SUPABASE_ANON_KEY=your-supabase-anon-key-here

# Optional — adds air quality data to weather widget
# VITE_OPENWEATHER_API_KEY=your-openweathermap-key

# Optional — enables in-app translation
# VITE_GOOGLE_TRANSLATE_API_KEY=your-google-translate-key

# Optional — override AIML backend URL (default: http://localhost:8001 via Vite proxy)
# VITE_BACKEND_ORIGIN=http://127.0.0.1:8001
```

> **Note:** The app runs in a no-Supabase mode (localStorage only) if keys are not set — useful for quick local demos.

---

### Database Setup (Supabase)

1. Create a free project at [supabase.com](https://supabase.com)
2. Go to **SQL Editor → New Query**
3. Paste and run the contents of [`docs/registration-table.sql`](docs/registration-table.sql)

This creates:
- `public.farmers` — farmer login records (name + mobile, UUID PK)
- `public.registrations` — full farmer profile (crop, land, location, preferences)
- RLS policies (open for all — tighten in production)
- Auto-update trigger for `updated_at`

---

### Running the Web Client

```bash
cd client
npm install
npm run dev
# → http://localhost:5173
```

---

### Running the AI/ML Backend

```bash
cd AIML
pip install -r requirements.txt
python -m uvicorn main:app --host 0.0.0.0 --port 8001 --reload
# → http://localhost:8001
# → API docs: http://localhost:8001/docs
```

> **Disease detection:** Requires `AIML/disease_detection/models/disease_model.keras` and `class_indices.json`. These large model files are not committed to the repository. Train or download separately and place in that directory.

---

### Running the Mobile App

```bash
cd mobile
npm install
npx expo start
# Scan QR code with Expo Go (iOS/Android), or press 'a' for Android emulator
```

Configure mobile env variables in `mobile/.env` (copy from `mobile/.env.example`):
```env
EXPO_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key-here
```

---

### Running Everything at Once

**Windows (one command):**
```batch
run-servers.bat
```
Opens two terminal windows: one for the React client, one for the FastAPI backend.

**Cross-platform (npm monorepo):**
```bash
npm install          # install root deps (concurrently)
npm run install:all  # install client + mobile deps
npm run dev          # starts client + AIML server concurrently
```

---

## 📦 Module Breakdown

### Web Client (`client/`)

The web app is a **single-page React application** built with Vite. It has three main route flows:

```
/ → /login → /registration → /dashboard
                               /profile
```

**Route Guard Logic (`App.jsx`):**
- Unauthenticated users → `/login`
- Authenticated but unregistered → `/registration`
- Fully registered → `/dashboard`

**Dashboard Tabs (9 total):**

| Tab | Description |
|---|---|
| **Overview** | Farm summary card, quick-access stats, weather snapshot |
| **Weather** | 7-day forecast, temperature curve, AQI, humidity, wind |
| **Mandi Prices** | ML-powered price predictions, mandi comparison, arbitrage recommendations |
| **Crop Advisory** | Season-specific growing tips, pest warnings, best-practice guidance |
| **Fertilizer Plan** | NPK calculation form → schedule with stage-by-stage dosing |
| **Disease Scan** | Drag-and-drop leaf image upload → CNN diagnosis + advice |
| **Govt Schemes** | Scheme browser filtered by state/category + PMFBY claim form |
| **Alert System** | Automated weather, market, and disease risk notifications |
| **Adaptive Calendar** | Crop-stage timeline aligned to farmer's selected crop |

**Voice Assistant:**
- Floating microphone widget (bottom-right)
- Supports 3 chat languages: English, Hindi, Gujarati
- Intent matching for: mandi, disease, fertilizer, schemes, weather, yield, calendar, alerts
- Text-to-speech via Web Speech API with Google TTS fallback
- Full keyboard-free operation

---

### AI/ML Backend (`AIML/`)

The backend is a **unified FastAPI application** that mounts three sub-applications and exposes additional top-level routes:

#### 1. Disease Detection (`/disease/*`)
- **Model:** MobileNetV2 fine-tuned CNN (`disease_model.keras`)
- **Input:** JPEG/PNG/WEBP leaf image (multipart upload)
- **Output:** Top-3 predictions with confidence %, crop name, condition name, and treatment advice
- **Endpoint:** `POST /disease/predict`
- **Health:** `GET /disease/health`

#### 2. Fertilizer Advisor (`/api/*`)
- **Logic:** Rule-based NPK engine with multi-factor adjustments
- **Factors:** Soil pH, soil type (black cotton, sandy, alluvial, red laterite), NDVI, irrigation ratio, rainfall, crop type
- **Supported Crops:** Wheat, Rice, Potato, Onion, Maize, Groundnut, Soybean
- **Data Source:** `AIML/ml/gujarat_districts.csv` (26 Gujarat districts with soil metadata)
- **Endpoint:** `GET /api/fertilizer/recommend`
- **Output:** NPK per hectare, total NPK, fertilizer product quantities (Urea/DAP/MOP), phased application schedule, soil advisory

#### 3. Mandi Intelligence (`/mandi/*`)
- **Model:** XGBoost regressors (one per Mandi × Crop combination)
- **Data:** Kaggle "Daily Wholesale Commodity Prices - India Mandis" CSV; synthetic fallback auto-generated
- **Arbitrage Engine:** Dual spatial (which mandi?) + temporal (sell now or wait?) optimization
- **Net Profit Formula:** `Revenue − Transport (₹5/km) − Storage (₹0.50/kg/day) − Perishability − Traffic`
- **Endpoints:**
  - `GET /mandis` — list available mandis
  - `POST /response` — get mandi recommendation for a crop + quantity + location
  - `POST /respond` — submit farmer feedback

#### 4. Government Schemes (`/schemes/*`)
- **Scheme Matcher:** Profile-based scoring (state priority → Central → category tags)
- **Claim Generator:** PMFBY crop insurance claim PDF generation using `fpdf`
- **Endpoints:**
  - `POST /schemes/api/v1/schemes/recommend` — get matched schemes
  - `POST /schemes/api/v1/claims/generate` — generate PMFBY claim PDF

#### 5. Yield Prediction (`/yield/*`)
- **Engine:** Java subprocess calling a pre-trained XGBoost `.bin` model
- **Endpoint:** `POST /yield/predict-batch`
- **Input:** State, district, season, year, area, list of crops
- **Output:** Predicted yield per crop

---

### Mobile App (`mobile/`)

A **React Native application** built with Expo SDK 50, sharing the same Supabase backend as the web client.

**Screens:**
- `LoginScreen` — Name + mobile login
- `RegistrationScreen` — Farmer onboarding
- `DashboardScreen` — 4 tabs: Overview, Mandi, Advisory, Alerts

**Key Libraries:**
- `expo-location` — GPS coordinates for location-based weather
- `@react-navigation/native-stack` — Screen transitions
- `@supabase/supabase-js` — Auth + data sync
- `expo-linear-gradient` — UI gradients

**Mobile App Config:**
- App name: `Cropwise`
- Bundle ID: `com.beejrakshak.mobile`
- Splash background: `#0B1F16` (deep forest green)

---

### SAR Processing (`sar_processing/`)

A **standalone Python pipeline** for satellite-based field monitoring:

**Pipeline Flow:**
1. Read field polygons from PostGIS `fields` table
2. Fetch Sentinel-1 GRD VV + VH mean backscatter from GEE for current and previous 7-day windows
3. Compute 7-day deltas
4. Classify moisture anomaly: `vv_delta > threshold` → high | `< -threshold` → low | else normal
5. Detect flood: `vv_mean < -18 AND vh_mean < -22`
6. Write results to `sar_features` table

**Setup:**
```bash
cd sar_processing
uv sync                     # or: pip install -e .
earthengine authenticate    # GEE login
python bootstrap_db.py      # create PostGIS schema
python seed_sample.py       # optional: seed test fields
python worker.py            # run the pipeline
```

---

## 📡 API Reference

Interactive API docs available at `http://localhost:8001/docs` when the backend is running.

| Method | Path | Description |
|---|---|---|
| GET | `/` | Health check + module listing |
| GET | `/health` | Simple `{"status": "ok"}` |
| GET | `/mandis` | List available mandis |
| POST | `/response` | Mandi price recommendation |
| POST | `/respond` | Submit mandi feedback |
| GET | `/mandi-health` | Mandi module health |
| POST | `/disease/predict` | Leaf disease detection (image upload) |
| GET | `/disease/health` | Disease module health + model status |
| GET | `/api/fertilizer/recommend` | NPK fertilizer recommendation |
| POST | `/schemes/api/v1/schemes/recommend` | Match government schemes |
| POST | `/schemes/api/v1/claims/generate` | Generate PMFBY claim PDF |
| POST | `/yield/predict-batch` | Batch crop yield prediction |

---

## 🚀 Deployment

### Web Client
The web client is configured for **Vercel** deployment:
```bash
cd client
npm run build
# Deploy the dist/ folder to Vercel
```

`client/vercel.json` configures:
- SPA rewrite: all routes → `index.html`
- Mandi API proxy: `/mandi/*` → `https://beejrakshak.onrender.com/mandi/*`

Production URL: `https://crop-wise-lime.vercel.app`

### AI/ML Backend
Deployed on **Render.com** as a Python web service:
- Start command: `uvicorn main:app --host 0.0.0.0 --port 8001`
- Production URL: `https://beejrakshak.onrender.com`

CORS is pre-configured to allow:
- `https://crop-wise-lime.vercel.app`
- `https://beej-rakshak.vercel.app`
- All `https://crop-wise-*.vercel.app` preview URLs
- `http://localhost:5173`, `5174`, `8081` (dev)

### Mobile App
Build with EAS (Expo Application Services):
```bash
cd mobile
npx eas build --platform android
npx eas build --platform ios
```

---

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/your-feature`
3. Install all dependencies: `npm run install:all`
4. Start the dev environment: `npm run dev` (in project root)
5. Make your changes
6. Submit a pull request

---

*Built with ❤️ for Indian farmers — empowering every hand that feeds the nation.*
