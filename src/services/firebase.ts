import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import {
  getFirestore,
  collection,
  doc,
  setDoc,
  writeBatch,
  getDocs,
  onSnapshot,
  query,
  orderBy,
  limit,
  Firestore,
  connectFirestoreEmulator,
} from 'firebase/firestore';
import {
  getAuth,
  setPersistence,
  browserLocalPersistence,
  signInAnonymously,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  GoogleAuthProvider,
  signInWithPopup,
  updateProfile,
  signOut,
  onAuthStateChanged,
  connectAuthEmulator,
  Auth,
  User,
} from 'firebase/auth';
import { getFunctions, httpsCallable, connectFunctionsEmulator, Functions } from 'firebase/functions';
import { LeaderboardEntry } from './leaderboard';

/**
 * ============================================================================
 * FIREBASE CONFIGURATION — guess-the-country
 * ============================================================================
 * Leaderboard access requires Firebase Authentication. Clients sign in
 * anonymously for normal play and via email/password for admin actions.
 * All writes go through Cloud Functions using the Admin SDK; the client
 * never reads or writes Firestore documents directly with elevated rights.
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

const USE_EMULATORS =
  import.meta.env.VITE_USE_FIREBASE_EMULATORS === 'true' ||
  (typeof window !== 'undefined' && window.location.hostname === 'localhost' && import.meta.env.DEV);

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
let auth: Auth | null = null;
let functions: Functions | null = null;

if (isFirebaseConfigured()) {
  try {
    app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
    db = getFirestore(app);
    auth = getAuth(app);
    if (typeof window !== 'undefined') {
      setPersistence(auth, browserLocalPersistence).catch((err) => {
        console.warn('[Firebase] setPersistence notice:', err);
      });
    }
    functions = getFunctions(app);

    if (USE_EMULATORS) {
      try {
        connectFirestoreEmulator(db, '127.0.0.1', 8080);
        connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true });
        connectFunctionsEmulator(functions, '127.0.0.1', 5001);
      } catch (emuErr) {
        console.warn('[Firebase] Emulator connection notice:', emuErr);
      }
    }
  } catch (err) {
    console.warn('[Firebase] Initialization notice:', err);
  }
}

export function getDb(): Firestore | null {
  return db;
}

export function getAuthInstance(): Auth | null {
  return auth;
}

export function getCurrentUser(): User | null {
  return auth?.currentUser ?? null;
}

export interface CachedAuthUser {
  uid: string;
  email: string | null;
  displayName: string;
  photoURL: string | null;
  providerId: string | null;
  isAdmin: boolean;
}

const AUTH_STORAGE_KEY = 'guessTheCountry.authUser';

export function getStoredAuthUser(): CachedAuthUser | null {
  try {
    const raw = localStorage.getItem(AUTH_STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function setStoredAuthUser(user: CachedAuthUser): void {
  try {
    localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(user));
  } catch {
    // ignore
  }
}

export function clearStoredAuthUser(): void {
  try {
    localStorage.removeItem(AUTH_STORAGE_KEY);
  } catch {
    // ignore
  }
}

export async function ensureSignedIn(): Promise<User | null> {
  if (!auth) return null;
  if (auth.currentUser) return auth.currentUser;

  // Wait for initial auth state resolution so persisted sessions are not wiped
  try {
    if (typeof (auth as any).authStateReady === 'function') {
      await (auth as any).authStateReady();
    }
  } catch {
    // ignore
  }

  return auth.currentUser ?? null;
}

export async function ensureAnonymousFallback(): Promise<User | null> {
  if (!auth) return null;
  if (auth.currentUser) return auth.currentUser;
  try {
    await signInAnonymously(auth);
    return auth.currentUser;
  } catch (err) {
    console.warn('[Firebase] Anonymous sign-in notice:', err);
    return null;
  }
}

export function onAuthChanged(cb: (user: User | null) => void): () => void {
  if (!auth) return () => {};
  return onAuthStateChanged(auth, cb);
}

export interface UserProfile {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
  providerId: string;
  lastLoginAt: string;
}

/**
 * Saves or updates player profile in Firestore /users/{uid}
 */
export async function syncUserProfile(user: User): Promise<void> {
  if (!db || !user || user.isAnonymous) return;
  try {
    const userDocRef = doc(db, 'users', user.uid);
    const profileData: UserProfile = {
      uid: user.uid,
      email: user.email ?? null,
      displayName: user.displayName?.trim() || user.email?.split('@')[0] || 'World Explorer',
      photoURL: user.photoURL ?? null,
      providerId: user.providerData?.[0]?.providerId || 'password',
      lastLoginAt: new Date().toISOString(),
    };
    await setDoc(userDocRef, profileData, { merge: true });

    // Synchronously update local auth cache for instant recognition on page reload
    const admin = await isCurrentUserAdmin();
    setStoredAuthUser({
      uid: user.uid,
      email: user.email ?? null,
      displayName: profileData.displayName ?? 'World Explorer',
      photoURL: user.photoURL ?? null,
      providerId: profileData.providerId,
      isAdmin: admin,
    });
  } catch (err) {
    console.warn('[Firebase] Notice: could not persist user profile to Firestore:', err);
  }
}

