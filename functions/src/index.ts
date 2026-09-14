import * as functions from "firebase-functions";
import * as admin from "firebase-admin";

admin.initializeApp();

const db = admin.firestore();
const LEADERBOARD_COLLECTION = "leaderboard";
const ADMIN_COLLECTION = "admin";
const ADMIN_AUTH_DOC = "auth";

const ALLOWED_GAME_MODES = new Set(["globe", "flag-to-name", "name-to-flag"]);
const ALLOWED_CONTINENTS = new Set([
  "all",
  "Africa",
  "Americas",
  "Asia",
  "Europe",
  "Oceania",
]);
const ALLOWED_EDITIONS = new Set(["world", "us-states"]);
const ALLOWED_US_REGIONS = new Set(["all", "Northeast", "Midwest", "South", "West"]);
const ALLOWED_TIMER_MODES = new Set(["timed", "relaxed", "per-question", "blitz"]);
const ALLOWED_RANK_BADGES = new Set(["S+", "S", "A", "B", "C"]);

const PLAYER_NAME_MAX = 24;
const ID_MAX = 96;
const RATE_WINDOW_MS = 60 * 1000;
const RATE_MAX_PER_WINDOW = 10;

type CallableRequest = functions.https.CallableRequest;

function asString(value: unknown, max: number, field: string): string {
  if (typeof value !== "string") {
    throw new functions.https.HttpsError(
      "invalid-argument",
      `Field '${field}' must be a string.`
    );
  }
  if (value.length === 0 || value.length > max) {
    throw new functions.https.HttpsError(
      "invalid-argument",
      `Field '${field}' length must be 1-${max} characters.`
    );
  }
  if (/[\u0000-\u001F\u007F]/.test(value)) {
    throw new functions.https.HttpsError(
      "invalid-argument",
      `Field '${field}' contains control characters.`
    );
  }
  return value;
}

function asNumber(value: unknown, field: string, min = 0, max = Number.MAX_SAFE_INTEGER): number {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new functions.https.HttpsError(
      "invalid-argument",
      `Field '${field}' must be a number.`
    );
  }
  if (value < min || value > max) {
    throw new functions.https.HttpsError(
      "invalid-argument",
      `Field '${field}' must be between ${min} and ${max}.`
    );
  }
  return value;
}

function validateEntry(raw: unknown): Record<string, unknown> {
  if (!raw || typeof raw !== "object") {
    throw new functions.https.HttpsError("invalid-argument", "Entry must be an object.");
  }
  const entry = raw as Record<string, unknown>;

  const id = asString(entry.id, ID_MAX, "id");
  if (id.startsWith("seed-")) {
    throw new functions.https.HttpsError("invalid-argument", "Seed entries cannot be submitted.");
  }
  const playerName = asString(entry.playerName, PLAYER_NAME_MAX, "playerName");
  const gameMode = asString(entry.gameMode, 32, "gameMode");
  if (!ALLOWED_GAME_MODES.has(gameMode)) {
    throw new functions.https.HttpsError("invalid-argument", "Unknown gameMode.");
  }
  const continentFilter = asString(entry.continentFilter, 32, "continentFilter");
  if (!ALLOWED_CONTINENTS.has(continentFilter)) {
    throw new functions.https.HttpsError("invalid-argument", "Unknown continentFilter.");
  }
  const timerMode = asString(entry.timerMode, 32, "timerMode");
  if (!ALLOWED_TIMER_MODES.has(timerMode)) {
    throw new functions.https.HttpsError("invalid-argument", "Unknown timerMode.");
  }
  let edition = "world";
  if (entry.edition !== undefined) {
    const rawEdition = asString(entry.edition, 32, "edition");
    if (!ALLOWED_EDITIONS.has(rawEdition)) {
      throw new functions.https.HttpsError("invalid-argument", "Unknown edition.");
    }
    edition = rawEdition;
  }
  let usRegionFilter: string | undefined = undefined;
  if (entry.usRegionFilter !== undefined) {
    const rawRegion = asString(entry.usRegionFilter, 32, "usRegionFilter");
    if (!ALLOWED_US_REGIONS.has(rawRegion)) {
      throw new functions.https.HttpsError("invalid-argument", "Unknown usRegionFilter.");
    }
    usRegionFilter = rawRegion;
  }
  const totalCountries = asNumber(entry.totalCountries, "totalCountries", 1, 1000);
  const conqueredCount = asNumber(entry.conqueredCount, "conqueredCount", 1, totalCountries);
  const mistakesCount = asNumber(entry.mistakesCount, "mistakesCount", 0, totalCountries);
  const accuracy = asNumber(entry.accuracy, "accuracy", 0, 100);
  const timeElapsedSeconds = asNumber(entry.timeElapsedSeconds, "timeElapsedSeconds", 0, 24 * 3600);
  const bestStreak = asNumber(entry.bestStreak, "bestStreak", 0, totalCountries);
  const rankBadge = asString(entry.rankBadge, 4, "rankBadge");
  if (!ALLOWED_RANK_BADGES.has(rankBadge)) {
    throw new functions.https.HttpsError("invalid-argument", "Unknown rankBadge.");
  }
  const date = asString(entry.date, 40, "date");

  return {
    id,
    playerName,
    edition,
    gameMode,
    continentFilter,
    ...(usRegionFilter ? { usRegionFilter } : {}),
    timerMode,
    totalCountries,
    conqueredCount,
    mistakesCount,
    accuracy,
    timeElapsedSeconds,
    bestStreak,
    rankBadge,
    date,
  };
}

