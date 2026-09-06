Here's a detailed breakdown of the architecture and design patterns used in **MindReflect AI Journal**:

---

# 🏗️ Architecture & Design Overview

## System Architecture Pattern: **Unified Full-Stack Monolith with Vite Middleware**

This is NOT a traditional separated frontend/backend. It uses a **single Express server** that serves both the API and the React frontend via Vite middleware integration:

```
┌─────────────────────────────────────────────────────────────────────┐
│                     server.ts  (Node.js / Express)                  │
│                                                                     │
│  ┌──────────────────────┐    ┌───────────────────────────────────┐  │
│  │   REST API Layer     │    │   Vite Dev Middleware (dev mode)  │  │
│  │  /api/journal        │    │   OR                              │  │
│  │  /api/chat           │    │   Static File Serving (prod mode) │  │
│  │  /api/admin/*        │    │   (serves frontend/dist/)         │  │
│  │  /api/notifications/ │    │                                   │  │
│  └──────────┬───────────┘    └───────────────────────────────────┘  │
│             │                                                        │
└─────────────┼────────────────────────────────────────────────────── ┘
              │
    ┌─────────┼────────────┐
    ▼         ▼            ▼
Firebase    Gemini      Firestore
Admin SDK   GenAI SDK   Admin SDK
(Auth)      (AI)        (DB writes)
```

---

## Layer-by-Layer Design

### Layer 1 — Frontend: **React 19 + TypeScript + Vite**
```
frontend/src/
├── App.tsx               ← Root: routing, modal orchestration, global state
├── components/           ← 13 feature components (each owns its UI + local state)
├── services/             ← API abstraction layer (pure fetch/Firestore calls)
├── hooks/                ← Reusable stateful logic (useSpeech)
├── context/              ← ThemeContext (dark/light mode)
├── lib/
│   ├── firebase.ts       ← Firebase client singleton (Auth + Firestore)
│   └── utils.ts          ← sanitizePayload() — strips undefined before Firestore writes
└── types.ts              ← Shared TypeScript contracts for all data shapes
```

**Design patterns used:**
- **Service Layer Pattern** — components never call Firebase/API directly; all data access goes through `services/`
- **Optimistic UI + Cache-then-Network** — `getCachedJournals()` loads from `localStorage` immediately while Firestore real-time sync catches up
- **Context + useState** — Lightweight global state (no Redux/Zustand), theme via `React.createContext`

---

### Layer 2 — Backend: **Express + TypeScript (`server.ts`)**

```
server.ts (2669+ lines, single unified file)
│
├── CORS + JSON body parsing (mounted FIRST — ordering guarantee)
├── Firebase Admin SDK init (credential chain: env JSON → ADC → project-ID-only)
├── Rate Limiter (sliding-window in-memory Map)
├── Prompt Injection Filter (INJECTION_PATTERNS array)
├── Gemini Fallback Ladder (7-tier model chain)
├── RBAC Middleware
│   ├── getCurrentUser  → Firebase ID token verifyIdToken() → session store
│   └── requireAdmin    → checks decoded.admin === true
└── API Routes
    ├── /api/auth/*           — signup, signin (Firebase + fallback session)
    ├── /api/journal*         — CRUD + Gemini insight generation
    ├── /api/chat             — Multi-turn Gemini conversation
    ├── /api/habits*          — Habit CRUD + AI habit detection
    ├── /api/insights         — Structured Gemini psychological analysis
    ├── /api/admin/*          — RBAC-gated metrics, audit log, user promotion
    └── /api/notifications/*  — Weekly email digest, settings, SSRF-safe webhooks
```

**Design patterns used:**
- **Middleware Chain Pattern** — Express `app.use()` layers enforce security before routes
- **Dependency Injection via Middleware** — `getCurrentUser` / `requireAdmin` inject `req.user` into all protected handlers
- **Resilience Pattern (Circuit-breaker like)** — `modelCooldowns` Map disables quota-exhausted models for 30s
- **Repository Pattern (dual-write)** — All mutations write to both Firestore (via Admin SDK) and local `data/*.json` fallback files

---

### Layer 3 — Data: **Dual-Persistence Architecture**

```
┌───────────────────────────────────────────────────────┐
│                  Data Persistence                      │
│                                                        │
│  PRIMARY (Cloud)           FALLBACK (Local Disk)       │
│  ┌─────────────────┐       ┌────────────────────────┐  │
│  │ Cloud Firestore  │       │ data/*.json files       │  │
│  │                 │       │ (sessions.json,          │  │
│  │ /users/{uid}/   │  OR   │  user_accounts.json,     │  │
│  │   journals/     │       │  habits.json,            │  │
│  │   interactions/ │       │  journals.json,          │  │
│  │   habits/       │       │  admin_registry.json)    │  │
│  │   settings/     │       │                          │  │
│  └─────────────────┘       └────────────────────────┘  │
└───────────────────────────────────────────────────────┘
```

