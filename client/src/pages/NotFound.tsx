import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { AlertCircle, Home } from "lucide-react";
import { useLocation } from "wouter";

export default function NotFound() {
  const [, setLocation] = useLocation();

  const handleGoHome = () => {
    setLocation("/");
  };

  return (
    <div className="min-h-[70vh] w-full flex items-center justify-center">
      <Card className="w-full max-w-lg mx-4">
        <CardContent className="py-10 text-center space-y-4">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-destructive/10 text-destructive">
            <AlertCircle className="h-7 w-7" />
          </div>

          <div className="space-y-1">
            <h1 className="text-2xl font-semibold">Página não encontrada</h1>
            <p className="text-sm text-muted-foreground">O endereço pode ter mudado ou não existir.</p>
          </div>

          <Button onClick={handleGoHome} className="gap-2">
            <Home className="h-4 w-4" />
            Voltar para o início
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
