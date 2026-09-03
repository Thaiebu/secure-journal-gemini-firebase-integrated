import os
import json
import hashlib
import hmac
import time
import secrets
from pathlib import Path
from typing import Optional, Dict, Any
from fastapi import HTTPException, Security, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
import firebase_admin
from firebase_admin import auth as firebase_auth
from firebase_admin import credentials, firestore

security_scheme = HTTPBearer(auto_error=False)

_firebase_initialized = False

# List of admin emails / UIDs (mirroring server.ts)
ADMIN_IDENTIFIERS = {"thaiebu785@gmail.com", "admin"}

def init_firebase_admin():
    """Lazy initialisation of the Firebase Admin SDK."""
    global _firebase_initialized
    if _firebase_initialized or len(firebase_admin._apps) > 0:
        _firebase_initialized = True
        return

    # Attempt to load project settings from firebase-applet-config.json
    project_id = os.getenv("FIREBASE_PROJECT_ID", "gen-lang-client-0382888626")
    config_file = Path(__file__).parent.parent / "firebase-applet-config.json"
    if config_file.exists():
        try:
            with open(config_file, "r") as f:
                cfg = json.load(f)
                project_id = cfg.get("projectId", project_id)
        except Exception as e:
            print(f"[Firebase Admin] Config read notice: {e}")

    cred_path = os.getenv("GOOGLE_APPLICATION_CREDENTIALS")

    try:
        if cred_path and os.path.exists(cred_path):
            cred = credentials.Certificate(cred_path)
            firebase_admin.initialize_app(cred, {"projectId": project_id})
        else:
            # Uses Google Application Default Credentials (ADC) in GCP / Cloud Run
            firebase_admin.initialize_app(options={"projectId": project_id})
        _firebase_initialized = True
        print(f"[Firebase Admin] Initialized for project '{project_id}'")
    except Exception as e:
        print(f"[Firebase Admin] Initialization note: {e}")

def get_firestore_client():
    """Returns an authenticated Firestore client bounded to the app's database ID."""
    init_firebase_admin()
    db_id = os.getenv("FIRESTORE_DATABASE_ID", "ai-studio-b0ab2b89-9e56-4128-94c6-fc84ca0e643e")
    try:
        return firestore.client(database=db_id)
    except Exception:
        return firestore.client()

# ==========================================
# Account Management & Session Storage
# ==========================================

# Format: { email: { "uid": str, "email": str, "name": str, "password_hash": str, "salt": str, "admin": bool, "role": str, "created_at": float } }
_registered_accounts: Dict[str, Dict[str, Any]] = {}

# Format: { token_string: { "uid": str, "email": str, "name": str, "admin": bool, "role": str, "expires_at": float } }
_verified_sessions: Dict[str, Dict[str, Any]] = {}

def hash_password(password: str, salt: str) -> str:
    """Derives a secure password hash using PBKDF2 with SHA-256."""
    return hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt.encode("utf-8"), 100000).hex()

def register_user_account(name: str, email: str, password: str) -> Dict[str, Any]:
    """
    Registers an account with secure password hashing.
    Generates deterministic UID and session token.
    """
    clean_email = email.strip().lower()
    clean_name = name.strip()
    
    salt = secrets.token_hex(16)
    pwd_hash = hash_password(password, salt)
    uid = f"usr_{hashlib.sha256(clean_email.encode()).hexdigest()[:20]}"
    
    is_admin = clean_email in ADMIN_IDENTIFIERS or "admin" in clean_email
    
    account = {
        "uid": uid,
        "email": clean_email,
        "name": clean_name,
        "password_hash": pwd_hash,
        "salt": salt,
        "admin": is_admin,
        "role": "admin" if is_admin else "user",
        "created_at": time.time(),
    }
    _registered_accounts[clean_email] = account
    
    # Also sync to Firestore users collection
    try:
        db = get_firestore_client()
        db.collection("users").document(uid).set({
            "uid": uid,
            "email": clean_email,
            "displayName": clean_name,
            "admin": is_admin,
            "role": "admin" if is_admin else "user",
            "updatedAt": firestore.SERVER_TIMESTAMP,
        }, merge=True)
    except Exception as e:
        print(f"[Auth] Firestore user sync notice: {e}")

    return account

def get_registered_account(email: str) -> Optional[Dict[str, Any]]:
    return _registered_accounts.get(email.strip().lower())

def verify_account_password(email: str, password: str) -> Optional[Dict[str, Any]]:
    clean_email = email.strip().lower()
    account = _registered_accounts.get(clean_email)
    if not account:
        return None
    computed_hash = hash_password(password, account["salt"])
    if hmac.compare_digest(computed_hash, account["password_hash"]):
        return account
    return None

