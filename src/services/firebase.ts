import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import {
  getFirestore,
  collection,
  doc,
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
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || 'guess-the-country-7d719.firebaseapp.com',
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || 'guess-the-country-7d719',
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || 'guess-the-country-7d719.firebasestorage.app',
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '218564015880',
  appId: import.meta.env.VITE_FIREBASE_APP_ID || '1:218564015880:web:a507448942db60c0095ebd',
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

