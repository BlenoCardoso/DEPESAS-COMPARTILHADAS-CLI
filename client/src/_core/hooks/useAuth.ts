import { getLoginUrl, isUsingFirebase } from "@/const";
import { trpc } from "@/lib/trpc";
import { TRPCClientError } from "@trpc/client";
import { Capacitor } from "@capacitor/core";
import { GoogleAuth } from "@codetrix-studio/capacitor-google-auth";
import { useCallback, useEffect, useMemo, useState } from "react";
// Firebase (usar imports estáticos para garantir listener imediato)
import { auth, googleProvider } from "@/lib/firebase";
import {
  GoogleAuthProvider,
  onAuthStateChanged,
  signInWithCredential,
  signInWithPopup,
  signInWithRedirect,
  signOut,
  type User as FirebaseUser,
} from "firebase/auth";

type UseAuthOptions = {
  redirectOnUnauthenticated?: boolean;
  redirectPath?: string;
};

const googleWebClientId =
  import.meta.env.VITE_FIREBASE_WEB_CLIENT_ID ||
  import.meta.env.VITE_GOOGLE_WEB_CLIENT_ID ||
  "";

let loginInProgress: Promise<void> | null = null;
let sessionSyncInProgress: Promise<void> | null = null;

export function useAuth(options?: UseAuthOptions) {
  const { redirectOnUnauthenticated = false, redirectPath = getLoginUrl() } =
    options ?? {};

  // Firebase auth state
  const [firebaseUser, setFirebaseUser] = useState<any>(null);
  const [firebaseLoading, setFirebaseLoading] = useState(true);
  const [firebaseError, setFirebaseError] = useState<Error | null>(null);
  const [sessionSynced, setSessionSynced] = useState(false);

  // tRPC auth (fallback)
  const utils = trpc.useUtils();
  const usingFirebase = isUsingFirebase();
  const meQuery = trpc.auth.me.useQuery(undefined, {
    retry: false,
    refetchOnWindowFocus: false,
    enabled: !usingFirebase || (Boolean(firebaseUser) && sessionSynced),
  });

  const logoutMutation = trpc.auth.logout.useMutation({
    onSuccess: () => {
      utils.auth.me.setData(undefined, null);
    },
  });

  const syncServerSession = useCallback(
    async (user: FirebaseUser | null, options?: { forceRefresh?: boolean }) => {
      if (!usingFirebase) {
        setSessionSynced(true);
        return;
      }

      if (!user) {
        setSessionSynced(false);
        return;
      }

      if (sessionSyncInProgress) {
        return sessionSyncInProgress;
      }

      sessionSyncInProgress = (async () => {
        try {
          const idToken = await user.getIdToken(options?.forceRefresh ?? true);
          await fetch('/api/auth/firebase/session', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${idToken}`,
            },
            credentials: 'include',
            body: JSON.stringify({ idToken }),
          });
          setSessionSynced(true);
          await utils.auth.me.invalidate();
        } catch (err) {
          setSessionSynced(false);
          console.warn('[Auth] Failed to sync server session', err);
          throw err;
        } finally {
          sessionSyncInProgress = null;
        }
      })();

      return sessionSyncInProgress;
    },
    [usingFirebase, utils.auth.me]
  );

  // Firebase auth listener
  useEffect(() => {
    if (!usingFirebase) {
      setFirebaseLoading(false);
      setSessionSynced(true);
      return;
    }

    const unsubscribe = onAuthStateChanged(auth, 
      (user: any) => {
        console.log('[Firebase Auth] Auth state changed:', user ? user.email : 'signed out');
        setFirebaseUser(user);
        setFirebaseLoading(false);
        setFirebaseError(null);
        if (!user) {
          setSessionSynced(false);
        }
        
        // Persist user info for Manus Runtime
        if (user) {
          localStorage.setItem(
            "manus-runtime-user-info",
            JSON.stringify({
              id: user.uid,
              openId: user.uid,
              name: user.displayName,
              email: user.email,
              avatarUrl: user.photoURL,
              role: 'user',
            })
          );
          syncServerSession(user).catch(() => {
            /* handled via state */
          });
        } else {
          localStorage.removeItem("manus-runtime-user-info");
        }
      },
      (error: Error) => {
        console.error('[Firebase Auth] Auth error:', error);
        setFirebaseError(error);
        setFirebaseLoading(false);
      }
    );

    return () => unsubscribe();
  }, [syncServerSession, usingFirebase]);

  // Login with Google (Firebase)
  const performNativeGoogleSignIn = useCallback(async () => {
    console.log('[Firebase Auth] Native Google sign-in requested');
    if (!googleWebClientId) {
      throw new Error('VITE_FIREBASE_WEB_CLIENT_ID não configurado no build');
    }

    try {
      await GoogleAuth.initialize({
        clientId: googleWebClientId,
        scopes: ['profile', 'email'],
        grantOfflineAccess: false,
      });
    } catch (err) {
      console.warn('[Firebase Auth] GoogleAuth already initialized or unavailable', err);
    }

    try {
      await GoogleAuth.signOut();
    } catch (err) {
      console.warn('[Firebase Auth] Could not clear previous Google session', err);
    }

    const response = await GoogleAuth.signIn();
    const idToken = response?.authentication?.idToken;
    if (!idToken) {
      console.error('[Firebase Auth] Native Google sign-in did not return an ID token', response);
      throw new Error('Falha ao obter token do Google');
    }

    const credential = GoogleAuthProvider.credential(idToken);
    await signInWithCredential(auth, credential);
    console.log('[Firebase Auth] Native Google credential enviada ao Firebase');
  }, []);

  const loginWithGoogle = useCallback(async () => {
    if (!usingFirebase) {
      // Fallback para original OAuth
      window.location.href = getLoginUrl();
      return;
    }

    if (loginInProgress) {
      return loginInProgress;
    }

    const task = (async () => {
      setFirebaseLoading(true);
      setFirebaseError(null);
      
      try {
        const isNative = Capacitor?.isNativePlatform?.() ?? false;
        if (isNative) {
          await performNativeGoogleSignIn();
          return;
        }
        const result = await signInWithPopup(auth, googleProvider);
        console.log('[Firebase Auth] Login successful:', result.user.email);
        // Immediately sync session cookie
        try {
          await syncServerSession(result.user);
        } catch (err) {
          console.warn('[Auth] Failed to create server session after login', err);
        }
        // Garantir navegação para o app mesmo se algum listener atrasar
        if (typeof window !== 'undefined') {
          window.location.href = '/';
        }
      } catch (error: any) {
        console.error('[Firebase Auth] Login failed:', error);
        // Fallback: some browsers block popups. Use redirect-based sign-in.
        if (error?.code === 'auth/popup-blocked' || error?.message?.includes('popup')) {
          try {
            await signInWithRedirect(auth, googleProvider);
            return;
          } catch (redirectErr: any) {
            console.error('[Firebase Auth] Redirect login failed:', redirectErr);
            setFirebaseError(redirectErr);
            throw redirectErr;
          }
        } else {
          setFirebaseError(error);
          throw error;
        }
      } finally {
        setFirebaseLoading(false);
      }
    })();

    loginInProgress = task;

    try {
      await task;
    } finally {
      loginInProgress = null;
    }
  }, [performNativeGoogleSignIn, usingFirebase, utils.auth.me]);

  // Logout
  const logout = useCallback(async () => {
    if (usingFirebase) {
      // Firebase logout
      setFirebaseLoading(true);
      try {
        await signOut(auth);
        console.log('[Firebase Auth] Logout successful');
      } catch (error: any) {
        console.error('[Firebase Auth] Logout failed:', error);
        setFirebaseError(error);
      } finally {
        setFirebaseLoading(false);
        setSessionSynced(false);
        utils.auth.me.setData(undefined, null);
      }
    } else {
      // tRPC logout
      try {
        await logoutMutation.mutateAsync();
      } catch (error: unknown) {
        if (
          error instanceof TRPCClientError &&
          error.data?.code === "UNAUTHORIZED"
        ) {
          return;
        }
        throw error;
      } finally {
        utils.auth.me.setData(undefined, null);
        await utils.auth.me.invalidate();
      }
    }
  }, [logoutMutation, utils]);

  // Determine auth state
  const state = useMemo(() => {
    if (usingFirebase) {
      // Firebase auth state
      const backendUser = meQuery.data ?? null;
      const fallbackUser = firebaseUser ? {
        id: firebaseUser.uid,
        openId: firebaseUser.uid,
        name: firebaseUser.displayName,
        email: firebaseUser.email,
        avatarUrl: firebaseUser.photoURL,
        role: 'user' as const,
      } : null;
      const user = backendUser ?? fallbackUser;

      if (user) {
        localStorage.setItem("manus-runtime-user-info", JSON.stringify(user));
      } else {
        localStorage.removeItem("manus-runtime-user-info");
      }

      return {
        user,
        loading:
          firebaseLoading ||
          meQuery.isLoading ||
          (Boolean(firebaseUser) && !sessionSynced),
        error: firebaseError ?? meQuery.error ?? null,
        isAuthenticated: Boolean(firebaseUser) && sessionSynced,
      };
    } else {
      // tRPC auth state
      localStorage.setItem(
        "manus-runtime-user-info",
        JSON.stringify(meQuery.data)
      );
      return {
        user: meQuery.data ?? null,
        loading: meQuery.isLoading || logoutMutation.isPending,
        error: meQuery.error ?? logoutMutation.error ?? null,
        isAuthenticated: Boolean(meQuery.data),
      };
    }
  }, [
    firebaseUser,
    firebaseLoading,
    firebaseError,
    sessionSynced,
    meQuery.data,
    meQuery.error,
    meQuery.isLoading,
    logoutMutation.error,
    logoutMutation.isPending,
  ]);

  // Auto-redirect for authentication
  useEffect(() => {
    if (!redirectOnUnauthenticated) return;
    if (state.loading) return;
    if (state.user) return;
    if (typeof window === "undefined") return;
    if (window.location.pathname === redirectPath) return;

    console.log('[Auth] Redirecting to:', redirectPath);
    window.location.href = redirectPath;
  }, [
    redirectOnUnauthenticated,
    redirectPath,
    state.loading,
    state.user,
  ]);

  return {
    ...state,
    refresh: () => {
      if (usingFirebase) {
        meQuery.refetch();
      } else {
        meQuery.refetch();
      }
    },
    logout,
    loginWithGoogle,
  };
}
