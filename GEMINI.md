# Gemini & Agent Directives

## Google Maps Platform Security & Integration Directives

1. **Zero-Hardcoding & Key Handling Protocol**:
   - Never embed hardcoded API keys or credentials directly into code or repositories.
   - For client-side Google Maps SDK interactions (such as `@vis.gl/react-google-maps`), load the API key from environment variables (`import.meta.env.VITE_GOOGLE_MAPS_API_KEY`) or allow a user-provided API / demo prototyping key securely in client state.
   - For production environments, direct users to retrieve keys from [Google Cloud Console Credentials](https://console.cloud.google.com/google/maps-apis/credentials?utm_campaign=gmp_mcp_codeassist_v1_aistudio) and enforce HTTP Referrer restrictions and designated API quotas.

2. **Modern API Standards & Zero Legacy Tolerance**:
   - Strictly avoid deprecated APIs (such as legacy `google.maps.Marker`, `PlacesService`, `DirectionsService`).
   - Use `AdvancedMarkerElement` (`<AdvancedMarker>` from `@vis.gl/react-google-maps`) and ensure a valid `mapId` (e.g., `"DEMO_MAP_ID"`) is specified on the `<Map>` container.
   - Use official SDK wrappers or server-side proxies to prevent client-side CORS issues.

3. **Usage Attribution & Compliance**:
   - Set `internalUsageAttributionIds={["gmp_mcp_codeassist_v1_aistudio"]}` on React `<Map>` components.
   - Respect user privacy: prompt for explicit permission prior to geolocation access and allow manual location pinning and search.

## Role-Based Access Control (RBAC) & Admin Directives

1. **Authentication & Admin Dependencies Protocol**:
   - Validate Firebase ID tokens passed in the `Authorization: Bearer <TOKEN>` header using `firebase-admin.auth.verify_id_token()`.
   - Implement `get_current_user` dependency for tenant isolation.
   - Implement `require_admin` dependency checking `user.get("admin") is True` or `user.get("role") == "admin"`, returning HTTP `403 Forbidden` if unauthorized.

2. **Core Endpoints Implementation**:
   - `POST /api/journal`: Ingest reflection, execute Gemini fallback ladder, sanitize `undefined` attributes, and save interaction log + journal under `/users/{uid}/interactions/`.
   - `GET /api/journal`: Retrieve journals strictly for the requesting `uid`.
   - `GET /api/admin/metrics`: Protected admin route for system-wide analytics, latency, and audit logs.
   - `POST /api/admin/users/:uid/promote`: Protected admin route setting custom claims `{"admin": True}`.

3. **Defensive Architecture**:
   - Upstream JSON body decoding & CORS before route handlers.
   - Secret loading from environment variables or Google Cloud Secret Manager at runtime.

