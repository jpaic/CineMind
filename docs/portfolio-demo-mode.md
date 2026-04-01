# Portfolio Demo Mode (No Login Required)

If you want recruiters to quickly review CineMind without creating an account, the safest path is:

1. **Keep production auth enabled** for normal users.
2. Add a **separate demo mode** entered through a dedicated URL.
3. Make demo mode **read-only** so no permanent data is changed.

## Recommended Approach

Use a route like:

- `https://yourdomain.com/demo`

When `/demo` is opened:

- Frontend stores a `demoMode=true` flag in session/local storage.
- App uses a fixed "Demo User" identity in the UI.
- Any write action (rate movie, watchlist changes, profile edits, account settings) is blocked or converted to temporary local-only state.
- API requests that mutate data are rejected server-side in demo mode.

This gives a smooth product walkthrough and avoids exposing private auth flows to recruiters.

## Why this is better than a fork-only resume copy

A full fork with auth removed can drift out of sync and doubles maintenance.

A feature-flagged demo mode in the same codebase:

- keeps your showcase version current,
- avoids duplicate deployments,
- and preserves real security for normal users.

## Suggested Technical Design

### 1) Frontend entry + UX

- Add a "Try Demo" CTA on landing page.
- Route user to `/demo`.
- Show a visible badge: `Demo Mode (Read-only)`.
- Disable or relabel write buttons (`Save`, `Rate`, `Add to Watchlist`) with helper text.

### 2) Backend protection (must-have)

Treat demo restrictions as **server-enforced**, not just UI-enforced.

Options:

- **Preferred**: issue a short-lived JWT with claim like `role=demo` or `scope=read_only`.
- Middleware denies all mutating endpoints (`POST`, `PUT`, `PATCH`, `DELETE`) for demo tokens.

Alternative:

- Allow writes to a temporary sandbox table keyed by session and purge regularly.

### 3) Demo data strategy

Use one of these:

- Seeded public demo account (read-only), or
- Pre-generated static sample payloads for recommendations/profile stats.

Keep content deterministic so every recruiter sees a polished state.

### 4) Resume / portfolio linking

In your CV, link directly to `/demo` and note:

- "Live demo available without login (read-only mode)."

Keep your full app link separately for people who want to register and test auth.

## Implementation Checklist

- [ ] Add `/demo` route and state flag.
- [ ] Add Demo Mode banner in layout.
- [ ] Guard all write UI actions in demo mode.
- [ ] Add backend middleware to block write endpoints for demo identity.
- [ ] Add seed dataset for demo profile stats/history.
- [ ] Add CV link pointing to `/demo`.
- [ ] Add one-line explanation on landing page.

## Security Notes

- Never rely on hidden buttons alone; enforce read-only in backend.
- Keep demo token privileges minimal and time-limited.
- Avoid exposing private user data in demo payloads.