async function enforceRateLimit(uid: string): Promise<void> {
  const now = Date.now();
  const cutoff = admin.firestore.Timestamp.fromMillis(now - RATE_WINDOW_MS);
  const recent = await db
    .collection(LEADERBOARD_COLLECTION)
    .where("__rateLimitOwner", "==", uid)
    .where("__rateLimitAt", ">", cutoff)
    .get();
  if (recent.size >= RATE_MAX_PER_WINDOW) {
    throw new functions.https.HttpsError(
      "resource-exhausted",
      "Too many submissions. Please wait before submitting again."
    );
  }
}

function requireAuth(req: CallableRequest): string {
  if (!req.auth) {
    throw new functions.https.HttpsError("unauthenticated", "Sign in is required.");
  }
  return req.auth.uid;
}

function requireAdmin(req: CallableRequest): string {
  const uid = requireAuth(req);
  if (req.auth?.token.admin !== true) {
    throw new functions.https.HttpsError("permission-denied", "Admin privilege required.");
  }
  return uid;
}

export const submitScore = functions.https.onCall(async (req: CallableRequest) => {
  const uid = requireAuth(req);
  const cleaned = validateEntry((req.data as { entry?: unknown } | undefined)?.entry);
  await enforceRateLimit(uid);

  const stamped: Record<string, unknown> = {
    ...cleaned,
    __rateLimitOwner: uid,
    __rateLimitAt: admin.firestore.FieldValue.serverTimestamp(),
    submittedAt: admin.firestore.FieldValue.serverTimestamp(),
  };

  await db.collection(LEADERBOARD_COLLECTION).doc(String(cleaned.id)).set(stamped);
  return { ok: true, id: cleaned.id };
});

export const adminClearLeaderboard = functions.https.onCall(async (req: CallableRequest) => {
  requireAdmin(req);
  const snapshot = await db.collection(LEADERBOARD_COLLECTION).get();
  const batch = db.batch();
  snapshot.forEach((doc) => batch.delete(doc.ref));
  await batch.commit();
  return { ok: true, deleted: snapshot.size };
});

export const setAdminClaim = functions.https.onCall(async (req: CallableRequest) => {
  requireAdmin(req);
  const data = req.data as { uid?: unknown; enable?: unknown } | undefined;
  const targetUid = asString(data?.uid, 128, "uid");
  const enable = Boolean(data?.enable);
  await admin.auth().setCustomUserClaims(targetUid, enable ? { admin: true } : { admin: false });
  return { ok: true, uid: targetUid, admin: enable };
});

export const setAdminPassword = functions.https.onCall(async (req: CallableRequest) => {
  requireAdmin(req);
  const data = req.data as { password?: unknown } | undefined;
  const password = asString(data?.password, 128, "password");
  await db.collection(ADMIN_COLLECTION).doc(ADMIN_AUTH_DOC).set({
    password,
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    updatedBy: req.auth!.uid,
  });
  return { ok: true };
});

export const verifyAdminPassword = functions.https.onCall(async (req: CallableRequest) => {
  const uid = requireAuth(req);
  const data = req.data as { password?: unknown } | undefined;
  const attempt = asString(data?.password, 128, "password");
  const snap = await db.collection(ADMIN_COLLECTION).doc(ADMIN_AUTH_DOC).get();
  if (!snap.exists) {
    throw new functions.https.HttpsError("not-found", "No admin credentials configured.");
  }
  const stored = (snap.data()?.password as string | undefined) ?? "";
  if (stored.trim() !== attempt.trim()) {
    throw new functions.https.HttpsError("permission-denied", "Incorrect administrator password.");
  }
  await admin.auth().setCustomUserClaims(uid, { admin: true });
  return { ok: true };
});
