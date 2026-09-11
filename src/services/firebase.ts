import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import {
  getFirestore,
  collection,
  doc,
  setDoc,
  getDocs,
  onSnapshot,
  query,
  orderBy,
  limit,
  Firestore,
} from 'firebase/firestore';
import { LeaderboardEntry } from './leaderboard';

/**
 * ============================================================================
 * FIREBASE CONFIGURATION TEMPLATE
 * ============================================================================
 * To connect your live global leaderboard across all devices and players:
 * 1. Go to https://console.firebase.google.com/
 * 2. Create or select a project (e.g. "guess-the-country")
 * 3. In the project dashboard, add a Web App (</>) and copy the `firebaseConfig` keys.
 * 4. In the Firestore Database tab, click "Create Database" (start in test mode or open rules).
 * 5. Replace the placeholder values below (or define them in a .env.local file).
 * ============================================================================
 */
export const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || 'YOUR_API_KEY_HERE',
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || 'YOUR_PROJECT_ID.firebaseapp.com',
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || 'YOUR_PROJECT_ID',
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || 'YOUR_PROJECT_ID.appspot.com',
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || 'YOUR_MESSAGING_SENDER_ID',
  appId: import.meta.env.VITE_FIREBASE_APP_ID || 'YOUR_APP_ID',
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
            entries.push(data);
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
  if (!db || !isFirebaseConfigured()) {
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
        entries.push(data);
      }
    });
    return entries;
  } catch (err) {
    console.warn('[Firebase] Failed to fetch leaderboard:', err);
    return [];
  }
}
