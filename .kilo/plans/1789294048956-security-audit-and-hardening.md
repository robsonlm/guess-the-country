# Security Audit & Hardening Plan — `guess-the-country`

Scope: full audit + fix plan across Firestore rules, client services, headers, dependency hygiene, and CI. Admin model: Firebase Auth + custom claim. Fallback REST bin (`api.restful-api.dev`) is removed. Input handling: trim + length cap + reject control characters.

## 1. Findings (severity ordered)

### Critical — backend / data integrity
1. `firestore.rules:5` — `match /leaderboard/{document=**} { allow read, write: if true; }`. Anonymous clients can read every score and write/delete any document, including other players' entries.
2. `firestore.rules:8` — `match /admin/{document=**} { allow read: if true; allow write: if false; }`. `verifyAdminPassword` (`src/services/firebase.ts:227`) reads the plaintext admin password from this collection. The password is effectively public.
3. `src/services/leaderboard.ts:42` — `GLOBAL_CLOUD_BIN_ID` is hard-coded and points to a public REST bin (`api.restful-api.dev/objects/<id>`). Anyone with the URL can GET or PUT the entire global leaderboard, poisoning or wiping scores worldwide.
4. `src/services/firebase.ts:296` — `setFirebaseAdminPassword` ships to the client. Even though rules block writes, leaving this in the bundle invites future misuse if rules regress.

### High — client-trust violations
5. `adminTestMode` (`UserSettings` in `src/services/countriesApi.ts`, toggled in `src/components/SettingsModal.tsx:174` and `StartGameModal.tsx:104`) is a plain localStorage flag. Anyone can flip it via DevTools and unlock "Clear All Leaderboard" in `LeaderboardModal.tsx:164` without the Firestore password.
6. The Firestore password check itself is a thin `getDoc` + string compare — only as strong as the rules. Once rules are tightened, this becomes the only gate, so it must move behind Firebase Auth.

### Medium — hardening / hygiene
7. No CSP, `X-Frame-Options`, `Referrer-Policy`, or `Permissions-Policy` in `index.html`.
8. `src/components/GlobeGameView.tsx:161` uses `innerHTML = ''` to clear a container — replace with `replaceChildren()`.
9. `index.html` SPA redirect script accepts `?p=...` and pushes it into `history.replaceState` via `decodeURIComponent`. Low-risk open-redirect / path-injection surface; restrict to a single segment and validate.
10. `src/services/fallbackData.ts` uses deprecated `https://goo.gl/maps/...` short links (not security-critical, but they can be reassigned and leak).
11. `legacy/scripts/script.js` references `api.restcountries.com` (unused legacy code; remove or quarantine).
12. No `npm audit` step in `.github/workflows/deploy.yml`.
13. `scripts/deploy.cjs` is unused (CI deploys via `actions/deploy-pages`); remove to avoid stale-credential surface (`--force`, hardcoded user/email).
14. `Math.random()` used for shuffle and ID generation — fine for gameplay, but entry IDs should use `crypto.randomUUID()` to prevent collisions.

### Low — informational
- React auto-escapes text rendering, so XSS via player name is currently not exploitable. Keep the `maxLength={24}` cap and add control-char rejection (per chosen input policy).
- `window.prompt` / `window.confirm` for admin auth are UX issues, not vulnerabilities. Replace with an in-modal form.

## 2. Target Architecture

- **Auth**: Firebase Authentication, anonymous sign-in for the player. Admin role via a custom claim (`admin: true`) set by a one-time bootstrap (Cloud Function or manual console step). The app prompts re-auth to upgrade an anonymous session when entering admin mode.
- **Leaderboard writes**: client signs in anonymously → calls a Cloud Function `submitScore` that validates payload shape, enforces rate limits, and writes to Firestore. Direct client writes to `/leaderboard/**` are denied.
- **Leaderboard reads**: rules allow any signed-in user to read.
- **Admin operations**: client reads its own ID token, checks `admin` claim, and calls a Cloud Function `adminClearLeaderboard`. Direct client writes/deletes to `/leaderboard/**` and reads of `/admin/**` from clients are denied.
- **No fallback REST bin.** Firestore is the single source of truth for global scores.
- **Headers**: strict CSP via `<meta http-equiv>`, plus `X-Frame-Options: DENY`, `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy` denying unused capabilities.

