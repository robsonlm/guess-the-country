/* eslint-disable no-console */
/**
 * Cleanup script — deletes any leftover seed-* documents from /leaderboard
 * and any entries with `__rateLimitOwner` set by an old client build.
 *
 *   $env:GOOGLE_APPLICATION_CREDENTIALS = "C:\path\to\serviceAccount.json"
 *   $env:FIREBASE_PROJECT_ID            = "guess-the-country-7d719"
 *   node scripts/cleanup-leaderboard.mjs
 *
 * Safe to run multiple times; it deletes only documents that match the
 * documented seed/legacy criteria. Real player entries are left alone.
 */

import { initializeApp, cert, getApps } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { readFileSync } from "node:fs";
import { env } from "node:process";

async function main() {
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

  const db = getFirestore(app);
  const col = db.collection("leaderboard");
  const snapshot = await col.get();

  const toDelete = [];
  snapshot.forEach((docSnap) => {
    const id = docSnap.id;
    const data = docSnap.data();
    const isSeedId = id.startsWith("seed-");
    const hasLegacyField =
      "__rateLimitOwner" in data || "__rateLimitAt" in data || "submittedAt" in data;
    if (isSeedId || hasLegacyField) {
      toDelete.push({ id, reason: isSeedId ? "seed-id" : "legacy-field" });
    }
  });

  if (toDelete.length === 0) {
    console.log("[cleanup] Nothing to do.");
    return;
  }

  console.log(`[cleanup] Deleting ${toDelete.length} document(s):`);
  for (const d of toDelete) console.log(`  - ${d.id} (${d.reason})`);

  const batch = db.batch();
  for (const { id } of toDelete) batch.delete(col.doc(id));
  await batch.commit();

  console.log("[cleanup] Done.");
}

main().catch((err) => {
  console.error("[cleanup] Failed:", err);
  process.exit(1);
});
