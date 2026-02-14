# Backend industry-norm review (CineMind)

Date: 2026-02-14  
Scope: `backend/` API (auth, movies, middleware, DB access, config)

## Executive summary

The backend is a solid MVP: route separation is clean, SQL is parameterized, and rate limiting exists. However, several issues should be addressed before treating this as production-grade:

- **Critical security/robustness gaps**: weak auth semantics, lack of config fail-fast, and non-transactional multi-step updates.
- **Operational gaps**: no logging strategy, no automated tests, and no migration/schema ownership in repo.
- **API consistency gaps**: mixed response shapes and inconsistent error behaviors.

---

## Critical findings (fix first)

1. **Authentication error messages enable user enumeration**
   - `loginService` throws different errors for missing user vs bad password.
   - Industry norm: return a single generic auth failure message (e.g., `Invalid credentials`) and log details server-side.
   - Why it matters: attackers can confirm valid usernames.

2. **No startup-time validation of required environment variables**
   - JWT/DB config is read directly from `process.env` without hard validation.
   - Industry norm: fail fast on boot if required env vars are missing/malformed (`JWT_SECRET`, `DATABASE_URL`, token TTL, etc.).
   - Why it matters: silent misconfiguration causes runtime security and reliability failures.

3. **Showcase write flow is non-transactional and race-prone**
   - `setShowcasePosition` performs several dependent queries without a DB transaction.
   - Industry norm: wrap multi-step state changes in a transaction and set clear uniqueness constraints (`(user_id, position)`, `(user_id, movie_id)`).
   - Why it matters: concurrent requests can produce inconsistent showcase state.

4. **Potential runtime crash path in password validation**
   - `validatePassword` reads `password.length` without null/type guard.
   - Industry norm: schema-validate body before business logic and never assume field shape.
   - Why it matters: malformed input can trigger 500s instead of clean 400s.

---

## High-priority improvements

1. **Adopt request schema validation (Zod/Joi/Yup/express-validator)**
   - Current manual checks are repeated and inconsistent across controllers.
   - Industry norm: centralized DTO validation + coercion + shared error format.

2. **Normalize API response contract**
   - Some endpoints return `{ success, error }`, others `{ error }`, and auth profile returns a different shape.
   - Industry norm: versioned, consistent response envelope (or documented resource-based responses), with machine-readable error codes.

3. **Harden transport/security middleware**
   - Missing `helmet`, strict CORS policy handling, request size limits tuning, and possibly `trust proxy` config for rate limiting behind proxies.
   - Industry norm: baseline secure headers + explicit proxy/network posture.

4. **Improve auth/session model**
   - Access token only; no refresh token lifecycle, revocation strategy, or rotation.
   - Industry norm: short-lived access token + refresh token store/rotation/revocation for web apps.

5. **Lock down cache mutation endpoints**
   - Public write endpoints (`/cache`, `/cache/bulk`, cleanup) are rate-limited but not authenticated/authorized.
   - Industry norm: public reads okay, writes protected (service key/internal auth/admin role).

---

## Medium-priority improvements

1. **Fix rate limiter comment/message mismatches**
   - Comments and user-facing strings do not match configured windows/max values in places.
   - Industry norm: policy text must align with actual enforcement.

2. **Return semantics for deletes should be explicit and consistent**
   - Some delete routes always return success even when no rows were deleted; others return 404.
   - Industry norm: choose idempotent 204 semantics or strict 404 semantics and apply consistently.

3. **Avoid `SELECT *` in model/controller queries**
   - Over-fetching and accidental contract drift risk.
   - Industry norm: select only required columns.

4. **Input bounds for pagination**
   - `limit`/`offset` parsing exists but lacks bounds enforcement (negative or huge values).
   - Industry norm: enforce min/max and reject out-of-range values.

5. **Observability and diagnostics**
   - Uses `console.error` only.
   - Industry norm: structured logging (pino/winston), request correlation IDs, and metrics/traces.

---

## Small inconsistencies / code hygiene

1. **`sendWelcomeEmail` imported but call is commented out**
   - Dead import and unclear product intent.

2. **`@neondatabase/serverless` dependency present but unused**
   - Remove or adopt intentionally.

3. **Hardcoded DB SSL behavior**
   - `rejectUnauthorized: false` is usually environment-specific and should be configurable.

4. **No dedicated test scripts in backend package**
   - At least smoke/integration tests for auth + core movie flows should exist.

5. **Repository contains `backend/node_modules` directory**
   - This is generally not committed in app repos and bloats VCS history.

---

## Suggested remediation roadmap

### Phase 1 (1-2 days)
- Add environment schema validation at boot; fail fast.
- Unify login errors to `Invalid credentials`.
- Add request validation middleware for auth + movie endpoints.
- Make showcase updates transactional.

### Phase 2 (2-4 days)
- Standardize API response/error format + error codes.
- Protect cache mutation/cleanup routes with service auth.
- Add helmet + trust-proxy-aware rate limiter config.
- Bound and sanitize pagination/filter params.

### Phase 3 (ongoing)
- Add integration tests (supertest + test DB).
- Introduce structured logs, metrics, and alerting.
- Formalize DB migrations and schema ownership in-repo.

---

## Quick wins checklist

- [ ] Replace auth failure detail with generic message.
- [ ] Add null/type checks to `validatePassword`.
- [ ] Align rate limiter comments/messages with true config.
- [ ] Add transaction around showcase upsert/swap logic.
- [ ] Decide and document DELETE semantics globally.
- [ ] Remove unused dependencies/imports.
