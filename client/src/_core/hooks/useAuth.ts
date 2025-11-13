import { getLoginUrl, isUsingFirebase } from "@/const";
import { trpc } from "@/lib/trpc";
import { TRPCClientError } from "@trpc/client";
import { useCallback, useEffect, useMemo, useState } from "react";
// Firebase (usar imports estáticos para garantir listener imediato)
import { auth, googleProvider } from "@/lib/firebase";
import { onAuthStateChanged, signInWithPopup, signInWithRedirect, signOut } from "firebase/auth";

type UseAuthOptions = {
  redirectOnUnauthenticated?: boolean;
  redirectPath?: string;
};

export function useAuth(options?: UseAuthOptions) {
  const { redirectOnUnauthenticated = false, redirectPath = getLoginUrl() } =
    options ?? {};

  // Firebase auth state
  const [firebaseUser, setFirebaseUser] = useState<any>(null);
  const [firebaseLoading, setFirebaseLoading] = useState(true);
  const [firebaseError, setFirebaseError] = useState<Error | null>(null);

  // tRPC auth (fallback)
  const utils = trpc.useUtils();
  const meQuery = trpc.auth.me.useQuery(undefined, {
    retry: false,
    refetchOnWindowFocus: false,
    enabled: !isUsingFirebase(), // Only query if not using Firebase
  });

  const logoutMutation = trpc.auth.logout.useMutation({
    onSuccess: () => {
      utils.auth.me.setData(undefined, null);
    },
  });

  // Firebase auth listener
  useEffect(() => {
    if (!isUsingFirebase()) {
      setFirebaseLoading(false);
      return;
    }

    const unsubscribe = onAuthStateChanged(auth, 
      (user: any) => {
        console.log('[Firebase Auth] Auth state changed:', user ? user.email : 'signed out');
        setFirebaseUser(user);
        setFirebaseLoading(false);
        setFirebaseError(null);
        
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

          // Ensure backend session cookie exists for tRPC protected routes
          // We call our server to exchange the Firebase ID token for a cookie.
          (async () => {
            try {
              const idToken = await user.getIdToken(true);
              await fetch('/api/auth/firebase/session', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ idToken }),
              });
            } catch (err) {
              console.warn('[Auth] Failed to sync server session', err);
            }
          })();
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
  }, []);

  // Login with Google (Firebase)
  const loginWithGoogle = useCallback(async () => {
    if (!isUsingFirebase()) {
      // Fallback to original OAuth
      window.location.href = getLoginUrl();
      return;
    }

    setFirebaseLoading(true);
    setFirebaseError(null);
    
    try {
      const result = await signInWithPopup(auth, googleProvider);
      console.log('[Firebase Auth] Login successful:', result.user.email);
      // Immediately sync session cookie
      try {
        const idToken = await result.user.getIdToken(true);
        await fetch('/api/auth/firebase/session', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ idToken }),
        });
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
        }
      } else {
        setFirebaseError(error);
      }
    } finally {
      setFirebaseLoading(false);
    }
  }, []);

  // Logout
  const logout = useCallback(async () => {
    if (isUsingFirebase()) {
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
    if (isUsingFirebase()) {
      // Firebase auth state
      const user = firebaseUser ? {
        id: firebaseUser.uid,
        openId: firebaseUser.uid,
        name: firebaseUser.displayName,
        email: firebaseUser.email,
        avatarUrl: firebaseUser.photoURL,
        role: 'user' as const,
      } : null;

      return {
        user,
        loading: firebaseLoading,
        error: firebaseError,
        isAuthenticated: Boolean(firebaseUser),
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
      if (isUsingFirebase()) {
        // Firebase refreshes automatically
      } else {
        meQuery.refetch();
      }
    },
    logout,
    loginWithGoogle,
  };
}
