import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useFirebaseAuth } from "@/_core/hooks/useFirebaseAuth";
import { APP_TITLE, APP_LOGO } from "@/const";

export function FirebaseLoginPage() {
  const { loginWithGoogle, loading, error } = useFirebaseAuth();
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  const handleGoogleLogin = async () => {
    setIsLoggingIn(true);
    try {
      await loginWithGoogle();
    } catch (error) {
      console.error('Login error:', error);
    } finally {
      setIsLoggingIn(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-md space-y-6">
        {/* Logo e título */}
        <div className="text-center space-y-4">
          <img 
            src={APP_LOGO} 
            alt={APP_TITLE}
            className="mx-auto h-16 w-16 rounded-2xl"
          />
          <div>
            <h1 className="text-2xl font-bold tracking-tight">{APP_TITLE}</h1>
            <p className="text-muted-foreground">
              Gerencie suas despesas compartilhadas de forma simples
            </p>
          </div>
        </div>

        {/* Card de login */}
        <Card>
          <CardHeader className="space-y-1">
            <CardTitle className="text-2xl text-center">Entrar</CardTitle>
            <CardDescription className="text-center">
              Use sua conta Google para acessar o aplicativo
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Mostrar erro se houver */}
            {error && (
              <Alert variant="destructive">
                <AlertDescription>
                  Erro ao fazer login: {error.message}
                </AlertDescription>
              </Alert>
            )}

            {/* Botão de login com Google */}
            <Button
              onClick={handleGoogleLogin}
              disabled={loading || isLoggingIn}
              className="w-full"
              size="lg"
            >
              {isLoggingIn ? (
                <div className="flex items-center space-x-2">
                  <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
                  <span>Entrando...</span>
                </div>
              ) : (
                <div className="flex items-center space-x-2">
                  <svg className="h-4 w-4" viewBox="0 0 24 24">
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
                  <span>Entrar com Google</span>
                </div>
              )}
            </Button>

            <div className="text-center text-sm text-muted-foreground space-y-1">
              <p>Login seguro</p>
              <p>Atualização automática</p>
              <p>Funciona offline</p>
            </div>
          </CardContent>
        </Card>

        {/* Footer */}
        <div className="text-center text-xs text-muted-foreground">
          <p>Ao entrar, você concorda com os termos e a privacidade do app.</p>
        </div>
      </div>
    </div>
  );
}