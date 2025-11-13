import { useEffect } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { useLocation } from "wouter";

export default function FirebaseLogin() {
  const { loginWithGoogle, isAuthenticated, loading } = useAuth();
  const [, setLocation] = useLocation();

  useEffect(() => {
    // Tenta iniciar o login automaticamente
    loginWithGoogle();
  }, [loginWithGoogle]);

  useEffect(() => {
    if (isAuthenticated) {
      setLocation("/");
    }
  }, [isAuthenticated, setLocation]);

  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="flex items-center gap-3 text-muted-foreground">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" />
        <span>{loading ? "Conectando ao Google..." : "Aguardando autenticação..."}</span>
      </div>
    </div>
  );
}
