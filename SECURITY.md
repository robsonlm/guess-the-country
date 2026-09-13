# Security operations

This document captures the manual steps required to put the hardened app
into production. The repository now ships with tightened Firestore rules,
anonymous Firebase Auth, and Cloud Functions that gate every leaderboard
write through server-side validation.

## 1. Install dependencies

```sh
# at repo root — pulls in vitest and firebase-admin
npm install

# Cloud Functions
cd functions && npm install
```

## 2. Enable Firebase Auth providers

In the Firebase Console for the project (`guess-the-country-7d719`):

1. Go to **Authentication → Sign-in method**.
2. **Anonymous** — enable.
3. **Email/Password** — enable.
4. Under **Settings → Authorized domains**, make sure
   `robsonlm.github.io` (and `localhost` for dev) are listed.

These two providers are the only ones the app uses. No third-party or
social providers are required.

## 3. Deploy Firestore rules and Cloud Functions

```sh
# rules
firebase deploy --only firestore:rules

# functions (compiles functions/ then deploys)
firebase deploy --only functions
```

After the deploy, all leaderboard writes go through the Cloud Function
`submitScore`. Direct client writes to `/leaderboard/**` and any access
to `/admin/**` are denied by rules.

## 4. Bootstrap the first admin

Run the bootstrap script once with a service-account key. The key needs
the Firebase Admin SDK role (or owner) on the project.

```powershell
$env:GOOGLE_APPLICATION_CREDENTIALS = "C:\keys\guess-the-country-firebase-adminsdk.json"
$env:FIREBASE_PROJECT_ID = "guess-the-country-7d719"
node scripts/bootstrap-admin.mjs --password "PickARealPassword!" --email you@example.com
```

The script:

1. Writes `password` to `/admin/auth` (used by the
   `verifyAdminPassword` callable).
2. Creates or updates the operator's Firebase Auth user with that password.
3. Sets `{ admin: true }` as a custom claim on that user.

After running it, sign in through the in-app **Sign in as Admin** form
(email + password). Future admins can be promoted via the
`setAdminClaim` callable from any existing admin.

## 5. Clean up legacy leaderboard data

After rules are tightened, any pre-existing entries written without
authentication will be invisible to the new read rules. To purge them:

```powershell
$env:GOOGLE_APPLICATION_CREDENTIALS = "C:\keys\guess-the-country-firebase-adminsdk.json"
$env:FIREBASE_PROJECT_ID = "guess-the-country-7d719"
node scripts/cleanup-leaderboard.mjs
```

The script deletes:

- Any document whose ID starts with `seed-`.
- Any document with the legacy fields `__rateLimitOwner`,
  `__rateLimitAt`, or `submittedAt` left over from the old client.

Real player entries are left untouched. Run it once after deploying the
new rules.

## 6. CI checks

The GitHub Actions workflow now runs `npm audit --audit-level=high`
before the build step. The step is non-blocking (`continue-on-error: true`)
so it surfaces warnings without halting the deploy. Remove that flag once
you are happy triaging audit output.

## 7. CSP and headers

`index.html` ships with a strict CSP via `<meta http-equiv>` tags. There
is no server-side configuration required for GitHub Pages — the meta tag
is honored by every modern browser. If you ever move to Firebase Hosting
or another provider that supports response headers, mirror the same
values in the server config for defence-in-depth.

## 8. Local development with emulators

```sh
firebase emulators:start --only auth,firestore,functions
# in another terminal
VITE_USE_FIREBASE_EMULATORS=true npm run dev
```

The client automatically connects to `127.0.0.1` emulators when the flag
is set.

## 9. Verifying the fix

After deploying:

| Check | Expected |
| --- | --- |
| Anonymous load | App connects; leaderboard reads succeed. |
| Anonymous `submitScore` | Cloud Function writes; entry appears. |
| Non-admin "Clear All" | Button hidden; callable returns `permission-denied`. |
| Admin sign-in | Claim `admin: true`; "Clear All" works. |
| Direct Firestore write from console | Fails with `permission-denied`. |
| `/admin/auth` read from console | Fails with `permission-denied`. |
| CSP report in DevTools console | No blocked requests during normal play. |
