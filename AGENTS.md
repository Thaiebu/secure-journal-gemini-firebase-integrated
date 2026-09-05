# Agent Instructions & Project Directives

## Google Maps Platform Security & Integration Directives

1. **Zero-Hardcoding & Key Handling Protocol**:
   - Never embed hardcoded API keys or credentials directly into code or repositories.
   - For client-side Google Maps SDK interactions (such as `@vis.gl/react-google-maps`), load the API key from environment variables (`import.meta.env.VITE_GOOGLE_MAPS_API_KEY`) or support user-configured input / demo prototyping key securely.
   - For production environments, guide users to retrieve keys from [Google Cloud Console Credentials](https://console.cloud.google.com/google/maps-apis/credentials?utm_campaign=gmp_mcp_codeassist_v1_aistudio) and enforce HTTP Referrer restrictions (`*.yourdomain.com/*`) and designated API quotas (Maps JavaScript API, Places API (New), Geocoding API).

2. **Modern API Standards & Zero Legacy Tolerance**:
   - Strictly prohibit legacy, disabled classes (e.g., legacy `google.maps.Marker`, `google.maps.places.PlacesService`, legacy `DirectionsService`).
   - Use `AdvancedMarkerElement` (`<AdvancedMarker>` in `@vis.gl/react-google-maps`) paired with a valid `mapId` (e.g., `"DEMO_MAP_ID"` or custom vector map ID).
   - Use Places API (New) or server-side proxies to prevent CORS violations on restricted REST endpoints.

3. **Usage Attribution & Cost Awareness**:
   - Always apply the required internal attribution ID `gmp_mcp_codeassist_v1_aistudio` to `<Map>` (`internalUsageAttributionIds={["gmp_mcp_codeassist_v1_aistudio"]}`).
   - Include appropriate cost disclosures and ToS links (`https://cloud.google.com/maps-platform/terms?utm_campaign=gmp_mcp_codeassist_v1_aistudio`).

4. **Payload & Data Hygiene**:
   - Sanitize all location coordinates (`lat`, `lng`), place names, formatted addresses, and location notes before persisting to Firestore. Strip all `undefined` values.
   - Restrict location metadata in user journal entries to authenticated owners in Firestore security rules.

## Role-Based Access Control (RBAC) & Admin Roles Directives

1. **Authentication & Admin Dependencies Protocol**:
   - Validate Firebase ID tokens passed in the `Authorization: Bearer <TOKEN>` header using `firebase-admin.auth.verify_id_token()` (or verified backend session verification).
   - Enforce a `get_current_user` / `authenticateRequest` dependency for general authenticated users to isolate tenant data.
   - Enforce a `require_admin` dependency that verifies `user.get("admin") is True` or `user.get("role") == "admin"`, strictly returning `HTTP 403 Forbidden` if elevated credentials are missing.

2. **Backend & Cloud Run API Specifications**:
   - `POST /api/journal`: Receives user reflection/entry, executes Gemini analysis using the fallback ladder (`gemini-3.6-flash` -> `gemini-3.1-flash-lite` -> `gemini-flash-latest` -> `gemini-3.7-flash`), strips any `undefined`/`null` attributes, and commits both input and output to Firestore under `/users/{uid}/interactions/` and `/users/{uid}/journals/`.
   - `GET /api/journal`: Retrieves journal history strictly filtered for the requesting `uid` only.
   - `GET /api/admin/metrics`: Admin-only endpoint protected by `require_admin` to view system-wide usage metrics, model resilience distributions, and security audit logs.
   - `POST /api/admin/users/:uid/promote`: Admin-only route to set custom user claims via `auth.set_custom_user_claims(uid, {"admin": True})`.

3. **Database Security Mirroring**:
   - Mirror all backend RBAC checks in `firestore.rules`: personal collections (`/users/{userId}/interactions`, `/users/{userId}/journals`) are isolated to `request.auth.uid == userId`, while `/admin/{document=**}` is isolated strictly to `request.auth.token.admin == true`.
   - Never allow insecure wildcard defaults (`allow read, write: if true;` is strictly forbidden).

## External Notifications & Email Dispatch Directives

1. **Zero-Hardcoding & Credential Hygiene**:
   - Never hardcode email service keys (e.g. SendGrid, Resend, Mailgun) or webhook URLs in code.
   - Load dispatch keys dynamically from environment variables (`RESEND_API_KEY`, `SENDGRID_API_KEY`, `NOTIFICATION_FROM_EMAIL`).
   - If third-party external API keys are not supplied in the environment, the server must support graceful delivery logging and verified in-app dispatch preview without throwing unhandled crashes.

2. **Anti-SSRF & Input Sanitization**:
   - Strictly validate destination emails with RFC 5322 standard regex (`/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/`).
   - For webhook notifications (Slack/Discord), enforce HTTPS URLs only and strictly ban loopback/private IP ranges (`127.0.0.1`, `localhost`, `10.0.0.0/8`, `192.168.0.0/16`, `172.16.0.0/12`, and GCP metadata IP `169.254.169.254`) to prevent Server-Side Request Forgery (SSRF).

3. **Tenant Isolation & Rate Limiting**:
   - Enforce `getCurrentUser` on all notification endpoints (`/api/notifications/*`). Users can only query, preview, or dispatch summaries synthesized from their own private journals and habits.
   - Enforce rate limiting on email/notification triggers (max 5 requests per 60 seconds) to prevent spamming, denial of wallet, and outbound quota exhaustion.

4. **AI-Powered Digest Generation**:
   - Generate weekly reflections and habit performance syntheses using the Gemini fallback ladder (`gemini-3.6-flash` -> `gemini-3.1-flash-lite` -> `gemini-flash-latest` -> `gemini-3.7-flash`).
   - Format digests into responsive HTML email templates with clean styling, habit streak metrics, emotional valence trajectories, and actionable growth recommendations.

