# MindReflect AI Journal

A production-grade, mindful AI journaling platform with Firebase Authentication, isolated Cloud Firestore persistence, Role-Based Access Control (RBAC), Location-Aware Google Maps Platform integration, and multi-turn Google Gemini AI thought partnering.

---

## 📁 Repository Structure

```
.
├── server.ts                      # Full-stack Node.js / Express middle-tier with Vite middleware
├── firestore.rules                # Cloud Firestore owner-bound & admin security rules
├── metadata.json                  # AI Studio application metadata
├── package.json                   # Orchestrator & backend runtime dependencies
├── tsconfig.json                  # Root TypeScript configuration
├── vite.config.ts                 # Root Vite configuration targeting frontend/
├── .env.example                   # Environment variable declarations
│
├── frontend/                      # Standalone React 19 + Vite + TypeScript Frontend
│   ├── src/                       # React source components & hooks
│   │   ├── components/            # Editor, Chat, Insights, History, MapView, AdminDashboard, Navbar
│   │   ├── lib/                   # Firebase initialization & payload sanitizers
│   │   ├── services/              # Client Firestore subscriptions, mutations, & RBAC APIs
│   │   └── types.ts               # Global TypeScript contracts & schemas
│   ├── public/                    # Static assets & icons
│   ├── index.html                 # HTML entry point with metadata sync
│   └── package.json               # Frontend dependencies
│
└── backend/                       # Python FastAPI Backend Reference (Cloud Run Compatible)
    ├── auth.py                    # Firebase Admin SDK & token validation
    ├── config.py                  # Dynamic Secret Manager & model fallback ladder
    ├── gemini_service.py          # Google GenAI client & structured prompt logic
    ├── main.py                    # FastAPI application with CORS & endpoints
    └── Dockerfile                 # Cloud Run container configuration
```

---

## 🛡️ Agentic Threat Modeling & Security Architecture

| Threat Zone | Identified Risks | Implemented Countermeasures |
| :--- | :--- | :--- |
| **1. Input Surfaces** | Malicious injection in journal text, prompt hijacking, oversized payloads. | Schema validation, parameterization, context bounding, and zero-crash undefined-stripping before persistence. |
| **2. Planning & Reasoning** | Prompt injection, system instructions bypass, tool routing hijacking. | Context-delimited system instructions with defensive role partitioning. User reflections are treated as plain text, never as executable instructions. |
| **3. Tool & API Execution** | API key exposure, SSRF, unauthorized model invocation. | Server-side API routes (`/api/chat`, `/api/insights`, `/api/journal`) with runtime Secret Manager integration (`process.env.GEMINI_API_KEY`). API keys are never exposed in browser bundles. |
| **4. Memory & State** | Cross-tenant data leaks, broken access control (BAM), privilege escalation. | Cloud Firestore security rules strictly isolate `/users/{userId}/journals/{journalId}` and `/users/{userId}/interactions/{id}` to `request.auth.uid == userId`. Admin endpoints (`/api/admin/*`) enforce verified `admin: true` custom claims. |
| **5. Inter-System Comm.** | Transient AI model downtime, 429/503 status codes, geolocation data leaks. | Automated **Gemini Fallback Ladder** (`gemini-3.6-flash` &rarr; `gemini-3.1-flash-lite` &rarr; `gemini-flash-latest` &rarr; `gemini-3.7-flash`). Google Maps location metadata is sanitized and owner-restricted. |

---

## 🔒 Secret Management Setup

```bash
# 1. Create and populate the secret in Google Cloud Secret Manager
gcloud secrets create GEMINI_API_KEY --replication-policy="automatic"
echo -n "YOUR_GEMINI_API_KEY" | gcloud secrets versions add GEMINI_API_KEY --data-file=-

# 2. Grant the Cloud Run compute service account access to read the secret
gcloud secrets add-iam-policy-binding GEMINI_API_KEY \
  --member="serviceAccount:YOUR_PROJECT_NUMBER-compute@developer.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor"
```

