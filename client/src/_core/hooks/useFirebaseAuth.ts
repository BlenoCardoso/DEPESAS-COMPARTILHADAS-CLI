import { useEffect, useState, useCallback } from "react";
import {
  signInWithPopup,
  signInWithRedirect,
  signOut,
  onAuthStateChanged,
  User as FirebaseUser,
} from "firebase/auth";
import { auth, googleProvider } from "@/lib/firebase";

interface AuthState {
  user: FirebaseUser | null;
  loading: boolean;
  error: Error | null;
  isAuthenticated: boolean;
}

type UseFirebaseAuthOptions = {
  redirectOnUnauthenticated?: boolean;
  redirectPath?: string;
};

export function useFirebaseAuth(options?: UseFirebaseAuthOptions) {
  const { redirectOnUnauthenticated = false, redirectPath = "/login" } = options ?? {};
  
  const [state, setState] = useState<AuthState>({
    user: null,
    loading: true,
    error: null,
    isAuthenticated: false,
  });

  // Função para login com Google
  const loginWithGoogle = useCallback(async () => {
    setState(prev => ({ ...prev, loading: true, error: null }));
    
    try {
      const result = await signInWithPopup(auth, googleProvider);
      console.log('[Firebase Auth] Login successful:', result.user.email);
      
      // O estado será atualizado automaticamente pelo onAuthStateChanged
    } catch (error: any) {
      console.error('[Firebase Auth] Login failed:', error);

      // Fallback: se o navegador bloquear popups, tente login via redirect
      const errorCode = typeof error?.code === 'string' ? error.code : '';
      const errorMessage = typeof error?.message === 'string' ? error.message : '';
      const popupBlocked = errorCode === 'auth/popup-blocked' || errorMessage.toLowerCase().includes('popup');

      if (popupBlocked) {
        try {
          await signInWithRedirect(auth, googleProvider);
          return;
        } catch (redirectError: any) {
          console.error('[Firebase Auth] Redirect login failed:', redirectError);
          setState(prev => ({ 
            ...prev, 
            loading: false, 
            error: redirectError as Error 
          }));
          return;
        }
      }

      setState(prev => ({ 
        ...prev, 
        loading: false, 
        error: error as Error 
      }));
    }
  }, []);

  // Função para logout
  const logout = useCallback(async () => {
    setState(prev => ({ ...prev, loading: true, error: null }));
    
    try {
      await signOut(auth);
      console.log('[Firebase Auth] Logout successful');
      
      // O estado será atualizado automaticamente pelo onAuthStateChanged
    } catch (error: any) {
      console.error('[Firebase Auth] Logout failed:', error);
      setState(prev => ({ 
        ...prev, 
        loading: false, 
        error: error as Error 
      }));
    }
  }, []);

  // Monitorar mudanças no estado de autenticação
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, 
      (user) => {
        console.log('[Firebase Auth] Auth state changed:', user ? user.email : 'signed out');
        
        setState({
          user,
          loading: false,
          error: null,
          isAuthenticated: Boolean(user),
        });
        
        // Persistir informações do usuário para uso com Manus Runtime
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
        } else {
          localStorage.removeItem("manus-runtime-user-info");
        }
      },
      (error) => {
        console.error('[Firebase Auth] Auth state error:', error);
        setState(prev => ({ 
          ...prev, 
          loading: false, 
          error: error as Error 
        }));
      }
    );

    return () => unsubscribe();
  }, []);

  // Redirecionamento automático se não autenticado
  useEffect(() => {
    if (!redirectOnUnauthenticated) return;
    if (state.loading) return;
    if (state.user) return;
    if (typeof window === "undefined") return;
    if (window.location.pathname === redirectPath) return;

    console.log('[Firebase Auth] Redirecting to:', redirectPath);
    window.location.href = redirectPath;
  }, [
    redirectOnUnauthenticated,
    redirectPath,
    state.loading,
    state.user,
  ]);

  return {
    ...state,
    loginWithGoogle,
    logout,
    refresh: () => {
      // Firebase atualiza automaticamente, mas podemos forçar um refresh
      setState(prev => ({ ...prev, loading: true }));
    },
  };
}