## 3. Ordered Task List

### Phase A — Lock down the backend (do these first; without them every other fix is theatre)
1. Replace `firestore.rules` with a ruleset that:
   - Allows reads of `/leaderboard/{entry}` only to `request.auth != null`.
   - Denies all client writes to `/leaderboard/**`.
   - Denies all client reads/writes to `/admin/**` (server-only via Admin SDK).
   - Keeps `match /{document=**}` deny-all default.
2. Add Firebase Auth (anonymous) to the client:
   - In `src/services/firebase.ts`, add `signInAnonymously` on bootstrap; surface a single `auth` getter.
   - Pass `auth.currentUser` into Firestore queries so unauth reads are denied cleanly with a friendly error in `AppBootstrap.tsx`.
3. Implement two Cloud Functions (Node 20, Firebase Functions v2):
   - `submitScore(entry)`: validates shape, size, types; enforces per-IP/per-UID rate limit (e.g. 10/min); writes to `/leaderboard/{id}`.
   - `adminClearLeaderboard()`: requires `context.auth.token.admin === true`; deletes all docs in `/leaderboard`.
   - `setAdminClaim(uid)` callable once from a privileged operator; not exposed in normal client builds.
4. Update `src/services/firebase.ts`:
   - Remove `setFirebaseAdminPassword` from the client bundle.
   - Replace `saveEntryToFirebase` with a `httpsCallable('submitScore')` call.
   - Replace `clearFirebaseLeaderboard` with a `httpsCallable('adminClearLeaderboard')` call gated on the ID-token claim.
   - Replace `verifyAdminPassword` with `getIdTokenResult().claims.admin === true`. Provide a "Sign in as admin" form that calls `signInWithEmailAndPassword` for a designated admin account (password handling via Firebase Auth, never compared client-side).

### Phase B — Remove the public fallback
5. In `src/services/leaderboard.ts`:
   - Delete `GLOBAL_CLOUD_BIN_ID`, `CLOUD_API_URL`, and all references.
   - Remove the `api.restful-api.dev` PUT in `clearAllLeaderboardEntries` and the GET branch in `syncGlobalLeaderboard`.
   - Keep only the Firestore path; surface a clear "offline" state when sync fails.

### Phase C — Server-trust the admin flag
6. In `src/services/countriesApi.ts` and `src/types/game.ts`:
   - Remove `adminTestMode` from `UserSettings` and from `loadSettings` / `saveSettings`.
   - Compute `isAdmin` from the Firebase ID token claim in `App.tsx`, `LeaderboardModal.tsx`, and `StartGameModal.tsx`. Drop the localStorage flag and the Settings UI toggle.
7. In `StartGameModal.tsx`: remove the `ADMINMODE` text-entry secret. Replace with a "Sign in as Admin" link that opens an in-modal Firebase Auth email/password form.

### Phase D — Input hardening
8. Add a shared util `src/utils/sanitize.ts` with `sanitizePlayerName(raw)`:
   - `String.prototype.trim()`.
   - Cap length to 24 (already enforced in UI; enforce again on submit).
   - Reject if it contains control characters (`/[\u0000-\u001F\u007F]/`).
   - Replace the "ADMINMODE" handler with a simple call to the admin sign-in flow; do not echo the raw value back to the DOM.
9. Use the util in:
   - `addLeaderboardEntry` (`src/services/leaderboard.ts:238`) before persisting or pushing.
   - `StartGameModal.tsx` `handleNameSubmit`.

