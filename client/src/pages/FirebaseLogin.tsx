import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { APP_LOGO, APP_TITLE } from "@/const";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft, Loader2, Mail } from "lucide-react";
import { useLocation } from "wouter";

export default function FirebaseLogin() {
  const { loginWithGoogle, loginWithEmail, signUpWithEmail, isAuthenticated, loading, error } = useAuth();
  const [, setLocation] = useLocation();
  const [mode, setMode] = useState<"chooser" | "email-login" | "email-signup">("chooser");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const header = useMemo(() => {
    if (mode === "email-signup") {
      return {
        title: "Crie sua conta",
        subtitle: "Use seu e-mail para começar a transformar suas finanças.",
      };
    }

    if (mode === "email-login") {
      return {
        title: "Bem-vindo de volta!",
        subtitle: "Entre com seu e-mail para continuar.",
      };
    }

    return {
      title: "Bem-vindo de volta!",
      subtitle: "Crie a sua conta e comece a transformar as suas finanças.",
    };
  }, [mode]);

  useEffect(() => {
    if (isAuthenticated) {
      setLocation("/");
    }
  }, [isAuthenticated, setLocation]);

  const handleGoogle = async () => {
    try {
      await loginWithGoogle();
    } catch (e) {
      console.error("[FirebaseLogin] Falha no login com Google", e);
    }
  };

  const handleEmail = async () => {
    try {
      if (mode === "email-signup") {
        await signUpWithEmail(email, password);
      } else {
        await loginWithEmail(email, password);
      }
    } catch (e) {
      console.error("[FirebaseLogin] Falha no login/cadastro com e-mail", e);
    }
  };

  return (
    <div className="dark min-h-[100dvh] bg-background text-foreground animate-fade-in">
      <div className="mx-auto w-full max-w-md px-5 py-10">
        <div className="mb-4 flex items-center justify-between">
          <Button
            variant="ghost"
            size="icon"
            className="rounded-2xl"
            onClick={() => {
              if (mode === "chooser") setLocation("/");
              else setMode("chooser");
            }}
          >
            <ArrowLeft className="h-5 w-5" />
            <span className="sr-only">Voltar</span>
          </Button>
          <span className="text-xs text-muted-foreground">{APP_TITLE}</span>
          <span className="w-9" aria-hidden="true" />
        </div>

        <div className="flex flex-col items-center text-center">
          <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10">
            <img
              src={APP_LOGO}
              alt={APP_TITLE}
              className="h-10 w-10 rounded-xl"
              loading="lazy"
            />
          </div>
          <h1 className="font-display text-2xl font-semibold tracking-tight">{header.title}</h1>
          <p className="mt-2 text-sm text-muted-foreground">{header.subtitle}</p>
        </div>

        <Card className="mt-6 rounded-3xl border border-border/60 bg-card/80 shadow-sm">
          <CardContent className="p-5">
            {error ? (
              <Alert variant="destructive" className="mb-4">
                <AlertDescription>
                  {error.message || "Erro ao autenticar. Tente novamente."}
                </AlertDescription>
              </Alert>
            ) : null}

            {mode === "chooser" ? (
              <div className="space-y-3">
                <Button
                  size="lg"
                  variant="outline"
                  className="w-full rounded-full bg-background/60"
                  onClick={handleGoogle}
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>Conectando…</span>
                    </>
                  ) : (
                    <>
                      <svg className="h-4 w-4" viewBox="0 0 24 24" aria-hidden="true">
                        <path
                          fill="currentColor"
                          d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                        />
                        <path
                          fill="currentColor"
                          d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                        />
                        <path
                          fill="currentColor"
                          d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                        />
                        <path
                          fill="currentColor"
                          d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                        />
                      </svg>
                      <span>Continuar com Google</span>
                    </>
                  )}
                </Button>

                <Button
                  size="lg"
                  className="w-full rounded-full"
                  onClick={() => setMode("email-login")}
                  disabled={loading}
                >
                  <Mail className="h-4 w-4" />
                  <span>Continuar com email</span>
                </Button>

                <Button
                  variant="link"
                  className="w-full"
                  onClick={() => setMode("email-signup")}
                  disabled={loading}
                >
                  Cadastrar-se
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">E-mail</Label>
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="seuemail@exemplo.com"
                    className="rounded-2xl"
                    autoComplete="email"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">Senha</Label>
                  <Input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="********"
                    className="rounded-2xl"
                    autoComplete={mode === "email-signup" ? "new-password" : "current-password"}
                  />
                </div>

                <Button
                  size="lg"
                  className="w-full rounded-full font-semibold"
                  onClick={handleEmail}
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>Processando…</span>
                    </>
                  ) : (
                    <span>{mode === "email-signup" ? "Criar conta" : "Entrar"}</span>
                  )}
                </Button>

                <Button
                  variant="outline"
                  className="w-full rounded-full"
                  onClick={() => setMode(mode === "email-signup" ? "email-login" : "email-signup")}
                  disabled={loading}
                >
                  {mode === "email-signup" ? "Já tenho conta" : "Quero criar uma conta"}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        <p className="mt-6 text-center text-xs text-muted-foreground">
          Ao continuar, estou de acordo com os <span className="underline underline-offset-4">Termos de Uso</span> e com o{" "}
          <span className="underline underline-offset-4">Aviso de Privacidade</span>.
        </p>
      </div>
    </div>
  );
}
