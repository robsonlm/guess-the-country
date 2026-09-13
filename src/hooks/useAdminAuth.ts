import { useEffect, useState, useCallback } from 'react';
import { onAuthChanged, isCurrentUserAdmin, signInAdmin, signOutCurrent, ensureSignedIn } from '../services/firebase';

export interface UseAdminAuth {
  isAdmin: boolean;
  userEmail: string | null;
  ready: boolean;
  signInAsAdmin: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  signOut: () => Promise<void>;
}

// Global singleton state so all components are always synchronized
let globalIsAdmin = false;
let globalUserEmail: string | null = null;
let globalReady = false;
const subscribers = new Set<() => void>();

function notifyAll() {
  subscribers.forEach((cb) => {
    try {
      cb();
    } catch {
      // ignore subscriber errors
    }
  });
}

let listenerInitialized = false;
function initAuthListener() {
  if (listenerInitialized) return;
  listenerInitialized = true;

  onAuthChanged(async (user) => {
    if (!user) {
      globalIsAdmin = false;
      globalUserEmail = null;
      globalReady = true;
      notifyAll();
      return;
    }
    globalUserEmail = user.email ?? user.providerData?.[0]?.email ?? null;
    try {
      const admin = await isCurrentUserAdmin();
      globalIsAdmin = admin;
    } catch {
      globalIsAdmin = false;
    }
    globalReady = true;
    notifyAll();
  });

  ensureSignedIn().catch(() => {});
}

export function useAdminAuth(): UseAdminAuth {
  initAuthListener();

  const [isAdmin, setIsAdmin] = useState<boolean>(globalIsAdmin);
  const [userEmail, setUserEmail] = useState<string | null>(globalUserEmail);
  const [ready, setReady] = useState<boolean>(globalReady);

  useEffect(() => {
    const update = () => {
      setIsAdmin(globalIsAdmin);
      setUserEmail(globalUserEmail);
      setReady(globalReady);
    };
    subscribers.add(update);
    update();
    return () => {
      subscribers.delete(update);
    };
  }, []);

  const signInAsAdmin = useCallback(async (email: string, password: string) => {
    if (!email.trim() || !password) {
      return { success: false, error: 'Email and password are required.' };
    }
    try {
      await signInAdmin(email, password);
      const admin = await isCurrentUserAdmin();
      globalIsAdmin = admin;
      globalUserEmail = email.trim();
      globalReady = true;
      notifyAll();
      if (!admin) {
        await signOutCurrent();
        globalIsAdmin = false;
        globalUserEmail = null;
        notifyAll();
        return { success: false, error: 'This account does not have administrator privileges.' };
      }
      return { success: true };
    } catch (err: any) {
      const code = err?.code as string | undefined;
      const message =
        code === 'auth/invalid-credential' || code === 'auth/wrong-password' || code === 'auth/user-not-found'
          ? 'Invalid email or password.'
          : code === 'auth/too-many-requests'
          ? 'Too many attempts. Please wait and try again.'
          : err?.message || 'Sign-in failed.';
      return { success: false, error: message };
    }
  }, []);

  const signOut = useCallback(async () => {
    await signOutCurrent();
    globalIsAdmin = false;
    globalUserEmail = null;
    notifyAll();
  }, []);

  return { isAdmin, userEmail, ready, signInAsAdmin, signOut };
}
