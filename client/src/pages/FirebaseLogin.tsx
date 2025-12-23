import { useEffect } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2, ShieldCheck } from "lucide-react";
import { useLocation } from "wouter";

export default function FirebaseLogin() {
  const { loginWithGoogle, isAuthenticated, loading } = useAuth();
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (isAuthenticated) return;

    let cancelled = false;

    const attemptLogin = async () => {
      try {
        await loginWithGoogle();
      } catch (error) {
        if (!cancelled) {
          console.error("[FirebaseLogin] Falha ao iniciar login automático", error);
        }
      }
    };

    attemptLogin();

    return () => {
      cancelled = true;
    };
  }, [isAuthenticated, loginWithGoogle]);

  useEffect(() => {
    if (isAuthenticated) {
      setLocation("/");
    }
  }, [isAuthenticated, setLocation]);

  return (
    <div className="animate-fade-in">
      <div className="mx-auto w-full max-w-md space-y-4 px-4 py-10">
        <div className="rounded-3xl border border-border/60 bg-primary px-5 py-6 text-primary-foreground shadow-sm">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <p className="text-xs uppercase tracking-widest text-primary-foreground/80">Acesso</p>
              <h1 className="font-display mt-1 text-2xl font-semibold tracking-tight">Entrando…</h1>
              <p className="mt-1 text-sm text-primary-foreground/80">Login seguro com Google</p>
            </div>
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary-foreground/10 ring-1 ring-primary-foreground/15">
              <ShieldCheck className="h-5 w-5" />
            </div>
          </div>
        </div>

        <Card className="rounded-2xl border border-border/60 bg-card/80 shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center gap-3 text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin text-primary" />
              <span className="text-sm">{loading ? "Conectando ao Google..." : "Aguardando autenticação..."}</span>
            </div>
            <p className="mt-2 text-xs text-muted-foreground">
              Se demorar, verifique sua conexão e tente novamente.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
