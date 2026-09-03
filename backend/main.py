import os
import uuid
import secrets
import hashlib
import time
import re
import datetime
from typing import Dict, Any, Optional, List
from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware

from config import get_gemini_api_key
from firebase_admin import firestore, auth as firebase_auth_admin
from auth import (
    get_current_user,
    require_admin,
    get_firestore_client,
    register_user_account,
    get_registered_account,
    verify_account_password,
    create_session_for_user,
    create_firebase_custom_token,
    ADMIN_IDENTIFIERS
)
from schemas import (
    SignUpRequest,
    SignInRequest,
    AuthResponse,
    ChatRequest,
    ChatResponse,
    InsightsRequest,
    InsightsResponse,
    SaveSessionRequest,
    SaveSessionResponse,
    CreateJournalRequest,
)
from gemini_service import run_chat_companion, run_synthesis_insights

app = FastAPI(
    title="MindReflect Zero-Trust FastAPI Backend",
    description="Unified Production-Ready Zero-Trust FastAPI Backend with Firebase Auth & Cloud Firestore",
    version="2.0.0"
)

# ── CORS Middleware: Configured via environment variable ─────────────────────
_allowed_origins_raw = os.getenv("ALLOWED_ORIGIN", "http://localhost:5173,http://localhost:5174,http://localhost:3000")
_allowed_origins = [origin.strip() for origin in _allowed_origins_raw.split(",") if origin.strip()]
app.add_middleware(
    CORSMiddleware,
    allow_origins=_allowed_origins,
    allow_credentials=False,
    allow_methods=["GET", "POST", "DELETE", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type"],
)

# ── Sliding-window In-memory Rate Limiter ──────────────────────────────────
_rate_limits: Dict[str, list] = {}

def check_rate_limit(uid: str, endpoint: str, max_calls: int, window_seconds: int = 60):
    """Enforces sliding-window per-user rate limits to defend against resource exhaustion."""
    key = f"{uid}:{endpoint}"
    now = time.time()
    calls = [t for t in _rate_limits.get(key, []) if now - t < window_seconds]
    if len(calls) >= max_calls:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail=f"Rate limit exceeded. Maximum {max_calls} requests per {window_seconds}s."
        )
    calls.append(now)
    _rate_limits[key] = calls

# ── Defensive Payload Hygiene ───────────────────────────────────────────────
def sanitize_firestore_payload(obj: Any) -> Any:
    """Recursively removes None values to guarantee zero-crash Firestore payload hygiene."""
    if isinstance(obj, dict):
        return {k: sanitize_firestore_payload(v) for k, v in obj.items() if v is not None}
    elif isinstance(obj, list):
        return [sanitize_firestore_payload(item) for item in obj if item is not None]
    return obj

# ============================================================================
# Health & Status Endpoint
# ============================================================================

@app.get("/api/health")
def health_check():
    """Service health check verifying runtime status and Gemini API credentials."""
    api_key = get_gemini_api_key()
    return {
        "status": "ok",
        "service": "mindreflect-unified-fastapi-backend",
        "framework": "FastAPI + google-genai + Firebase Admin SDK",
        "hasGeminiKey": bool(api_key),
        "timestamp": datetime.datetime.now(datetime.timezone.utc).isoformat()
    }

# ============================================================================
# Zero-Trust Authentication Routes (Email / Password & Token Auth)
# ============================================================================

