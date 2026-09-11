import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import {
  getFirestore,
  collection,
  doc,
  getDoc,
  setDoc,
  getDocs,
  deleteDoc,
  onSnapshot,
  query,
  orderBy,
  limit,
  Firestore,
} from 'firebase/firestore';
import { LeaderboardEntry } from './leaderboard';

/**
 * ============================================================================
 * FIREBASE CONFIGURATION — guess-the-country-7d719
 * ============================================================================
 * Connected to Firebase project: guess-the-country-7d719
 * Web App: guess-the-country-web (1:218564015880:web:a507448942db60c0095ebd)
 * ============================================================================
 */
export const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || '',
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || '',
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || '',
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || '',
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '',
  appId: import.meta.env.VITE_FIREBASE_APP_ID || '',
};

/**
 * Checks if real Firebase credentials have been configured.
 */
export function isFirebaseConfigured(): boolean {
  return (
    Boolean(firebaseConfig.apiKey) &&
    firebaseConfig.apiKey !== 'YOUR_API_KEY_HERE' &&
    Boolean(firebaseConfig.projectId) &&
    firebaseConfig.projectId !== 'YOUR_PROJECT_ID'
  );
}

let app: FirebaseApp | null = null;
let db: Firestore | null = null;

if (isFirebaseConfigured()) {
  try {
    app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
    db = getFirestore(app);
  } catch (err) {
    console.warn('[Firebase] Initialization notice:', err);
  }
}

/**
 * Performs a lightweight ping against Firestore to verify the project is
 * reachable and credentials are valid. Uses a hard timeout so a stalled
 * network does not lock the app on a blank loader.
 *
 * Returns `{ success: true }` when the round-trip completes without an
 * error, `{ success: false, error }` otherwise. A missing Firebase
 * configuration is treated as a failure (the game refuses to boot).
 */
export async function testFirebaseConnection(
  timeoutMs: number = 6000
): Promise<{ success: boolean; error?: string }> {
  if (!db || !isFirebaseConfigured()) {
    return {
      success: false,
      error:
        'Firebase is not configured. Set VITE_FIREBASE_* environment variables before starting the game.',
    };
  }

  let timedOut = false;
  const timeout = new Promise<{ success: boolean; error: string }>((resolve) => {
    setTimeout(() => {
      timedOut = true;
      resolve({
        success: false,
        error: `Could not reach Firebase within ${timeoutMs}ms. Check your network connection.`,
      });
    }, timeoutMs);
  });

  const ping = (async () => {
    try {
      // Tiny read against a collection the rules allow reading.
      // limit(1) keeps the payload negligible.
      const q = query(collection(db!, 'leaderboard'), limit(1));
      await getDocs(q);
      return { success: true as const };
    } catch (err: any) {
      const message =
        err?.code === 'permission-denied'
          ? "Firebase denied the request. Update Firestore rules to allow reading the 'leaderboard' collection."
          : err?.message || 'Unknown Firebase error.';
      return { success: false as const, error: message };
    }
  })();

  const result = await Promise.race([ping, timeout]);
  if (timedOut) return result;

  if (result.success) return { success: true };
  return { success: false, error: result.error };
}

/**
 * Listens in real-time to global leaderboard updates from Firebase Firestore.
 * Triggers callback immediately and on every new score submitted worldwide.
 */
export function subscribeToFirebaseLeaderboard(
  onUpdate: (entries: LeaderboardEntry[]) => void,
  onError?: (err: Error) => void
): () => void {
  if (!db || !isFirebaseConfigured()) {
    return () => {};
  }

  try {
    const q = query(collection(db, 'leaderboard'), orderBy('date', 'desc'), limit(500));
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const entries: LeaderboardEntry[] = [];
        snapshot.forEach((docSnap) => {
          const data = docSnap.data() as LeaderboardEntry;
          if (data && data.id && data.playerName) {
            if (data.id.startsWith('seed-')) {
              // Auto-purge any stale seed entries that might have been uploaded by old clients
              deleteDoc(docSnap.ref).catch(() => {});
            } else {
              entries.push(data);
            }
          }
        });
        onUpdate(entries);
      },
      (error) => {
        console.warn('[Firebase Firestore] Real-time subscription error:', error);
        if (onError) onError(error);
      }
    );
    return unsubscribe;
  } catch (err) {
    console.warn('[Firebase] Listener error:', err);
    return () => {};
  }
}

/**
 * Saves a new score entry to Firebase Firestore so all players across all devices can see it.
 */
