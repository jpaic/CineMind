# Security Review (Critical Findings)

Date: 2026-04-09
Scope: `frontend/`, `backend/`, `ml-service/`

## Highest-Risk Issues

1. **Public unauthenticated cache write endpoints (data poisoning / DB abuse):**
   `POST /api/movies/cache`, `POST /api/movies/cache/bulk-write`, and `DELETE /api/movies/cache/cleanup` are exposed without authentication.
2. **Client-side API key exposure:**
   The frontend directly uses `VITE_GROQ_API_KEY` and `VITE_TMDB_API_KEY`, which are publicly extractable in browser builds.
3. **Demo account defaults can expose real user data:**
   Demo JWT defaults to `user_id=1`, and demo sessions can access read endpoints (including data export).
4. **JWT stored in readable browser storage:**
   Token is stored in JS-accessible cookies/sessionStorage (no HttpOnly protection).
5. **URL token usage for sensitive actions:**
   Email/password/account action tokens are accepted via query parameters, increasing leak risk via logs and referrers.

## Additional Serious Issues

- CORS misconfiguration risk (`Access-Control-Allow-Origin: *` with credentials headers in deployment config).
- TLS validation disabled for DB connection (`rejectUnauthorized: false`).
- Raw upstream ML error body returned to clients (information leakage).
- Missing auth/rate limit hardening on sensitive confirmation endpoints.
- Network-failure auth fallback on frontend (`verifyToken` treats offline as authenticated).

## Operational/Engineering Problems

- Auth-flow tables are created from request path instead of migrations (latency + operational fragility).
- Bulk import allows very large payloads (up to 2000 rows) without strict body-size hard limits visible in app config.
- Error handling is inconsistent; sensitive errors are sometimes logged and/or forwarded.

