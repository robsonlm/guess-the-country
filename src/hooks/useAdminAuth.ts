import { useEffect, useState, useCallback } from 'react';
import { onAuthChanged, isCurrentUserAdmin, signInAdmin, signOutCurrent, ensureSignedIn } from '../services/firebase';

export interface UseAdminAuth {
  isAdmin: boolean;
  userEmail: string | null;
  ready: boolean;
  signInAsAdmin: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  signOut: () => Promise<void>;
}

export function useAdminAuth(): UseAdminAuth {
  const [isAdmin, setIsAdmin] = useState<boolean>(false);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [ready, setReady] = useState<boolean>(false);

  useEffect(() => {
    let cancelled = false;
    const refresh = async () => {
      try {
        const admin = await isCurrentUserAdmin();
        if (!cancelled) {
          setIsAdmin(admin);
          setUserEmail(admin ? getCurrentEmail() : null);
        }
      } catch {
        if (!cancelled) {
          setIsAdmin(false);
          setUserEmail(null);
        }
      } finally {
        if (!cancelled) setReady(true);
      }
    };

    const unsub = onAuthChanged((user) => {
      if (!user) {
        setIsAdmin(false);
        setUserEmail(null);
        setReady(true);
        return;
      }
      setUserEmail(user.email ?? user.providerData?.[0]?.email ?? null);
      refresh();
    });

    ensureSignedIn()
      .catch(() => {})
      .finally(() => {
        if (!cancelled) refresh();
      });

    return () => {
      cancelled = true;
      unsub();
    };
  }, []);

  const signInAsAdmin = useCallback(async (email: string, password: string) => {
    if (!email.trim() || !password) {
      return { success: false, error: 'Email and password are required.' };
    }
    try {
      await signInAdmin(email, password);
      const admin = await isCurrentUserAdmin();
      if (!admin) {
        await signOutCurrent();
        setIsAdmin(false);
        return { success: false, error: 'This account does not have administrator privileges.' };
      }
      setIsAdmin(true);
      setUserEmail(email.trim());
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
    setIsAdmin(false);
    setUserEmail(null);
  }, []);

  return { isAdmin, userEmail, ready, signInAsAdmin, signOut };
}

function getCurrentEmail(): string | null {
  if (typeof window === 'undefined') return null;
  return null;
}