---

## 🗄️ Cloud Firestore Security Rules

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    // 1. Strict User Tenant Isolation (Zero Insecure Defaults)
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;

      // Isolated user journals subcollection
      match /journals/{journalId} {
        allow read, write: if request.auth != null && request.auth.uid == userId;
      }

      // Isolated user interactions subcollection
      match /interactions/{interactionId} {
        allow read, write: if request.auth != null && request.auth.uid == userId;
      }
    }

    // 2. Administrator Collection (RBAC Custom Claims Enforced)
    match /admin/{document=**} {
      allow read, write: if request.auth != null && (
        request.auth.token.admin == true ||
        request.auth.token.role == 'admin' ||
        get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'admin'
      );
    }
  }
}
```

---

## 🚀 Google Cloud Run Production Deployment

```bash
# Deploy to Google Cloud Run
gcloud run deploy mindreflect-app \
  --source . \
  --platform managed \
  --region asia-southeast1 \
  --allow-unauthenticated \
  --set-secrets GEMINI_API_KEY=GEMINI_API_KEY:latest \
  --set-env-vars FIREBASE_PROJECT_ID=gen-lang-client-0382888626,FIRESTORE_DATABASE_ID=ai-studio-b0ab2b89-9e56-4128-94c6-fc84ca0e643e \
  --update-labels=dev-tutorial=cloud-run-ai-challenge
```

---

## 🧪 Comprehensive Functional Verification Walkthrough

| Test Case | User Interaction / Trigger | Expected Result |
| :--- | :--- | :--- |
| **TC-01: Federated Google Auth** | Click "Continue with Google" button. | Firebase popup opens; upon success, authenticates user, sets owner session, and routes to Studio dashboard. |
| **TC-02: Passwordless OTP Flow** | Enter email & click "Send Code". Enter received 6-digit code. | Dispatches OTP via `/api/auth/send-otp`, verifies code via `/api/auth/verify-otp`, exchanges token, and grants secure session. |
| **TC-03: Real-Time Journaling** | Enter Title, Content, select Mood & Tags in Studio. | Text streams to state; auto-save triggers within 2.5s with "Saved to Firestore" indicator. |
| **TC-04: Location Pinning (Google Maps)** | Search or click "Detect My Location" or type a place name in the Location Pin bar. | Pin displays formatted address and coordinates, updates marker on the Places Map, and sanitizes payload for Firestore. |
| **TC-05: Multi-Turn Thought Partner** | Select reflection mode (e.g. "Reflective Inquiry"), send a reflection message. | Backend calls Gemini fallback ladder; streams empathetic response and logs interaction to `/users/{uid}/interactions`. |
| **TC-06: Synthesis & AI Insights** | Click "Generate AI Insights" button. | Gemini generates structured themes, emotional tone, actionable takeaways, and follow-up questions. |
| **TC-07: History & Cross-Session Sync** | Switch to "History" tab, search, pin/unpin, or delete entry. | Displays isolated entries via real-time Firestore subscription; delete operations remove document immediately. |
| **TC-08: Places Map Visualization** | Switch to "Places Map" tab. | Displays interactive Google Map with Advanced Markers for all geo-tagged journal entries. Clicking a marker previews entry details. |
| **TC-09: RBAC Access Control** | Authenticated as standard user, attempt access to `/api/admin/metrics`. | Intercepted by `require_admin` middleware; returns HTTP `403 Forbidden: Access Denied`. |
| **TC-10: Admin Command Center** | Authenticated as Administrator (`admin: true`), open "Admin Center" tab. | Renders live system uptime, active sessions, Gemini model ladder distribution, user registry, and live audit trail. |
| **TC-11: Admin User Promotion** | In Admin Center, enter a User UID and click "Promote to Administrator". | Sets custom claim `{"admin": true}`, updates audit log, and reflects Administrator role badge across the application. |