export async function saveEntryToFirebase(entry: LeaderboardEntry): Promise<boolean> {
  if (!db || !isFirebaseConfigured() || entry.id.startsWith('seed-')) {
    return false;
  }

  try {
    const docRef = doc(db, 'leaderboard', entry.id);
    await setDoc(docRef, entry);
    return true;
  } catch (err) {
    console.warn('[Firebase] Failed to write entry to Firestore:', err);
    return false;
  }
}

/**
 * Fetches all global leaderboard entries from Firebase Firestore (one-time).
 */
export async function fetchFirebaseLeaderboard(): Promise<LeaderboardEntry[]> {
  if (!db || !isFirebaseConfigured()) {
    return [];
  }

  try {
    const q = query(collection(db, 'leaderboard'), orderBy('date', 'desc'), limit(500));
    const querySnapshot = await getDocs(q);
    const entries: LeaderboardEntry[] = [];
    querySnapshot.forEach((docSnap) => {
      const data = docSnap.data() as LeaderboardEntry;
      if (data && data.id && data.playerName) {
        if (data.id.startsWith('seed-')) {
          deleteDoc(docSnap.ref).catch(() => {});
        } else {
          entries.push(data);
        }
      }
    });
    return entries;
  } catch (err) {
    console.warn('[Firebase] Failed to fetch leaderboard:', err);
    return [];
  }
}

/**
 * Clears all entries from Firebase Firestore leaderboard collection.
 */
export async function clearFirebaseLeaderboard(): Promise<boolean> {
  if (!db || !isFirebaseConfigured()) {
    return false;
  }
  try {
    const q = query(collection(db, 'leaderboard'));
    const snapshot = await getDocs(q);
    const deletePromises = snapshot.docs.map((docSnap) => deleteDoc(docSnap.ref));
    await Promise.all(deletePromises);
    return true;
  } catch (err) {
    console.warn('[Firebase] Failed to clear leaderboard:', err);
    return false;
  }
}

/**
 * Verifies the admin password against the Firebase Firestore 'admin' collection.
 * The password is stored in Firestore (e.g. collection: 'admin', document: 'auth', field: 'password' or 'passkey').
 * Zero hardcoded passwords exist in client code.
 */
export async function verifyAdminPassword(
  passwordAttempt: string
): Promise<{ success: boolean; error?: string }> {
  if (!db || !isFirebaseConfigured()) {
    return {
      success: false,
      error: 'Firebase is not configured. Please check your environment variables.',
    };
  }

  const cleanAttempt = passwordAttempt.trim();
  if (!cleanAttempt) {
    return { success: false, error: 'Please enter a password.' };
  }

  try {
    // 1. Check primary 'auth' document in 'admin' collection
    const docRef = doc(db, 'admin', 'auth');
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
      const data = docSnap.data();
      const storedPassword = data.password || data.passkey || data.code;
      if (storedPassword && String(storedPassword).trim() === cleanAttempt) {
        return { success: true };
      }
      return { success: false, error: 'Incorrect administrator password.' };
    }

    // 2. Fallback: check any document in 'admin' collection (e.g. 'config' or auto ID)
    const adminCol = collection(db, 'admin');
    const colSnap = await getDocs(adminCol);

    if (!colSnap.empty) {
      for (const d of colSnap.docs) {
        const data = d.data();
        const storedPassword = data.password || data.passkey || data.code;
        if (storedPassword && String(storedPassword).trim() === cleanAttempt) {
          return { success: true };
        }
      }
      return { success: false, error: 'Incorrect administrator password.' };
    }

    // 3. Collection read succeeded, but no documents exist yet in 'admin'
    return {
      success: false,
      error:
        "No administrator credentials found in Firebase 'admin' collection. In Firebase Console, create a document in 'admin' with field 'password'.",
    };
  } catch (err: any) {
    console.error('[Firebase] verifyAdminPassword error:', err);
    if (err.code === 'permission-denied') {
      return {
        success: false,
        error:
          "Firebase permission denied for 'admin' collection. In Firebase Console > Firestore Rules, add: match /admin/{document=**} { allow read: if true; }",
      };
    }
    return {
      success: false,
      error: err.message || 'Failed to authenticate with Firebase.',
    };
  }
}

/**
 * Helper to initialize or update admin password in Firestore 'admin' collection.
 */
export async function setFirebaseAdminPassword(
  password: string
): Promise<{ success: boolean; error?: string }> {
  if (!db || !isFirebaseConfigured()) {
    return { success: false, error: 'Firebase not configured.' };
  }

  try {
    await setDoc(doc(db, 'admin', 'auth'), {
      password: password.trim(),
      updatedAt: new Date().toISOString(),
    });
    return { success: true };
  } catch (err: any) {
    return {
      success: false,
      error: err.message || 'Failed to save admin password in Firebase.',
    };
  }
}