### Phase E — Headers and transport
10. In `index.html`, add a `<meta http-equiv="Content-Security-Policy" content="default-src 'self'; img-src 'self' data: blob: https://*.googleusercontent.com; style-src 'self' 'unsafe-inline'; script-src 'self'; connect-src 'self' https://*.googleapis.com https://*.firebaseio.com https://*.firestore.googleapis.com https://identitytoolkit.googleapis.com https://*.cloudfunctions.net; frame-ancestors 'none'; base-uri 'self'; form-action 'self'">` and equivalents for `X-Content-Type-Options`, `Referrer-Policy`, `X-Frame-Options`. Verify by serving locally and inspecting headers / CSP reports.
11. Hard-code `history.replaceState` path target in `index.html` SPA redirect to a single segment regex (`/^\/[a-z0-9-]+$/i`) before applying; drop the query if invalid.

### Phase F — Code hygiene
12. `src/components/GlobeGameView.tsx:161` — replace `globeContainerRef.current.innerHTML = ''` with `globeContainerRef.current.replaceChildren()`.
13. `src/services/leaderboard.ts:262` — replace `Math.random().toString(36).substr(2, 9)` with `crypto.randomUUID()` (already available in modern browsers; keep a fallback only if a target browser lacks it).
14. `src/services/fallbackData.ts` — replace `https://goo.gl/maps/...` with full `https://www.google.com/maps/search/?api=1&query=...` URLs. Not exploitable, but reduces risk of link reassignment.
15. `legacy/scripts/script.js` — leave in place but add a top-of-file `/* NOT SHIPPED — legacy reference only */` banner, or move it under `docs/legacy/` to make the intent explicit.
16. `scripts/deploy.cjs` — delete (CI uses `actions/deploy-pages`).
17. `.github/workflows/deploy.yml` — add `npm audit --audit-level=high` as a non-blocking step, and a `permissions:` block that scopes to `contents: read` only.

### Phase G — Validation
18. Manual:
    - Anonymous load: leaderboard reads succeed; direct writes from console fail with `permission-denied`.
    - Anonymous submit: Cloud Function writes the entry; the doc appears under `/leaderboard`.
    - Admin email/password sign-in: ID token contains `admin: true`; "Clear All" works.
    - Non-admin sign-in: "Clear All" button is hidden and the callable returns `permission-denied`.
    - CSP: no blocked requests during normal play (open DevTools Network, look for blocked items).
19. Automated:
    - Add `npm audit --audit-level=high` to CI as a warning step.
    - Add a Vitest unit test for `sanitizePlayerName` covering the trim/length/control-char cases.
    - Add a Firestore rules unit test (using `@firebase/rules-unit-testing`) for: anonymous read allowed, anonymous write denied, admin write allowed only via callable, non-admin callable denied.
20. Dependency hygiene:
    - Run `npm outdated` and decide on bumps; pin `firebase` to a single minor in `package.json` to keep SDK/Auth/Functions in lock-step.

## 4. Out of Scope (explicit)
- Migrating data from the existing public REST bin (it's public data, but if recovery matters we should snapshot Firestore first).
- Refactoring the 3D globe view beyond the `innerHTML` line.
- Replacing `Math.random` in gameplay (distractor shuffle, etc.).
- Cosmetic UI changes.

## 5. Risks & Open Questions
- **Firebase Auth setup**: this requires enabling the Identity Toolkit in the Firebase project and creating at least one admin user. Confirm whether to use anonymous + email/password, or to keep the app entirely anonymous and require email/password only for the admin path.
- **Existing leaderboard data**: with rules tightened, any document written without a valid `request.auth` will be invisible to the new reads. We should write a one-time backfill/cleanup script before deploying rules.
- **CSP strictness**: `style-src 'unsafe-inline'` is currently needed for Vite's injected styles; revisit after build to tighten if possible.
- **Cloud Functions billing**: `submitScore` will be invoked on every game completion. Confirm the project is on the Blaze plan before deploying.

## 6. Suggested Rollout
1. Ship Phase A + B in one PR; deploy functions; tighten rules in a separate Firebase Console deploy so we can roll back quickly.
2. Ship Phase C + D + F in a follow-up PR.
3. Ship Phase E + G last.
4. After each phase, smoke-test in production using the validation checklist in §3.Phase G.
