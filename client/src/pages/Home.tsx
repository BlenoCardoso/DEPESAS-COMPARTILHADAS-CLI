import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { APP_TITLE } from "@/const";
import { useIsMobile } from "@/hooks/useMobile";
import { formatCents } from "@/lib/utils";
import { trpc } from "@/lib/trpc";
import { CreditCard, PieChart, Plus, Users, Wallet, Bell } from "lucide-react";
import { Link } from "wouter";
import { useState } from "react";

export default function Home() {
  const { user, loading, isAuthenticated, loginWithGoogle } = useAuth();
  const isMobile = useIsMobile();
  const [homeView, setHomeView] = useState<"summary" | "actions">("summary");

  const { data: groups } = trpc.groups.list.useQuery(undefined, {
    enabled: isAuthenticated,
  });
  const groupsList = Array.isArray(groups) ? groups : [];

  const { data: unreadCount } = trpc.notifications.getUnreadCount.useQuery(undefined, {
    enabled: isAuthenticated,
    refetchOnMount: "always",
    refetchOnWindowFocus: true,
  });
  const { data: notifications } = trpc.notifications.list.useQuery(undefined, {
    enabled: isAuthenticated,
  });
  const notificationsCount = notifications?.length ?? 0;

  const { data: personalExpenses } = trpc.personalExpenses.list.useQuery(undefined, {
    enabled: isAuthenticated,
  });

  const personalTotal = personalExpenses?.reduce((sum, e: any) => sum + (e.amount || 0), 0) || 0;

  const { data: sharedCountData } = trpc.sharedExpenses.countForUser.useQuery(undefined, {
    enabled: isAuthenticated,
  });

  const firstName = user?.name?.split(" ")[0] ?? "";

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
        <div className="max-w-md space-y-6">
          <div className="space-y-2">
            <div className="mx-auto h-16 w-16 rounded-lg bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center mb-4">
              <CreditCard className="h-8 w-8 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-gradient sm:text-4xl">{APP_TITLE}</h1>
            <p className="text-sm text-muted-foreground sm:text-lg">
              Gerencie suas despesas compartilhadas e pessoais de forma simples e eficiente
            </p>
          </div>

          <Accordion type="single" collapsible>
            <AccordionItem value="features" className="border-none">
              <AccordionTrigger className="rounded-2xl border border-border/60 bg-card/60 px-4 py-3 hover:no-underline">
                <span className="flex flex-col items-start">
                  <span className="text-sm font-semibold">Ver recursos</span>
                  <span className="text-xs text-muted-foreground">Toque para expandir</span>
                </span>
              </AccordionTrigger>
              <AccordionContent className="pt-3">
                <div className="grid grid-cols-2 gap-4 py-2">
                  <div className="flex flex-col items-center gap-2 p-4 rounded-lg bg-primary/10">
                    <Users className="h-8 w-8 text-primary" />
                    <span className="text-sm font-medium">Grupos</span>
                  </div>
                  <div className="flex flex-col items-center gap-2 p-4 rounded-lg bg-secondary/10">
                    <CreditCard className="h-8 w-8 text-secondary" />
                    <span className="text-sm font-medium">Despesas</span>
                  </div>
                  <div className="flex flex-col items-center gap-2 p-4 rounded-lg bg-accent/10">
                    <Wallet className="h-8 w-8 text-accent" />
                    <span className="text-sm font-medium">Pessoal</span>
                  </div>
                  <div className="flex flex-col items-center gap-2 p-4 rounded-lg bg-info/10">
                    <PieChart className="h-8 w-8 text-info" />
                    <span className="text-sm font-medium">Relatórios</span>
                  </div>
                </div>

                <div className="text-center text-xs text-muted-foreground space-y-1">
                  <p>Login seguro com Firebase Authentication</p>
                  <p>Sincronização em tempo real</p>
                  <p>Funciona offline</p>
                </div>
              </AccordionContent>
            </AccordionItem>
          </Accordion>

          <Button
            size="lg"
            className="w-full gradient-primary text-white font-semibold"
            onClick={loginWithGoogle}
            disabled={loading}
          >
            {loading ? (
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
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6 animate-fade-in">
      <Card className="rounded-2xl border bg-gradient-to-br from-primary to-primary/70 text-primary-foreground shadow-sm">
        <CardContent className="flex items-center justify-between gap-3 p-3">
          <div className="space-y-1">
            <p className="text-sm/5 opacity-95">Olá, {firstName}!</p>
            <p className="text-sm font-semibold">Acompanhe tudo em tempo real.</p>
          </div>
          <div className="rounded-2xl bg-white/15 p-2">
            <CreditCard className="h-5 w-5" />
          </div>
        </CardContent>
      </Card>

      <div className="overflow-hidden rounded-2xl border border-border/60 bg-card/60 p-1">
        <ToggleGroup
          type="single"
          value={homeView}
          onValueChange={(v) => setHomeView((v || "summary") as any)}
          className="w-full"
          variant="outline"
        >
          <ToggleGroupItem value="summary" className="flex-1 rounded-xl data-[state=on]:bg-primary/15 data-[state=on]:text-primary">
            Resumo
          </ToggleGroupItem>
          <ToggleGroupItem value="actions" className="flex-1 rounded-xl data-[state=on]:bg-primary/15 data-[state=on]:text-primary">
            Atalhos
          </ToggleGroupItem>
        </ToggleGroup>
      </div>

      {homeView === "summary" ? (
        <Accordion type="single" collapsible defaultValue={isMobile ? undefined : "summary"}>
          <AccordionItem value="summary" className="border-none">
            <AccordionTrigger className="rounded-2xl border border-border/60 bg-card/60 px-4 py-3 hover:no-underline">
              <span className="flex flex-col items-start">
                <span className="text-sm font-semibold">Resumo</span>
                <span className="text-xs text-muted-foreground">Toque para expandir</span>
              </span>
            </AccordionTrigger>
            <AccordionContent className="pt-3">
              <div className="space-y-2">
                <Link href="/groups">
                  <Card className="interactive-card cursor-pointer rounded-2xl border bg-card shadow-sm transition-all duration-150 hover:-translate-y-0.5 hover:shadow-md">
                    <CardContent className="p-3">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex min-w-0 items-start gap-3">
                          <div className="mt-0.5 flex h-9 w-9 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                            <Users className="h-4 w-4" />
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-semibold">Grupos</p>
                            <p className="text-[12px] text-muted-foreground truncate">
                              {groupsList.length === 1 ? "1 grupo ativo" : `${groupsList.length} grupos ativos`}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-semibold">{groupsList.length}</p>
                          <p className="text-[11px] text-muted-foreground">ativos</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </Link>

                <Link href="/shared-expenses">
                  <Card className="interactive-card cursor-pointer rounded-2xl border bg-card shadow-sm transition-all duration-150 hover:-translate-y-0.5 hover:shadow-md">
                    <CardContent className="p-3">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex min-w-0 items-start gap-3">
                          <div className="mt-0.5 flex h-9 w-9 items-center justify-center rounded-2xl bg-secondary/15 text-secondary">
                            <CreditCard className="h-4 w-4" />
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-semibold">Compart.</p>
                            <p className="text-[12px] text-muted-foreground truncate">{formatCents(sharedCountData?.totalAmount ?? 0)} total</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-semibold">{sharedCountData?.count ?? 0}</p>
                          <p className="text-[11px] text-muted-foreground">despesas</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </Link>

                <Link href="/personal-expenses">
                  <Card className="interactive-card cursor-pointer rounded-2xl border bg-card shadow-sm transition-all duration-150 hover:-translate-y-0.5 hover:shadow-md">
                    <CardContent className="p-3">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex min-w-0 items-start gap-3">
                          <div className="mt-0.5 flex h-9 w-9 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                            <Wallet className="h-4 w-4" />
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-semibold">Pessoal</p>
                            <p className="text-[12px] text-muted-foreground truncate">{formatCents(personalTotal)} total</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-semibold">{personalExpenses?.length ?? 0}</p>
                          <p className="text-[11px] text-muted-foreground">itens</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </Link>

                <Link href="/notifications">
                  <Card className="interactive-card cursor-pointer rounded-2xl border bg-card shadow-sm transition-all duration-150 hover:-translate-y-0.5 hover:shadow-md">
                    <CardContent className="p-3">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex min-w-0 items-start gap-3">
                          <div className="mt-0.5 flex h-9 w-9 items-center justify-center rounded-2xl bg-info/15 text-info">
                            <Bell className="h-4 w-4" />
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-semibold">Notificações</p>
                            <p className="text-[12px] text-muted-foreground truncate">Total: {notificationsCount}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-semibold">{unreadCount || 0}</p>
                          <p className="text-[11px] text-muted-foreground">não lidas</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              </div>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      ) : (
        <Accordion type="single" collapsible defaultValue={isMobile ? undefined : "actions"}>
          <AccordionItem value="actions" className="border-none">
            <AccordionTrigger className="rounded-2xl border border-border/60 bg-card/60 px-4 py-3 hover:no-underline">
              <span className="flex flex-col items-start">
                <span className="text-sm font-semibold">Ações rápidas</span>
                <span className="text-xs text-muted-foreground">Atalhos para o essencial</span>
              </span>
            </AccordionTrigger>
            <AccordionContent className="pt-3">
              <div className="grid grid-cols-2 gap-2">
                <Button asChild variant="outline" className="interactive-tap w-full justify-start gap-2 rounded-2xl py-3">
                  <Link href="/groups">
                    <Plus className="h-4 w-4" />
                    Criar grupo
                  </Link>
                </Button>
                <Button asChild variant="outline" className="interactive-tap w-full justify-start gap-2 rounded-2xl py-3">
                  <Link href="/shared-expenses">
                    <CreditCard className="h-4 w-4" />
                    Nova despesa
                  </Link>
                </Button>
                <Button asChild variant="outline" className="interactive-tap w-full justify-start gap-2 rounded-2xl py-3">
                  <Link href="/tasks">
                    <Plus className="h-4 w-4" />
                    Nova tarefa
                  </Link>
                </Button>
                <Button asChild variant="outline" className="interactive-tap w-full justify-start gap-2 rounded-2xl py-3">
                  <Link href="/reports">
                    <PieChart className="h-4 w-4" />
                    Relatórios
                  </Link>
                </Button>
              </div>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      )}
    </div>
  );
}