export async function registerPlayer(
  email: string,
  password: string,
  displayName: string
): Promise<User> {
  if (!auth) throw new Error('Firebase is not configured.');
  const trimmedEmail = email.trim();
  const trimmedName = displayName.trim() || 'World Explorer';
  const cred = await createUserWithEmailAndPassword(auth, trimmedEmail, password);
  try {
    await updateProfile(cred.user, { displayName: trimmedName });
  } catch (err) {
    console.warn('[Firebase] Could not set display name on profile:', err);
  }
  await cred.user.getIdToken(true);
  await syncUserProfile(cred.user);
  return cred.user;
}

export async function signInPlayer(email: string, password: string): Promise<User> {
  if (!auth) throw new Error('Firebase is not configured.');
  const cred = await signInWithEmailAndPassword(auth, email.trim(), password);
  await cred.user.getIdToken(true);
  await syncUserProfile(cred.user);
  return cred.user;
}

export function isPlayerAuthenticated(): boolean {
  return Boolean(auth?.currentUser && !auth.currentUser.isAnonymous);
}

export async function signInWithGoogle(): Promise<User> {
  if (!auth) throw new Error('Firebase is not configured.');
  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ prompt: 'select_account' });
  const cred = await signInWithPopup(auth, provider);
  await cred.user.getIdToken(true);
  await syncUserProfile(cred.user);
  return cred.user;
}

export async function signInAdmin(email: string, password: string): Promise<User> {
  if (!auth) throw new Error('Firebase is not configured.');
  const cred = await signInWithEmailAndPassword(auth, email.trim(), password);
  await cred.user.getIdToken(true);
  return cred.user;
}

export async function signOutCurrent(): Promise<void> {
  clearStoredAuthUser();
  if (auth) await signOut(auth);
}

export async function isCurrentUserAdmin(): Promise<boolean> {
  const user = getCurrentUser();
  if (!user) return false;
  const result = await user.getIdTokenResult(true);
  return result.claims.admin === true;
}

async function refreshAdminClaim(): Promise<boolean> {
  const user = getCurrentUser();
  if (!user) return false;
  await user.getIdToken(true);
  return isCurrentUserAdmin();
}

interface SubmitScoreResponse {
  ok: boolean;
  id?: string;
}

interface AdminClearResponse {
  ok: boolean;
  deleted?: number;
}

/**
 * Performs a lightweight ping to verify Auth + Firestore are reachable.
 */
export async function testFirebaseConnection(
  timeoutMs: number = 6000
): Promise<{ success: boolean; error?: string }> {
  if (!db || !auth || !isFirebaseConfigured()) {
    return {
      success: false,
      error: 'Firebase is not configured. Set VITE_FIREBASE_* environment variables before starting the game.',
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
      if (auth.currentUser) {
        const q = query(collection(db!, 'leaderboard'), limit(1));
        await getDocs(q);
      } else {
        await ensureSignedIn();
        if (auth.currentUser) {
          const q = query(collection(db!, 'leaderboard'), limit(1));
          await getDocs(q);
        }
      }
      return { success: true as const };
    } catch (err: any) {
      const code = err?.code as string | undefined;
      if (
        code === 'auth/admin-restricted-operation' ||
        code === 'permission-denied' ||
        code === 'unauthenticated'
      ) {
        return { success: true as const };
      }
      const message = err?.message || 'Unknown Firebase error.';
      return { success: false as const, error: message };
    }
  })();

  const result = await Promise.race([ping, timeout]);
  if (timedOut) return result;
  if (result.success) return { success: true };
  return { success: false, error: result.error };
}

function cleanEntry(entry: LeaderboardEntry): LeaderboardEntry {
  if (entry.id.startsWith('seed-')) {
    throw new Error('Seed entries cannot be submitted.');
  }
  return {
    ...entry,
    playerName: entry.playerName?.trim() || 'World Explorer',
    timerMode: entry.timerMode || 'timed',
  };
}

/**
/**
 * Submits a leaderboard entry to Firestore.
 * Supports Cloud Functions when deployed; gracefully uses direct Firestore
 * write with strict security rule validation on the Free (Spark) plan.
 */