- Firestore writes use `safeFirestoreWrite()` — a resilience wrapper that silently degrades to local persistence if `PERMISSION_DENIED` (handles unconfigured deployments)
- Client uses `onSnapshot()` for **real-time subscriptions** (Firestore Listener pattern) with localStorage cache as L1

---

### Layer 4 — AI: **Gemini 7-Tier Resilience Ladder**

```typescript
const MODEL_FALLBACK_LADDER = [
  'gemini-3.6-flash',      // Primary (fastest)
  'gemini-3.1-flash-lite', // High-availability
  'gemini-2.5-flash',      // Fallback
  'gemini-flash-latest',   // Dynamic alias
  'gemini-2.0-flash',      // Legacy stable
  'gemini-2.5-flash-lite', // Lite fallback
  'gemini-3.7-flash',      // Deep reasoning (last resort)
];
```

Each model tier is tried sequentially. 429 quota errors trigger a **30-second cooldown** before that model is retried. If all tiers fail, a mindful hardcoded reflection is returned (zero-crash guarantee).

---

### Layer 5 — Security Architecture

```
┌─────────────┐    ┌───────────────────────┐    ┌──────────────────────┐
│   Browser   │    │   Express Middleware  │    │   Firebase / GCP     │
│             │    │   Chain              │    │                      │
│ Firebase    │───>│ 1. CORS Origin Check │    │ • Firestore Rules:   │
│ Client Auth │    │ 2. JWT verifyIdToken │───>│   uid == userId      │
│ (ID tokens) │    │ 3. Rate Limiting     │    │ • /app_user_accounts │
│             │    │ 4. Prompt Injection  │    │   allow: false       │
│             │    │ 5. requireAdmin gate │    │ • /admin/** claims   │
└─────────────┘    └───────────────────────┘    └──────────────────────┘
```

**Security Design:**
- **Defense-in-Depth**: 5 independent security layers (CORS → Auth → Rate Limit → Injection → RBAC)
- **Zero-Trust Token Model**: Every API call must carry a Bearer token verified against Firebase Admin SDK
- **Tenant Isolation**: Firestore rules enforce `request.auth.uid == userId` — no cross-user data access is possible at the database layer even if the backend is compromised
- **SSRF Protection**: `validateWebhookUrl()` blocks all RFC 1918 private IP ranges before any outbound HTTP call

---

## Full Architecture Diagram

```
┌──────────────────── Browser (React 19) ─────────────────────┐
│  AuthLanding → App.tsx → [JournalEditor | AICompanion |      │
│   AdminDashboard | MoodTrendGraph | SecurityModal |           │
│   WeeklyDigestModal | HabitTracker | JournalMapView]         │
│                                                               │
│  Firebase Client Auth SDK ──→ Firestore onSnapshot (RT sync) │
└──────────────────────────────┬───────────────────────────────┘
                               │ fetch(/api/*) + Firebase ID Token
                               ▼
┌────────────────── server.ts (Express 4) ────────────────────┐
│  CORS → JSON parse → Auth middleware → Rate limit → Routes   │
│                            │                                 │
│     ┌──────────────────────┼──────────────────────┐         │
│     ▼                      ▼                      ▼         │
│ @google/genai         firebase-admin         Local JSON DB  │
│ (Gemini API)          (Auth + Firestore)     (data/*.json)  │
│  7-tier fallback       verifyIdToken()        fallback only │
└──────────────────────────────────────────────────────────────┘
                               │
              ┌────────────────┼──────────────────────┐
              ▼                ▼                       ▼
    Cloud Firestore    Google Secret Manager    SendGrid/Resend
    (primary DB)       (GEMINI_API_KEY)         (email digest)
```

---

## Key Design Decisions Summary

| Decision | Pattern Used | Rationale |
|:---|:---|:---|
| Single `server.ts` entry | **Unified Full-Stack Monolith** | Simplifies Cloud Run deployment — one container, one port |
| Vite middleware integration | **Proxy-less Dev Server** | No CORS between frontend and API during development |
| `safeFirestoreWrite()` wrapper | **Resilient Repository Pattern** | Degrades gracefully when Firebase credentials are absent |
| Dual localStorage + Firestore | **Cache-then-Network / Offline-First** | Instant page load, real-time sync on reconnect |
| `req.user` injection via middleware | **Dependency Injection** | Clean separation between auth logic and business logic |
| `data/` JSON files | **Local Fallback Persistence** | Enables full local development without Firebase provisioning |