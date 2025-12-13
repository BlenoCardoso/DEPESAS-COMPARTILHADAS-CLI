import { PageContainer } from "@/components/layout/PageContainer";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { useTheme } from "@/contexts/ThemeContext";
import { useMemo } from "react";

export default function Settings() {
  const { theme, toggleTheme, switchable } = useTheme();
  const forceMobile = useMemo(() => {
    if (typeof window === "undefined") return false;
    return localStorage.getItem("force-mobile-layout") === "true";
  }, []);

  return (
    <div className="space-y-4 sm:space-y-6 animate-fade-in">
      <PageContainer className="app-hero space-y-2">
        <p className="text-xs uppercase tracking-widest text-muted-foreground">Preferências</p>
        <h1 className="text-2xl font-semibold sm:text-3xl">Configurações</h1>
        <p className="text-sm text-muted-foreground">Deixe o app do seu jeito, sem poluir a tela.</p>
      </PageContainer>

      <PageContainer className="glass-panel space-y-3 rounded-3xl border border-border/70 bg-card/70">
        <Card className="rounded-3xl border border-border/60 bg-card/80">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Aparência</CardTitle>
            <CardDescription>Escolha um visual mais claro ou escuro.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between rounded-2xl border border-border/60 p-3">
              <div className="space-y-0.5">
                <p className="text-sm font-medium">Modo escuro</p>
                <p className="text-xs text-muted-foreground">Alterna entre claro e escuro.</p>
              </div>
              <Switch
                checked={theme === "dark"}
                disabled={!switchable || !toggleTheme}
                onCheckedChange={() => toggleTheme?.()}
              />
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-3xl border border-border/60 bg-card/80">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Layout</CardTitle>
            <CardDescription>Deixa a navegação mais parecida com app.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between rounded-2xl border border-border/60 p-3">
              <div className="space-y-0.5">
                <p className="text-sm font-medium">Forçar layout mobile</p>
                <p className="text-xs text-muted-foreground">Ativa bottom bar mesmo em telas grandes.</p>
              </div>
              <Switch
                checked={forceMobile}
                onCheckedChange={(next) => {
                  if (typeof window === "undefined") return;
                  localStorage.setItem("force-mobile-layout", next ? "true" : "false");
                  window.location.reload();
                }}
              />
            </div>
          </CardContent>
        </Card>
      </PageContainer>
    </div>
  );
}