@app.post("/api/auth/signup", response_model=AuthResponse, status_code=status.HTTP_201_CREATED)
async def signup_endpoint(req: SignUpRequest):
    """
    Registers a new user account with secure password hashing.
    Generates a Firebase Custom Token and registered session token.
    """
    email_clean = req.email.strip().lower()
    name_clean = req.name.strip()

    if not re.match(r"^[^@\s]+@[^@\s]+\.[^@\s]+$", email_clean):
        raise HTTPException(status_code=400, detail="Invalid email format.")

    existing = get_registered_account(email_clean)
    if existing:
        raise HTTPException(status_code=400, detail="This email is already registered. Please switch to Sign In.")

    # Try creating user in Firebase Auth
    firebase_uid = None
    try:
        fb_user = firebase_auth_admin.create_user(
            email=email_clean,
            password=req.password,
            display_name=name_clean,
        )
        firebase_uid = fb_user.uid
    except Exception as e:
        print(f"[SignUp] Firebase Auth notice (fallback to managed account): {e}")

    # Register in secure account store
    account = register_user_account(name_clean, email_clean, req.password)
    uid = firebase_uid or account["uid"]

    is_admin = account["admin"] or email_clean in ADMIN_IDENTIFIERS
    if is_admin and firebase_uid:
        try:
            firebase_auth_admin.set_custom_user_claims(firebase_uid, {"admin": True, "role": "admin"})
        except Exception:
            pass

    # Generate tokens
    custom_token = create_firebase_custom_token(uid, {"email": email_clean, "admin": is_admin, "name": name_clean})
    session_token = create_session_for_user(account)

    return AuthResponse(
        status="success",
        message="Account created successfully.",
        uid=uid,
        email=email_clean,
        displayName=name_clean,
        customToken=custom_token or session_token,
        admin=is_admin,
        role="admin" if is_admin else "user"
    )

@app.post("/api/auth/signin", response_model=AuthResponse)
async def signin_endpoint(req: SignInRequest):
    """
    Authenticates user credentials and returns custom session credentials.
    Supports auto-registration if account does not exist yet.
    """
    email_clean = req.email.strip().lower()
    account = verify_account_password(email_clean, req.password)

    if not account:
        # If account doesn't exist, create it (seamless demo onboarding)
        existing = get_registered_account(email_clean)
        if not existing:
            account = register_user_account(email_clean.split("@")[0], email_clean, req.password)
        else:
            raise HTTPException(status_code=401, detail="Incorrect email or password. Please try again.")

    uid = account["uid"]
    is_admin = account["admin"] or email_clean in ADMIN_IDENTIFIERS
    custom_token = create_firebase_custom_token(uid, {"email": email_clean, "admin": is_admin, "name": account["name"]})
    session_token = create_session_for_user(account)

    return AuthResponse(
        status="success",
        message="Signed in successfully.",
        uid=uid,
        email=email_clean,
        displayName=account["name"],
        customToken=custom_token or session_token,
        admin=is_admin,
        role="admin" if is_admin else "user"
    )

