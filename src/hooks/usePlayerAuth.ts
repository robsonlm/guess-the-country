import { useEffect, useState, useCallback } from 'react';
import { User } from 'firebase/auth';
import {
  onAuthChanged,
  isCurrentUserAdmin,
  signInPlayer,
  signInWithGoogle,
  registerPlayer,
  signOutCurrent,
  getCurrentUser,
  ensureSignedIn,
  syncUserProfile,
  getStoredAuthUser,
  setStoredAuthUser,
  clearStoredAuthUser,
} from '../services/firebase';

export interface UsePlayerAuth {
  user: User | null;
  isLoggedIn: boolean;
  playerName: string;
  userEmail: string | null;
  userPhotoUrl: string | null;
  providerId: string | null;
  isAdmin: boolean;
  ready: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  loginWithGoogle: () => Promise<{ success: boolean; error?: string }>;
  register: (
    email: string,
    password: string,
    displayName: string
  ) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
}

// Global shared state
let globalUser: User | null = null;
let globalIsAdmin = false;
let globalReady = false;
const subscribers = new Set<() => void>();

function notifyAll() {
  subscribers.forEach((cb) => {
    try {
      cb();
    } catch {
      // ignore errors
    }
  });
}

let listenerInitialized = false;
function initAuthListener() {
  if (listenerInitialized) return;
  listenerInitialized = true;

  onAuthChanged(async (user) => {
    globalUser = user;
    if (!user || user.isAnonymous) {
      clearStoredAuthUser();
      globalIsAdmin = false;
      globalReady = true;
      notifyAll();
      return;
    }
    try {
      await syncUserProfile(user);
    } catch {
      // ignore
    }
    let admin = false;
    try {
      admin = await isCurrentUserAdmin();
      globalIsAdmin = admin;
    } catch {
      globalIsAdmin = false;
    }
    setStoredAuthUser({
      uid: user.uid,
      email: user.email ?? null,
      displayName: user.displayName?.trim() || user.email?.split('@')[0] || 'World Explorer',
      photoURL: user.photoURL ?? null,
      providerId: user.providerData?.[0]?.providerId || 'password',
      isAdmin: admin,
    });
    globalReady = true;
    notifyAll();
  });

  // Ensure initial reachability
  ensureSignedIn().catch(() => {});
}

export function usePlayerAuth(): UsePlayerAuth {
  initAuthListener();

  const initialCache = getStoredAuthUser();
  const [user, setUser] = useState<User | null>(globalUser ?? getCurrentUser());
  const [isAdmin, setIsAdmin] = useState<boolean>(() => globalIsAdmin || Boolean(initialCache?.isAdmin));
  const [ready, setReady] = useState<boolean>(globalReady);

  useEffect(() => {
    const update = () => {
      setUser(globalUser);
      setIsAdmin(globalIsAdmin);
      setReady(globalReady);
    };
    subscribers.add(update);
    update();
    return () => {
      subscribers.delete(update);
    };
  }, []);

  const isLoggedIn = Boolean((user && !user.isAnonymous) || (!ready && initialCache?.uid));
  const playerName =
    user?.displayName?.trim() ||
    user?.email?.split('@')[0] ||
    initialCache?.displayName ||
    'World Explorer';
  const userEmail = user?.email ?? initialCache?.email ?? null;
  const userPhotoUrl = user?.photoURL ?? initialCache?.photoURL ?? null;
  const providerId =
    user?.providerData?.[0]?.providerId ||
    initialCache?.providerId ||
    (user?.isAnonymous ? 'anonymous' : 'password');

  const login = useCallback(async (email: string, password: string) => {
    if (!email.trim() || !password) {
      return { success: false, error: 'Email and password are required.' };
    }
    try {
      const loggedUser = await signInPlayer(email, password);
      globalUser = loggedUser;
      const admin = await isCurrentUserAdmin();
      globalIsAdmin = admin;
      globalReady = true;
      notifyAll();
      return { success: true };
    } catch (err: any) {
      const code = err?.code as string | undefined;
      const message =
        code === 'auth/invalid-credential' ||
        code === 'auth/wrong-password' ||
        code === 'auth/user-not-found'
          ? 'Invalid email or password.'
          : code === 'auth/too-many-requests'
          ? 'Too many attempts. Please wait a moment and try again.'
          : code === 'auth/invalid-email'
          ? 'Please enter a valid email address.'
          : err?.message || 'Login failed.';
      return { success: false, error: message };
    }
  }, []);

  const register = useCallback(
    async (email: string, password: string, displayName: string) => {
      const cleanEmail = email.trim();
      const cleanName = displayName.trim();
      if (!cleanEmail || !password) {
        return { success: false, error: 'Email and password are required.' };
      }
      if (!cleanName) {
        return { success: false, error: 'Please choose an Explorer Call Sign (name).' };
      }
      if (password.length < 6) {
        return { success: false, error: 'Password must be at least 6 characters.' };
      }
      try {
        const newUser = await registerPlayer(cleanEmail, password, cleanName);
        globalUser = newUser;
        const admin = await isCurrentUserAdmin();
        globalIsAdmin = admin;
        globalReady = true;
        notifyAll();
        return { success: true };
      } catch (err: any) {
        const code = err?.code as string | undefined;
        const message =
          code === 'auth/email-already-in-use'
            ? 'An account with this email already exists. Please sign in.'
            : code === 'auth/weak-password'
            ? 'Password is too weak. Please use at least 6 characters.'
            : code === 'auth/invalid-email'
            ? 'Please enter a valid email address.'
            : err?.message || 'Registration failed.';
        return { success: false, error: message };
      }
    },
    []
  );

  const loginWithGoogle = useCallback(async () => {
    try {
      const loggedUser = await signInWithGoogle();
      globalUser = loggedUser;
      const admin = await isCurrentUserAdmin();
      globalIsAdmin = admin;
      globalReady = true;
      notifyAll();
      return { success: true };
    } catch (err: any) {
      const code = err?.code as string | undefined;
      const message =
        code === 'auth/popup-closed-by-user'
          ? 'Sign-in was cancelled.'
          : code === 'auth/cancelled-popup-request'
          ? 'Only one sign-in window allowed at a time.'
          : code === 'auth/popup-blocked'
          ? 'Sign-in popup was blocked by your browser. Please allow popups.'
          : err?.message || 'Google sign-in failed.';
      return { success: false, error: message };
    }
  }, []);

  const logout = useCallback(async () => {
    clearStoredAuthUser();
    await signOutCurrent();
    globalUser = null;
    globalIsAdmin = false;
    globalReady = true;
    notifyAll();
  }, []);

  return {
    user,
    isLoggedIn,
    playerName,
    userEmail,
    userPhotoUrl,
    providerId,
    isAdmin,
    ready,
    login,
    loginWithGoogle,
    register,
    logout,
  };
}