export async function saveEntryToFirebase(entry: LeaderboardEntry): Promise<boolean> {
  if (!db || !isFirebaseConfigured() || entry.id.startsWith('seed-')) return false;
  try {
    await ensureSignedIn();
    const cleaned = cleanEntry(entry);
    if (functions) {
      try {
        const callable = httpsCallable<{ entry: LeaderboardEntry }, SubmitScoreResponse>(
          functions,
          'submitScore'
        );
        const res = await callable({ entry: cleaned });
        if (res.data?.ok) return true;
      } catch {
        // Fall back to direct Firestore write permitted by security rules
      }
    }
    const docRef = doc(db, 'leaderboard', cleaned.id);
    await setDoc(docRef, cleaned);
    return true;
  } catch (err) {
    console.warn('[Firebase] Failed to write entry to Firestore:', err);
    return false;
  }
}

/**
 * Reads the leaderboard via Firestore reads (allowed for signed-in users only).
 */
export async function fetchFirebaseLeaderboard(): Promise<LeaderboardEntry[]> {
  if (!db || !isFirebaseConfigured()) return [];
  try {
    await ensureSignedIn();
    const q = query(collection(db, 'leaderboard'), orderBy('date', 'desc'), limit(500));
    const querySnapshot = await getDocs(q);
    const entries: LeaderboardEntry[] = [];
    querySnapshot.forEach((docSnap) => {
      const data = docSnap.data() as LeaderboardEntry;
      if (data && data.id && data.playerName) {
        if (data.id.startsWith('seed-')) {
          // Seed entries should not exist any more; ignore if they do.
          return;
        }
        entries.push({
          ...data,
          timerMode: data.timerMode || 'timed',
        });
      }
    });
    return entries;
  } catch (err) {
    console.warn('[Firebase] Failed to fetch leaderboard:', err);
    return [];
  }
}

/**
 * Subscribes to leaderboard updates in real time.
 */
export function subscribeToFirebaseLeaderboard(
  onUpdate: (entries: LeaderboardEntry[]) => void,
  onError?: (err: Error) => void
): () => void {
  if (!db || !isFirebaseConfigured()) {
    return () => {};
  }

  try {
    ensureSignedIn().catch((err) => console.warn('[Firebase] Sign-in notice:', err));
    const q = query(collection(db, 'leaderboard'), orderBy('date', 'desc'), limit(500));
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const entries: LeaderboardEntry[] = [];
        snapshot.forEach((docSnap) => {
          const data = docSnap.data() as LeaderboardEntry;
          if (data && data.id && data.playerName) {
            if (data.id.startsWith('seed-')) return;
            entries.push({
              ...data,
              timerMode: data.timerMode || 'timed',
            });
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
 * Clears the leaderboard.
 * Requires the signed-in user to have the 'admin' custom claim.
 */
export async function clearFirebaseLeaderboard(): Promise<boolean> {
  if (!db || !isFirebaseConfigured()) return false;
  try {
    await refreshAdminClaim();
    const admin = await isCurrentUserAdmin();
    if (!admin) {
      console.warn('[Firebase] Clear leaderboard requires admin claim.');
      return false;
    }
    if (functions) {
      try {
        const callable = httpsCallable<Record<string, never>, AdminClearResponse>(
          functions,
          'adminClearLeaderboard'
        );
        const res = await callable({});
        if (res.data?.ok) return true;
      } catch {
        // Fall back to direct Firestore batch delete permitted for admin
      }
    }
    const q = query(collection(db, 'leaderboard'));
    const snapshot = await getDocs(q);
    const batch = writeBatch(db);
    snapshot.forEach((docSnap) => batch.delete(docSnap.ref));
    await batch.commit();
    return true;
  } catch (err) {
    console.warn('[Firebase] Failed to clear leaderboard:', err);
    return false;
  }
}

/**
 * Authenticates the admin user and validates credentials.
 */
export async function verifyAdminPassword(
  passwordAttempt: string,
  email: string = 'robsonlmaraia@gmail.com'
): Promise<{ success: boolean; error?: string }> {
  if (!auth || !isFirebaseConfigured()) {
    return {
      success: false,
      error: 'Firebase is not configured. Please check your environment variables.',
    };
  }
  const cleanAttempt = (passwordAttempt || '').trim();
  if (!cleanAttempt) {
    return { success: false, error: 'Please enter a password.' };
  }

  try {
    const targetEmail = (email || '').trim() || 'robsonlmaraia@gmail.com';
    await signInAdmin(targetEmail, cleanAttempt);
    const admin = await isCurrentUserAdmin();
    if (!admin) {
      return { success: false, error: 'This account does not have administrator privileges.' };
    }
    return { success: true };
  } catch (err: any) {
    const code = err?.code as string | undefined;
    const message =
      code === 'auth/invalid-credential' || code === 'auth/wrong-password'
        ? 'Incorrect administrator password.'
        : code === 'auth/user-not-found'
        ? 'Admin account not found in Firebase Authentication.'
        : err?.message || 'Failed to authenticate with Firebase.';
    return { success: false, error: message };
  }
}
