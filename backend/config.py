import os
import json
from pathlib import Path
from dotenv import load_dotenv

load_dotenv()

# Resilient Model Fallback Ladder (Prioritizing Speed & Reliability)
MODEL_FALLBACK_LADDER = [
    "gemini-3.6-flash",
    "gemini-3.1-flash-lite",
    "gemini-2.5-flash",
    "gemini-flash-latest",
    "gemini-2.0-flash",
    "gemini-2.5-flash-lite",
    "gemini-3.7-flash",
]

_cached_secret: str | None = None

def get_gemini_api_key() -> str:
    """
    Dynamically retrieves GEMINI_API_KEY from Google Cloud Secret Manager with
    secure fallback to environment variables.
    Prevents hardcoded credentials in source control.
    """
    global _cached_secret
    if _cached_secret:
        return _cached_secret

    # 1. Check container/process environment variables
    env_key = os.getenv("GEMINI_API_KEY")
    if env_key and len(env_key.strip()) > 0:
        _cached_secret = env_key.strip()
        return _cached_secret

    # 2. Dynamic runtime lookup via Google Cloud Secret Manager
    project_id = (
        os.getenv("GOOGLE_CLOUD_PROJECT")
        or os.getenv("GCP_PROJECT")
        or os.getenv("FIREBASE_PROJECT_ID")
        or "gen-lang-client-0382888626"
    )
    secret_id = os.getenv("GEMINI_SECRET_NAME", "GEMINI_API_KEY")

    try:
        from google.cloud import secretmanager
        client = secretmanager.SecretManagerServiceClient()
        name = f"projects/{project_id}/secrets/{secret_id}/versions/latest"
        response = client.access_secret_version(request={"name": name})
        secret_val = response.payload.data.decode("UTF-8").strip()
        if secret_val:
            _cached_secret = secret_val
            print(f"[SecretManager] Successfully retrieved dynamic secret '{secret_id}' from GCP project '{project_id}'")
            return _cached_secret
    except Exception as e:
        print(f"[SecretManager] Secret Manager retrieval notice: {e}")

    return ""