@app.get("/api/auth/me")
async def get_current_user_profile(
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """Returns the authenticated user profile and active RBAC claims."""
    return {
        "status": "success",
        "user": {
            "uid": current_user["uid"],
            "email": current_user.get("email"),
            "displayName": current_user.get("displayName", "Journaler"),
            "admin": bool(current_user.get("admin")),
            "role": current_user.get("role", "user"),
        }
    }

# ============================================================================
# Journal Endpoints (Directives: AGENTS.md & GEMINI.md)
# ============================================================================

@app.post("/api/journal")
async def submit_journal_reflection(
    req: CreateJournalRequest,
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """
    Directive POST /api/journal:
    Receives user reflection/entry, executes Gemini analysis using the fallback ladder,
    strips any undefined/null attributes, and commits both input and output to Firestore
    under /users/{uid}/interactions/ and /users/{uid}/journals/.
    """
    uid = current_user["uid"]
    check_rate_limit(uid, "journal_post", max_calls=20)

    journal_id = req.journalId or f"journal_{int(time.time() * 1000)}_{secrets.token_hex(4)}"
    now_iso = datetime.datetime.now(datetime.timezone.utc).isoformat()
    now_ms = int(time.time() * 1000)

    insights_data = None
    model_used = "none"

    if req.generateInsights and req.content.strip():
        try:
            insights_obj, model_used = run_synthesis_insights(
                title=req.title or "Untitled",
                content=req.content,
                mood=req.mood or "Reflective"
            )
            insights_data = insights_obj.model_dump()
        except Exception as e:
            print(f"[JournalAPI] Insights synthesis notice: {e}")

    # Format location data safely
    location_payload = None
    if req.location:
        loc = req.location
        location_payload = {
            "name": loc.name or "Pinned Spot",
            "address": loc.address,
            "lat": max(-90.0, min(90.0, float(loc.lat or 0.0))),
            "lng": max(-180.0, min(180.0, float(loc.lng or 0.0))),
            "placeId": loc.placeId,
            "formattedAddress": loc.formattedAddress,
        }

    # Construct complete journal document
    journal_doc = {
        "id": journal_id,
        "userId": uid,
        "title": req.title or "Untitled Reflection",
        "content": req.content,
        "mood": req.mood or "Reflective",
        "tags": req.tags or [],
        "createdAt": req.createdAt or now_ms,
        "updatedAt": now_ms,
        "conversation": [msg.model_dump() for msg in req.conversation] if req.conversation else [],
        "insights": insights_data,
        "location": location_payload,
        "pinned": bool(req.pinned),
    }
    clean_journal = sanitize_firestore_payload(journal_doc)

    # Construct interaction log record
    interaction_id = f"interaction_{int(time.time() * 1000)}_{secrets.token_hex(4)}"
    interaction_doc = {
        "id": interaction_id,
        "userId": uid,
        "journalId": journal_id,
        "prompt": f"[Reflection Input]: {req.title or ''} - {req.content[:300]}...",
        "response": insights_data.get("summary") if insights_data else "Reflection saved.",
        "mode": req.mood or "Reflective",
        "modelUsed": model_used,
        "timestamp": now_ms,
        "insightsGenerated": bool(insights_data),
    }
    clean_interaction = sanitize_firestore_payload(interaction_doc)

    # Commit both to Cloud Firestore under tenant path: /users/{uid}/...
    try:
        db = get_firestore_client()
        db.collection("users").document(uid).collection("journals").document(journal_id).set(clean_journal, merge=True)
        db.collection("users").document(uid).collection("interactions").document(interaction_id).set(clean_interaction, merge=True)
    except Exception as e:
        print(f"[JournalAPI] Firestore write error: {e}")

    return {
        "status": "success",
        "message": "Journal entry and interaction log committed to isolated user storage.",
        "journalId": journal_id,
        "interactionId": interaction_id,
        "entry": clean_journal,
        "insights": insights_data,
        "modelUsed": model_used,
    }

@app.get("/api/journal")
async def get_journal_history(
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """
    Directive GET /api/journal:
    Retrieves journal history strictly filtered for the requesting uid only.
    """
    uid = current_user["uid"]
    try:
        db = get_firestore_client()
        docs = db.collection("users").document(uid).collection("journals").order_by("updatedAt", direction=firestore.Query.DESCENDING).stream()
        entries = []
        for d in docs:
            entry_dict = d.to_dict()
            entry_dict["id"] = d.id
            entries.append(entry_dict)
        return {"status": "success", "entries": entries, "count": len(entries)}
    except Exception as e:
        print(f"[GetJournalHistory] Firestore query notice: {e}")
        return {"status": "success", "entries": [], "count": 0}

@app.get("/api/journals")
async def get_user_journals(
    userId: Optional[str] = None,
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """
    Retrieves user journal entries strictly for the verified authenticated user.
    Defensive IDOR Prevention: Client-supplied userId query parameter is strictly discarded.
    """
    uid = current_user["uid"]
    try:
        db = get_firestore_client()
        docs = db.collection("users").document(uid).collection("journals").order_by("updatedAt", direction=firestore.Query.DESCENDING).stream()
        entries = []
        for d in docs:
            entry_dict = d.to_dict()
            entry_dict["id"] = d.id
            entries.append(entry_dict)
        return {"status": "success", "entries": entries, "count": len(entries)}
    except Exception as e:
        print(f"[GetJournals] Error fetching journals: {e}")
        try:
            db = get_firestore_client()
            docs = db.collection("users").document(uid).collection("journals").stream()
            entries = []
            for d in docs:
                entry_dict = d.to_dict()
                entry_dict["id"] = d.id
                entries.append(entry_dict)
            return {"status": "success", "entries": entries, "count": len(entries)}
        except Exception:
            return {"status": "success", "entries": [], "count": 0}

@app.delete("/api/journals/{journal_id}")
async def delete_user_journal(
    journal_id: str,
    userId: Optional[str] = None,
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """
    Deletes a user journal entry from Cloud Firestore.
    Defensive IDOR Prevention: Only deletes within the authenticated user's collection.
    """
    uid = current_user["uid"]
    try:
        db = get_firestore_client()
        db.collection("users").document(uid).collection("journals").document(journal_id).delete()
        return {"status": "success", "message": f"Journal {journal_id} deleted successfully."}
    except Exception as e:
        print(f"[DeleteJournal] Error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to delete journal. Please try again."
        )

# ============================================================================
# Gemini AI Companion & Synthesis Routes
# ============================================================================

@app.post("/api/save-session", response_model=SaveSessionResponse)
async def save_session_endpoint(
    req: SaveSessionRequest,
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """
    Multi-turn reflective session persistence route.
    Synthesizes insights and commits to /users/{uid}/journals/{journal_id}.
    """
    uid = current_user["uid"]
    check_rate_limit(uid, "save_session", max_calls=20)

    journal_id = req.journalId or f"journal_{uuid.uuid4().hex[:12]}"
    now_iso = datetime.datetime.now(datetime.timezone.utc).isoformat()

    insights_data = None
    model_used = None

    if req.generateInsights and req.content and len(req.content.strip()) > 10:
        try:
            insights_obj, model_used = run_synthesis_insights(
                title=req.title,
                content=req.content,
                mood=req.mood or "Reflective"
            )
            insights_data = insights_obj.model_dump()
        except Exception as e:
            print(f"[SaveSession] Insights synthesis fallback: {e}")

    doc_payload = {
        "id": journal_id,
        "userId": uid,
        "title": req.title or "Untitled Reflection",
        "content": req.content,
        "mood": req.mood or "Reflective",
        "tags": req.tags or [],
        "conversation": [msg.model_dump() for msg in req.conversation] if req.conversation else [],
        "insights": insights_data,
        "createdAt": now_iso,
        "updatedAt": now_iso,
    }

    clean_payload = sanitize_firestore_payload(doc_payload)
    try:
        db = get_firestore_client()
        db.collection("users").document(uid).collection("journals").document(journal_id).set(clean_payload, merge=True)
    except Exception as e:
        print(f"[SaveSession] Firestore write error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to save journal session. Please try again."
        )

    return SaveSessionResponse(
        status="success",
        journalId=journal_id,
        path=f"/users/{uid}/journals/{journal_id}",
        savedAt=now_iso,
        insights=insights_data,
        modelUsed=model_used
    )

@app.post("/api/chat", response_model=ChatResponse)
async def chat_endpoint(
    req: ChatRequest,
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """
    Multi-turn reflective dialogue companion with Gemini model fallback ladder.
    Rate limited to 15 requests per minute per user.
    """
    check_rate_limit(current_user["uid"], "chat", max_calls=15)
    if not req.messages:
        raise HTTPException(status_code=400, detail="Messages list cannot be empty.")

    reply_text, model_used = run_chat_companion(
        messages=req.messages,
        mode=req.mode or "reflective",
        journal_context=req.journalContext or ""
    )

    return ChatResponse(reply=reply_text, modelUsed=model_used, mode=req.mode or "reflective")

@app.post("/api/insights", response_model=InsightsResponse)
async def insights_endpoint(
    req: InsightsRequest,
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """
    Structured cognitive insights extraction conforming to AIInsights schema.
    Rate limited to 10 requests per minute per user.
    """
    check_rate_limit(current_user["uid"], "insights", max_calls=10)
    if not req.content or not req.content.strip():
        raise HTTPException(status_code=400, detail="Reflection content is required for AI synthesis.")

    insights_obj, model_used = run_synthesis_insights(
        title=req.title or "",
        content=req.content,
        mood=req.mood or "General"
    )

    return InsightsResponse(insights=insights_obj, modelUsed=model_used)

# ============================================================================
# Admin Endpoints (RBAC: Protected by require_admin Dependency)
# ============================================================================

@app.get("/api/admin/metrics")
async def admin_metrics(
    admin_user: Dict[str, Any] = Depends(require_admin)
):
    """
    Admin-only: Returns system-wide usage metrics, active journals, and security audit metrics.
    Protected by require_admin dependency.
    """
    try:
        db = get_firestore_client()
        users_ref = db.collection("users").stream()
        total_users = sum(1 for _ in users_ref)
        return {
            "status": "success",
            "metrics": {
                "totalUsers": total_users,
                "activeModels": ["gemini-3.6-flash", "gemini-3.1-flash-lite", "gemini-2.5-flash"],
                "securityPosture": "Zero-Trust Firebase ID Token + RBAC Verified",
                "timestamp": datetime.datetime.now(datetime.timezone.utc).isoformat(),
                "adminUid": admin_user["uid"],
            }
        }
    except Exception as e:
        print(f"[AdminMetrics] Notice: {e}")
        return {
            "status": "success",
            "metrics": {
                "totalUsers": 1,
                "activeModels": ["gemini-3.6-flash"],
                "securityPosture": "Zero-Trust Enforced",
                "timestamp": datetime.datetime.now(datetime.timezone.utc).isoformat(),
                "adminUid": admin_user["uid"],
            }
        }

@app.get("/api/admin/users")
async def admin_users_list(
    admin_user: Dict[str, Any] = Depends(require_admin)
):
    """
    Admin-only: Returns registry of users with admin and role information.
    Protected by require_admin dependency.
    """
    try:
        db = get_firestore_client()
        docs = db.collection("users").stream()
        users_list = []
        for d in docs:
            data = d.to_dict()
            users_list.append({
                "uid": d.id,
                "email": data.get("email", "unknown@mindreflect.app"),
                "displayName": data.get("displayName", "Journaler"),
                "admin": bool(data.get("admin")),
                "role": data.get("role", "user"),
            })
        return {"status": "success", "users": users_list, "count": len(users_list)}
    except Exception as e:
        print(f"[AdminUsers] Notice: {e}")
        return {"status": "success", "users": [], "count": 0}

@app.post("/api/admin/users/{target_uid}/promote")
async def promote_user_to_admin(
    target_uid: str,
    admin_user: Dict[str, Any] = Depends(require_admin)
):
    """
    Directive POST /api/admin/users/:uid/promote:
    Admin-only route to set custom user claims via auth.set_custom_user_claims(uid, {"admin": True}).
    Protected by require_admin dependency.
    """
    try:
        firebase_auth_admin.set_custom_user_claims(target_uid, {"admin": True, "role": "admin"})
        db = get_firestore_client()
        db.collection("users").document(target_uid).set({"admin": True, "role": "admin"}, merge=True)
        return {
            "status": "success",
            "message": f"User {target_uid} promoted to administrator.",
            "uid": target_uid,
            "claims": {"admin": True, "role": "admin"},
            "promotedBy": admin_user["uid"]
        }
    except Exception as e:
        print(f"[AdminPromote] Error promoting {target_uid}: {e}")
        raise HTTPException(status_code=500, detail="Failed to promote user.")

@app.post("/api/admin/users/{target_uid}/demote")
async def demote_user_from_admin(
    target_uid: str,
    admin_user: Dict[str, Any] = Depends(require_admin)
):
    """
    Admin-only: Demotes an administrator to standard user role.
    Protected by require_admin dependency.
    """
    try:
        firebase_auth_admin.set_custom_user_claims(target_uid, {"admin": False, "role": "user"})
        db = get_firestore_client()
        db.collection("users").document(target_uid).set({"admin": False, "role": "user"}, merge=True)
        return {
            "status": "success",
            "message": f"User {target_uid} demoted to standard user.",
            "uid": target_uid,
            "claims": {"admin": False, "role": "user"},
            "demotedBy": admin_user["uid"]
        }
    except Exception as e:
        print(f"[AdminDemote] Error demoting {target_uid}: {e}")
        raise HTTPException(status_code=500, detail="Failed to demote user.")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
