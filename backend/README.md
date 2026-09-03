# Personal Gemini Journal - Zero-Trust FastAPI Backend

Production-ready, enterprise-grade Python FastAPI backend for **MindReflect**, an AI-powered mindful journaling application featuring Firebase Authentication, dynamic Google Cloud Secret Manager integration, and isolated Cloud Firestore persistence.

---

## 🌟 Architectural Features

1. **Firebase ID Token Authentication (`firebase-admin`)**:
   - Zero-trust authentication dependency (`get_current_user`) verifying client JWTs via `Authorization: Bearer <token>`.
2. **Dynamic Secret Manager Retrieval**:
   - Runtime retrieval of `GEMINI_API_KEY` from Google Cloud Secret Manager with local environment fallback (`config.py`).
3. **Multi-Turn Reflective Journaling (`/api/chat`)**:
   - Context-aware dialogue with persona guardrails (`reflective`, `brainstorm`, `actionable`, `summary`).
4. **Structured Insights Synthesis (`/api/insights`)**:
   - Strict Pydantic schema generation with `response_mime_type="application/json"`.
5. **Session Synthesis & Firestore Persistence (`/api/save-session`)**:
   - Persists reflections directly into isolated user paths `/users/{uid}/journals/{journal_id}` with recursive undefined/null sanitization.
6. **Resilient 4-Tier Model Fallback Ladder**:
   - Automatically falls back across:
     `gemini-3.6-flash` &rarr; `gemini-3.1-flash-lite` &rarr; `gemini-flash-latest` &rarr; `gemini-3.7-flash`.

---

## 📁 Directory Structure

```
backend/
├── auth.py              # Firebase Admin token verification & Firestore client
├── config.py            # Secret Manager retrieval & model fallback ladder
├── Dockerfile           # Cloud Run container definition
├── gemini_service.py    # GenAI SDK client, fallback runner, & guardrails
├── main.py              # FastAPI app & endpoint handlers
├── README.md            # Architecture & deployment guide
├── requirements.txt     # Python dependencies
└── schemas.py           # Pydantic schemas & input bounds
```

---

## 🚀 Local Development Setup

### 1. Create and Activate Virtual Environment
```bash
cd backend
python3 -m venv venv
source venv/bin/activate
```

### 2. Install Dependencies
```bash
pip install -r requirements.txt
```

### 3. Configure Environment Variables
Create a `.env` file inside `backend/`:
```env
GEMINI_API_KEY=your_gemini_api_key_here
FIREBASE_PROJECT_ID=gen-lang-client-0382888626
FIRESTORE_DATABASE_ID=ai-studio-b0ab2b89-9e56-4128-94c6-fc84ca0e643e
```

### 4. Start the Development Server
```bash
uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```
Interactive OpenAPI documentation will be accessible at `http://localhost:8000/docs`.

---

## 🔒 Google Cloud Secret Manager & Permissions Setup

```bash
# 1. Create the secret in Google Cloud Secret Manager
gcloud secrets create GEMINI_API_KEY --replication-policy="automatic"
echo -n "YOUR_GEMINI_API_KEY" | gcloud secrets versions add GEMINI_API_KEY --data-file=-

# 2. Grant the Cloud Run service account access to read the secret
gcloud secrets add-iam-policy-binding GEMINI_API_KEY \
  --member="serviceAccount:YOUR_PROJECT_NUMBER-compute@developer.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor"
```

---

## 🚢 Deploy to Google Cloud Run

```bash
gcloud run deploy mindreflect-api \
  --source . \
  --region asia-southeast1 \
  --allow-unauthenticated \
  --set-env-vars FIREBASE_PROJECT_ID=gen-lang-client-0382888626,FIRESTORE_DATABASE_ID=ai-studio-b0ab2b89-9e56-4128-94c6-fc84ca0e643e \
  --update-labels=dev-tutorial=cloud-run-ai-challenge
```
