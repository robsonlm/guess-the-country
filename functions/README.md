# Cloud Functions

This directory contains the Firebase Cloud Functions (v2, Node 20) that back
the leaderboard. The client never writes to Firestore directly; every mutation
goes through one of these callables.

## Functions

| Name | Auth | Purpose |
| --- | --- | --- |
| `submitScore` | Signed-in (anonymous ok) | Validates and writes a leaderboard entry. Enforces a per-user rate limit of 10 submissions per minute. |
| `adminClearLeaderboard` | `admin` custom claim required | Deletes every document in `/leaderboard`. |
| `setAdminClaim` | `admin` custom claim required | Sets or clears the `admin` custom claim on a target user UID. |
| `setAdminPassword` | `admin` custom claim required | Writes the admin password to `/admin/auth` (one-time bootstrap). |
| `verifyAdminPassword` | Signed-in (anonymous ok) | Checks the supplied password against `/admin/auth` and grants the caller the `admin` custom claim. |

## Setup

1. Install: `cd functions && npm install`
2. Build: `npm run build`
3. Deploy: `firebase deploy --only functions`
4. Bootstrap: from a one-time operator session, call `setAdminPassword` with the initial password. Then sign in with the operator's Firebase Auth account (email/password) and call `verifyAdminPassword` to grant the `admin` claim. Subsequent operators can also use `setAdminClaim(uid, true)` once the first admin exists.

## Firestore rules

Rules live at `../firestore.rules`. They:

- Allow reads of `/leaderboard/{id}` to any signed-in user.
- Deny all client writes to `/leaderboard/**` and `/admin/**`.

## Local development

Run the Firebase Emulator Suite from the project root:

```sh
firebase emulators:start --only auth,firestore,functions
```

Then set `VITE_USE_FIREBASE_EMULATORS=true` in `.env.local` to wire the client
to the local emulators.