def create_session_for_user(user: Dict[str, Any], ttl_seconds: int = 86400 * 7) -> str:
    """Generates and registers a cryptographically random session token."""
    token = f"sess_{secrets.token_hex(32)}"
    _verified_sessions[token] = {
        "uid": user["uid"],
        "email": user["email"],
        "name": user.get("name") or user.get("displayName") or "Journaler",
        "admin": bool(user.get("admin")),
        "role": user.get("role", "user"),
        "expires_at": time.time() + ttl_seconds,
    }
    return token

def create_firebase_custom_token(uid: str, claims: Optional[Dict[str, Any]] = None) -> Optional[str]:
    """Generates a Firebase Custom Auth Token for verified users."""
    try:
        init_firebase_admin()
        token = firebase_auth.create_custom_token(uid, developer_claims=claims or {})
        return token.decode("utf-8") if isinstance(token, bytes) else str(token)
    except Exception as e:
        print(f"[Firebase Custom Token] Notice: {e}")
        return None

# ==========================================
# Zero-Trust Authentication Dependencies
# ==========================================

async def get_current_user(
    auth_credentials: Optional[HTTPAuthorizationCredentials] = Security(security_scheme)
) -> Dict[str, Any]:
    """
    Zero-Trust Security Dependency:
    Only validates:
      1. Cryptographically verified Firebase ID token (JWT) via Firebase Admin SDK
      2. Server-registered session token from active signup/signin
      3. Environment ADMIN_SECRET_TOKEN for testing

    Rejects missing, forged, or unverified tokens with HTTP 401 Unauthorized.
    Strictly NO guest fallback and NO client-provided UID trusting.
    """
    if not auth_credentials or not auth_credentials.credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authorization token required. Please sign in."
        )

    token = auth_credentials.credentials.strip()
    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authorization token required. Please sign in."
        )

    # 1. Check server-registered verified session store
    if token in _verified_sessions:
        session = _verified_sessions[token]
        if time.time() < session.get("expires_at", 0):
            is_admin = bool(session.get("admin") or session.get("email") in ADMIN_IDENTIFIERS)
            return {
                "uid": session["uid"],
                "email": session["email"],
                "email_verified": True,
                "displayName": session.get("name", "Verified Journaler"),
                "admin": is_admin,
                "role": "admin" if is_admin else "user",
                "claims": {"auth_type": "registered_session", "admin": is_admin, "role": "admin" if is_admin else "user"}
            }
        else:
            _verified_sessions.pop(token, None)
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Session expired. Please sign in again."
            )

    # 2. Firebase ID Token (JWT) verification (header.payload.signature)
    if token.count(".") == 2:
        init_firebase_admin()
        try:
            decoded = firebase_auth.verify_id_token(token)
            uid = decoded.get("uid")
            email = decoded.get("email", "")
            if uid:
                is_admin = bool(
                    decoded.get("admin") is True
                    or decoded.get("role") == "admin"
                    or email in ADMIN_IDENTIFIERS
                )
                return {
                    "uid": uid,
                    "email": email or f"{uid}@mindreflect.app",
                    "email_verified": decoded.get("email_verified", True),
                    "displayName": decoded.get("name") or email.split("@")[0] if email else "Verified Journaler",
                    "admin": is_admin,
                    "role": "admin" if is_admin else "user",
                    "claims": decoded
                }
        except Exception as e:
            print(f"[Auth] Firebase JWT verification failed: {type(e).__name__}")
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid or expired authentication token."
            )

    # 3. Dedicated Admin Testing Token (Checked strictly against environment variable)
    env_admin_secret = os.getenv("ADMIN_SECRET_TOKEN", "").strip()
    if env_admin_secret and token == env_admin_secret:
        return {
            "uid": "admin_primary",
            "email": "thaiebu785@gmail.com",
            "email_verified": True,
            "displayName": "Primary Administrator",
            "admin": True,
            "role": "admin",
            "claims": {"admin": True, "role": "admin"}
        }

    # Any other token format is strictly REJECTED
    raise HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Invalid token format. Please sign in with a valid account."
    )


async def require_admin(
    current_user: Dict[str, Any] = Security(get_current_user)
) -> Dict[str, Any]:
    """
    Role-Based Access Control Dependency:
    Verifies user has administrative claims ({admin: true} or role: 'admin').
    Strictly returns HTTP 403 Forbidden if unauthorized.
    """
    is_admin = (
        current_user.get("admin") is True
        or current_user.get("role") == "admin"
        or current_user.get("email") in ADMIN_IDENTIFIERS
    )
    if not is_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"HTTP 403 Forbidden: Administrator access required. Account ({current_user.get('email') or current_user.get('uid')}) lacks admin privileges."
        )
    return current_user
