import { PageContainer } from "@/components/layout/PageContainer";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { useTheme } from "@/contexts/ThemeContext";
import { MonitorSmartphone, Moon, Palette } from "lucide-react";
import { useMemo } from "react";

export default function Settings() {
  const { theme, toggleTheme, switchable } = useTheme();
  const forceMobile = useMemo(() => {
    if (typeof window === "undefined") return false;
    return localStorage.getItem("force-mobile-layout") === "true";
  }, []);

  return (
    <div className="space-y-4 sm:space-y-6 animate-fade-in">
      <div className="overflow-hidden rounded-3xl border border-border/60 bg-primary text-primary-foreground shadow-sm">
        <PageContainer className="space-y-2 p-4 sm:p-5">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <p className="text-xs uppercase tracking-widest text-primary-foreground/80">Preferências</p>
              <h1 className="font-display mt-1 text-2xl font-semibold tracking-tight sm:text-3xl">Configurações</h1>
              <p className="text-sm text-primary-foreground/80">Deixe o app do seu jeito, sem poluir a tela.</p>
            </div>
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary-foreground/10 ring-1 ring-primary-foreground/15">
              <Palette className="h-5 w-5" />
            </div>
          </div>
        </PageContainer>
      </div>

      <PageContainer className="glass-panel space-y-3 rounded-2xl border border-border/70 bg-card/70">
        <Card className="rounded-2xl border border-border/60 bg-card/80">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Aparência</CardTitle>
            <CardDescription>Escolha um visual mais claro ou escuro.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between gap-3 rounded-2xl border border-border/60 bg-background/40 p-3">
              <div className="flex min-w-0 items-start gap-3">
                <div className="mt-0.5 flex h-9 w-9 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                  <Moon className="h-4 w-4" />
                </div>
                <div className="min-w-0 space-y-0.5">
                  <p className="text-sm font-medium">Modo escuro</p>
                  <p className="text-xs text-muted-foreground">Alterna entre claro e escuro.</p>
                </div>
              </div>
              <Switch
                checked={theme === "dark"}
                disabled={!switchable || !toggleTheme}
                onCheckedChange={() => toggleTheme?.()}
              />
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border border-border/60 bg-card/80">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Layout</CardTitle>
            <CardDescription>Deixa a navegação mais parecida com app.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between gap-3 rounded-2xl border border-border/60 bg-background/40 p-3">
              <div className="flex min-w-0 items-start gap-3">
                <div className="mt-0.5 flex h-9 w-9 items-center justify-center rounded-2xl bg-secondary/40 text-secondary-foreground">
                  <MonitorSmartphone className="h-4 w-4" />
                </div>
                <div className="min-w-0 space-y-0.5">
                  <p className="text-sm font-medium">Forçar layout mobile</p>
                  <p className="text-xs text-muted-foreground">Ativa bottom bar mesmo em telas grandes.</p>
                </div>
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
