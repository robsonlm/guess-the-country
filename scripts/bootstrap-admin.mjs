/* eslint-disable no-console */
/**
 * Bootstrap script — run locally with a Firebase service-account JSON key.
 *
 *   $env:GOOGLE_APPLICATION_CREDENTIALS = "C:\path\to\serviceAccount.json"
 *   $env:FIREBASE_PROJECT_ID            = "guess-the-country-7d719"
 *   node scripts/bootstrap-admin.mjs --password "YourStrongPass!" --email admin@example.com
 *
 * What it does:
 *   1. Writes the admin password to /admin/auth in Firestore.
 *   2. Creates a Firebase Auth user for the operator (if missing) and sets
 *      the `admin: true` custom claim on that user.
 *
 * After running, the operator can sign in via the in-app admin form and
 * promote additional admins through the `setAdminClaim` callable.
 */

import { initializeApp, cert, getApps } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore, FieldValue } from "firebase-admin/firestore";
import { readFileSync } from "node:fs";
import { argv, env } from "node:process";

function parseArgs(args) {
  const out = { password: null, email: null, displayName: null };
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a === "--password" || a === "-p") out.password = args[++i];
    else if (a === "--email" || a === "-e") out.email = args[++i];
    else if (a === "--display-name") out.displayName = args[++i];
    else if (a === "--help" || a === "-h") {
      console.log(
        "Usage: node scripts/bootstrap-admin.mjs --password <pw> --email <admin@example.com> [--display-name <name>]"
      );
      process.exit(0);
    }
  }
  return out;
}

async function main() {
  const { password, email, displayName } = parseArgs(argv.slice(2));
  if (!password || !email) {
    console.error("Missing --password and/or --email.");
    process.exit(1);
  }

  const credPath = env.GOOGLE_APPLICATION_CREDENTIALS;
  const projectId = env.FIREBASE_PROJECT_ID;
  if (!credPath || !projectId) {
    console.error(
      "Set GOOGLE_APPLICATION_CREDENTIALS and FIREBASE_PROJECT_ID environment variables first."
    );
    process.exit(1);
  }

  const serviceAccount = JSON.parse(readFileSync(credPath, "utf8"));
  const app = getApps().length
    ? getApps()[0]
    : initializeApp({ credential: cert(serviceAccount), projectId });

  const auth = getAuth(app);
  const db = getFirestore(app);

  console.log(`[bootstrap] Writing admin password to /admin/auth in ${projectId}…`);
  await db.collection("admin").doc("auth").set(
    {
      password,
      updatedAt: FieldValue.serverTimestamp(),
      updatedBy: "bootstrap-script",
    },
    { merge: true }
  );

  console.log(`[bootstrap] Ensuring Firebase Auth user exists for ${email}…`);
  let user;
  try {
    user = await auth.getUserByEmail(email);
    console.log(`[bootstrap] Existing user ${user.uid} found; updating password + claim.`);
  } catch {
    user = await auth.createUser({
      email,
      password,
      emailVerified: true,
      displayName: displayName || undefined,
    });
    console.log(`[bootstrap] Created user ${user.uid}.`);
  }

  await auth.updateUser(user.uid, {
    password,
    displayName: displayName || user.displayName,
  });

  await auth.setCustomUserClaims(user.uid, { admin: true });
  console.log(`[bootstrap] Granted admin claim to ${user.uid}.`);

  console.log("[bootstrap] Done.");
}

main().catch((err) => {
  console.error("[bootstrap] Failed:", err);
  process.exit(1);
});
