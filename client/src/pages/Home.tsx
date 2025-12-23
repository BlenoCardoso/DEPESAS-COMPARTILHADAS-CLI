import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Progress } from "@/components/ui/progress";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { APP_TITLE } from "@/const";
import { useIsMobile } from "@/hooks/useMobile";
import { formatCents } from "@/lib/utils";
import { trpc } from "@/lib/trpc";
import { useCurrentGroup } from "@/contexts/CurrentGroupContext";
import { CreditCard, PieChart, Plus, Users, Wallet, Bell, ArrowRightLeft, BarChart3, Loader2 } from "lucide-react";
import { PieChart as RePieChart, Pie, Cell } from "recharts";
import { Link } from "wouter";
import { useEffect, useMemo, useState } from "react";

function asDate(value: unknown): Date | null {
  if (!value) return null;
  if (value instanceof Date) return value;
  const d = new Date(value as any);
  return Number.isNaN(d.getTime()) ? null : d;
}

function isInMonth(value: unknown, year: number, monthIndex: number) {
  const d = asDate(value);
  if (!d) return false;
  return d.getFullYear() === year && d.getMonth() === monthIndex;
}

export default function Home() {
  const { user, loading, isAuthenticated, loginWithGoogle } = useAuth();
  const isMobile = useIsMobile();
  const [homeView, setHomeView] = useState<"summary" | "actions">("summary");
  const { currentGroup, setCurrentGroupId } = useCurrentGroup();
  const groupId = currentGroup?.id ?? null;

  // Queries com cache otimizado (5 minutos de staleTime)
  const { data: groups, isLoading: groupsLoading } = trpc.groups.list.useQuery(undefined, {
    enabled: isAuthenticated,
    staleTime: 5 * 60 * 1000, // 5 minutos
    gcTime: 10 * 60 * 1000, // 10 minutos (antigo cacheTime)
  });
  const groupsList = Array.isArray(groups) ? groups : [];

  useEffect(() => {
    if (!isAuthenticated) return;
    if (groupId) return;
    if (groupsList.length > 0) {
      setCurrentGroupId(groupsList[0].group.id);
    }
  }, [groupId, groupsList, isAuthenticated, setCurrentGroupId]);

  const { data: unreadCount, isLoading: unreadLoading } = trpc.notifications.getUnreadCount.useQuery(undefined, {
    enabled: isAuthenticated,
    refetchOnMount: "always",
    refetchOnWindowFocus: true,
    staleTime: 1 * 60 * 1000, // 1 minuto
  });
  
  const { data: notifications, isLoading: notificationsLoading } = trpc.notifications.list.useQuery(undefined, {
    enabled: isAuthenticated,
    staleTime: 2 * 60 * 1000, // 2 minutos
  });
  const notificationsCount = notifications?.length ?? 0;

  const { data: personalExpenses, isLoading: personalLoading } = trpc.personalExpenses.list.useQuery(undefined, {
    enabled: isAuthenticated,
    staleTime: 5 * 60 * 1000, // 5 minutos
  });

  const personalTotal = personalExpenses?.reduce((sum, e: any) => sum + (e.amount || 0), 0) || 0;

  const { data: sharedCountData, isLoading: sharedLoading } = trpc.sharedExpenses.countForUser.useQuery(undefined, {
    enabled: isAuthenticated,
    staleTime: 5 * 60 * 1000, // 5 minutos
  });

  const now = useMemo(() => new Date(), []);
  const currentYear = now.getFullYear();
  const currentMonthIndex = now.getMonth();

  const { data: sharedMonthCategoryTotals, isLoading: sharedMonthTotalsLoading } =
    trpc.sharedExpenses.monthCategoryTotalsForUser.useQuery(
      { year: currentYear, month: currentMonthIndex + 1 },
      {
        enabled: Boolean(isAuthenticated),
        staleTime: 5 * 60 * 1000,
        gcTime: 10 * 60 * 1000,
      }
    );

  const balancesQuery = trpc.settlements.calculateBalances.useQuery(
    { groupId: groupId! },
    {
      enabled: Boolean(isAuthenticated && groupId),
      staleTime: 2 * 60 * 1000,
      gcTime: 10 * 60 * 1000,
    }
  );

  const firstName = user?.name?.split(" ")[0] ?? "";

  const daysInMonth = new Date(currentYear, currentMonthIndex + 1, 0).getDate();
  const monthProgress = Math.round((now.getDate() / daysInMonth) * 100);

  const personalMonthExpenses = useMemo(() => {
    const list = Array.isArray(personalExpenses) ? personalExpenses : [];
    return list.filter((e: any) => isInMonth(e?.date, currentYear, currentMonthIndex));
  }, [currentMonthIndex, currentYear, personalExpenses]);

  const personalMonthTotal = personalMonthExpenses.reduce((sum: number, e: any) => sum + (Number(e?.amount) || 0), 0);
  const sharedMonthTotal = useMemo(() => {
    const list = Array.isArray(sharedMonthCategoryTotals) ? sharedMonthCategoryTotals : [];
    return list.reduce((sum: number, item: any) => sum + (Number(item?.amount) || 0), 0);
  }, [sharedMonthCategoryTotals]);
  const monthTotal = personalMonthTotal + sharedMonthTotal;

  const myBalance = useMemo(() => {
    const uid = user?.id;
    if (!uid) return 0;
    const list = Array.isArray(balancesQuery.data) ? balancesQuery.data : [];
    const mine = list.find((b: any) => b?.userId === uid);
    return Number(mine?.balance) || 0;
  }, [balancesQuery.data, user?.id]);

  const iOwe = myBalance < 0 ? Math.abs(myBalance) : 0;
  const iReceive = myBalance > 0 ? myBalance : 0;

  const categoryBreakdown = useMemo(() => {
    const totals = new Map<string, number>();

    for (const e of personalMonthExpenses as any[]) {
      const name = String(e?.category || "Sem categoria").trim() || "Sem categoria";
      totals.set(name, (totals.get(name) || 0) + (Number(e?.amount) || 0));
    }

    const sharedList = Array.isArray(sharedMonthCategoryTotals) ? sharedMonthCategoryTotals : [];
    for (const item of sharedList as any[]) {
      const name = String(item?.category || "Sem categoria").trim() || "Sem categoria";
      totals.set(name, (totals.get(name) || 0) + (Number(item?.amount) || 0));
    }

    const sorted = Array.from(totals.entries())
      .map(([category, value]) => ({ category, value }))
      .sort((a, b) => b.value - a.value);

    const top = sorted.slice(0, 6);
    const rest = sorted.slice(6);
    const otherValue = rest.reduce((sum, item) => sum + item.value, 0);
    const final = otherValue > 0 ? [...top, { category: "Outros", value: otherValue }] : top;

    const palette = [
      "var(--primary)",
      "var(--info)",
      "var(--success)",
      "var(--warning)",
      "var(--secondary-foreground)",
      "var(--destructive)",
      "var(--muted-foreground)",
    ];

    const config: Record<string, { label: string; color: string }> = {};
    const data = final.map((item, idx) => {
      const key = `c${idx}`;
      config[key] = { label: item.category, color: palette[idx % palette.length] };
      return { key, category: item.category, value: item.value, fill: `var(--color-${key})` };
    });

    return { data, config };
  }, [personalMonthExpenses, sharedMonthCategoryTotals]);

  const recentPersonalExpenses = useMemo(() => {
    const list = Array.isArray(personalExpenses) ? [...personalExpenses] : [];
    list.sort((a: any, b: any) => {
      const at = a?.date ? new Date(a.date).getTime() : 0;
      const bt = b?.date ? new Date(b.date).getTime() : 0;
      return bt - at;
    });
    return list.slice(0, 5);
  }, [personalExpenses]);

  const recentNotifications = useMemo(() => {
    const list = Array.isArray(notifications) ? [...notifications] : [];
    list.sort((a: any, b: any) => {
      const at = a?.createdAt ? new Date(a.createdAt).getTime() : 0;
      const bt = b?.createdAt ? new Date(b.createdAt).getTime() : 0;
      return bt - at;
    });
    return list.slice(0, 5);
  }, [notifications]);
  
  // Loading state unificado
  const isLoadingData = groupsLoading || personalLoading || sharedLoading || sharedMonthTotalsLoading;

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="animate-fade-in">
        <div className="mx-auto w-full max-w-md space-y-4 px-4 py-10">
          <div className="rounded-3xl border border-border/60 bg-primary px-5 py-6 text-primary-foreground shadow-sm">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0 space-y-1">
                <p className="text-xs uppercase tracking-widest text-primary-foreground/80">Bem-vindo</p>
                <h1 className="font-display text-2xl font-semibold tracking-tight sm:text-4xl">{APP_TITLE}</h1>
                <p className="text-sm text-primary-foreground/80">Controle despesas compartilhadas e pessoais.</p>
              </div>
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary-foreground/10 ring-1 ring-primary-foreground/15">
                <CreditCard className="h-5 w-5" />
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-border/60 bg-card/80 shadow-sm">
            <div className="p-4">
              <Accordion type="single" collapsible>
                <AccordionItem value="features" className="border-none">
                  <AccordionTrigger className="rounded-2xl border border-border/60 bg-card/60 px-4 py-3 hover:no-underline">
                    <span className="flex flex-col items-start">
                      <span className="text-sm font-semibold">Ver recursos</span>
                      <span className="text-xs text-muted-foreground">Opcional</span>
                    </span>
                  </AccordionTrigger>
                  <AccordionContent className="pt-3">
                    <div className="grid grid-cols-2 gap-4 py-2">
                      <div className="flex flex-col items-center gap-2 rounded-2xl border border-border/60 bg-card/60 p-3">
                        <Users className="h-8 w-8 text-primary" />
                        <span className="text-sm font-medium">Grupos</span>
                      </div>
                      <div className="flex flex-col items-center gap-2 rounded-2xl border border-border/60 bg-card/60 p-3">
                        <CreditCard className="h-8 w-8 text-secondary" />
                        <span className="text-sm font-medium">Despesas</span>
                      </div>
                      <div className="flex flex-col items-center gap-2 rounded-2xl border border-border/60 bg-card/60 p-3">
                        <Wallet className="h-8 w-8 text-accent" />
                        <span className="text-sm font-medium">Pessoal</span>
                      </div>
                      <div className="flex flex-col items-center gap-2 rounded-2xl border border-border/60 bg-card/60 p-3">
                        <PieChart className="h-8 w-8 text-info" />
                        <span className="text-sm font-medium">Relatórios</span>
                      </div>
                    </div>

                    <div className="text-center text-xs text-muted-foreground space-y-1">
                      <p>Login seguro</p>
                      <p>Atualização automática</p>
                      <p>Funciona offline</p>
                    </div>
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            </div>
          </div>

          <Button
            size="lg"
            className="w-full font-semibold"
            onClick={loginWithGoogle}
            disabled={loading}
          >
            {loading ? (
              <div className="flex items-center space-x-2">
                <Loader2 className="h-4 w-4 animate-spin" />
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
      <div className="overflow-hidden rounded-2xl border border-border/60 bg-primary text-primary-foreground shadow-sm">
        <div className="p-4 sm:p-5">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <p className="text-sm/5 text-primary-foreground/85">Olá{firstName ? `, ${firstName}` : ""}!</p>
              <p className="font-display mt-1 text-2xl font-semibold tracking-tight leading-tight">
                Visão geral do mês
              </p>
              <p className="mt-1 text-xs text-primary-foreground/80">
                {now.toLocaleDateString("pt-BR", { month: "long", year: "numeric" })}
              </p>
            </div>
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary-foreground/10 ring-1 ring-primary-foreground/15">
              <BarChart3 className="h-5 w-5" />
            </div>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-2">
            <div className="rounded-2xl bg-primary-foreground/10 p-3 ring-1 ring-primary-foreground/15">
              <p className="text-[11px] text-primary-foreground/75">Total este mês</p>
              <p className="font-display tabular-nums mt-1 text-lg font-semibold tracking-tight">{formatCents(monthTotal)}</p>
            </div>
            <Link href="/reports">
              <div className="interactive-card h-full rounded-2xl bg-primary-foreground/10 p-3 ring-1 ring-primary-foreground/15">
                <p className="text-[11px] text-primary-foreground/75">Relatórios</p>
                <div className="mt-1 flex items-center justify-between">
                  <p className="text-sm font-semibold">Ver detalhes</p>
                  <ArrowRightLeft className="h-4 w-4" />
                </div>
              </div>
            </Link>
          </div>
        </div>
      </div>

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
        <div className="space-y-3">
          <div className="flex items-center justify-between px-1">
            <div>
              <p className="text-sm font-semibold">Resumo</p>
              <p className="text-xs text-muted-foreground">Cards principais e visão do mês</p>
            </div>
          </div>

          <Link href="/group-balances">
            <Card className="interactive-card cursor-pointer rounded-2xl border border-border/60 bg-card shadow-sm">
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold">Saldo do grupo</p>
                    <p className="text-xs text-muted-foreground truncate">
                      {currentGroup?.name ? currentGroup.name : (groupsList.length ? "Selecione um grupo" : "Crie um grupo para ver saldos")}
                    </p>
                  </div>
                  <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                    <ArrowRightLeft className="h-4 w-4" />
                  </div>
                </div>

                <div className="mt-3 grid grid-cols-2 gap-2">
                  <div className="rounded-2xl border border-border/60 bg-background/60 p-3">
                    <p className="text-[11px] text-muted-foreground">Você deve</p>
                    <p className="font-display tabular-nums mt-1 text-base font-semibold tracking-tight">{formatCents(iOwe)}</p>
                  </div>
                  <div className="rounded-2xl border border-border/60 bg-background/60 p-3">
                    <p className="text-[11px] text-muted-foreground">A receber</p>
                    <p className="font-display tabular-nums mt-1 text-base font-semibold tracking-tight">{formatCents(iReceive)}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </Link>

          <Card className="rounded-2xl border border-border/60 bg-card shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Este mês</CardTitle>
              <CardDescription className="text-xs">Acompanhamento rápido • {monthProgress}% do mês</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-[11px] text-muted-foreground">Total gasto</p>
                  <p className="font-display tabular-nums mt-1 text-2xl font-semibold tracking-tight">{formatCents(monthTotal)}</p>
                  <p className="mt-1 text-[11px] text-muted-foreground">
                    Pessoal: {formatCents(personalMonthTotal)} • Compartilhadas: {formatCents(sharedMonthTotal)}
                  </p>
                </div>
                <div className="shrink-0 rounded-2xl border border-border/60 bg-primary/10 px-3 py-2 text-primary">
                  <p className="text-[11px] font-semibold">Dia</p>
                  <p className="font-display tabular-nums text-lg font-semibold leading-none">{now.getDate()}/{daysInMonth}</p>
                </div>
              </div>
              <Progress value={monthProgress} />
            </CardContent>
          </Card>

          <Card className="rounded-2xl border border-border/60 bg-card shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Despesas por categoria</CardTitle>
              <CardDescription className="text-xs">Mês atual • Pessoal + grupo atual (se houver)</CardDescription>
            </CardHeader>
            <CardContent>
              {isLoadingData ? (
                <p className="text-xs text-muted-foreground">Carregando…</p>
              ) : categoryBreakdown.data.length === 0 ? (
                <p className="text-xs text-muted-foreground">Sem dados suficientes para o gráfico.</p>
              ) : (
                <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_220px] sm:items-center">
                  <div className="space-y-2">
                    {categoryBreakdown.data.map((item) => (
                      <div key={item.key} className="flex items-center justify-between gap-3 rounded-2xl border border-border/60 bg-background/60 px-3 py-2">
                        <div className="flex min-w-0 items-center gap-2">
                          <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: item.fill as any }} />
                          <span className="min-w-0 truncate text-sm font-medium">{item.category}</span>
                        </div>
                        <span className="font-display tabular-nums shrink-0 text-sm font-semibold tracking-tight">{formatCents(item.value)}</span>
                      </div>
                    ))}
                  </div>

                  <ChartContainer
                    className="aspect-square w-full sm:w-[220px]"
                    config={categoryBreakdown.config}
                  >
                    <RePieChart>
                      <ChartTooltip
                        content={
                          <ChartTooltipContent
                            nameKey="key"
                            formatter={(value) => {
                              const cents = Number(value) || 0;
                              return (
                                <span className="font-display tabular-nums text-foreground font-semibold">
                                  {formatCents(cents)}
                                </span>
                              );
                            }}
                          />
                        }
                      />
                      <Pie
                        data={categoryBreakdown.data}
                        dataKey="value"
                        nameKey="key"
                        innerRadius={55}
                        outerRadius={85}
                        stroke="transparent"
                      >
                        {categoryBreakdown.data.map((entry) => (
                          <Cell key={entry.key} fill={entry.fill} />
                        ))}
                      </Pie>
                    </RePieChart>
                  </ChartContainer>
                </div>
              )}
            </CardContent>
          </Card>

          <div className="grid grid-cols-2 gap-2">
                {/* Card Grupos com skeleton */}
                <Link href="/groups">
                  <Card className="interactive-card cursor-pointer rounded-2xl border bg-card shadow-sm transition-all duration-150 hover:-translate-y-0.5 hover:shadow-md">
                    <CardContent className="p-3">
                      {groupsLoading ? (
                        <div className="flex items-start justify-between gap-3 animate-pulse">
                          <div className="flex min-w-0 items-start gap-3">
                            <div className="mt-0.5 h-9 w-9 rounded-2xl bg-muted" />
                            <div className="min-w-0 space-y-1.5">
                              <div className="h-4 w-16 bg-muted rounded" />
                              <div className="h-3 w-24 bg-muted rounded" />
                            </div>
                          </div>
                          <div className="text-right space-y-1.5">
                            <div className="h-4 w-8 bg-muted rounded ml-auto" />
                            <div className="h-3 w-12 bg-muted rounded ml-auto" />
                          </div>
                        </div>
                      ) : (
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
                            <p className="font-display tabular-nums text-sm font-semibold tracking-tight">{groupsList.length}</p>
                            <p className="text-[11px] text-muted-foreground">ativos</p>
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </Link>

                {/* Card Despesas Compartilhadas com skeleton */}
                <Link href="/shared-expenses">
                  <Card className="interactive-card cursor-pointer rounded-2xl border bg-card shadow-sm transition-all duration-150 hover:-translate-y-0.5 hover:shadow-md">
                    <CardContent className="p-3">
                      {sharedLoading ? (
                        <div className="flex items-start justify-between gap-3 animate-pulse">
                          <div className="flex min-w-0 items-start gap-3">
                            <div className="mt-0.5 h-9 w-9 rounded-2xl bg-muted" />
                            <div className="min-w-0 space-y-1.5">
                              <div className="h-4 w-20 bg-muted rounded" />
                              <div className="h-3 w-28 bg-muted rounded" />
                            </div>
                          </div>
                          <div className="text-right space-y-1.5">
                            <div className="h-4 w-8 bg-muted rounded ml-auto" />
                            <div className="h-3 w-16 bg-muted rounded ml-auto" />
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex min-w-0 items-start gap-3">
                            <div className="mt-0.5 flex h-9 w-9 items-center justify-center rounded-2xl bg-secondary/15 text-secondary">
                              <CreditCard className="h-4 w-4" />
                            </div>
                            <div className="min-w-0">
                              <p className="text-sm font-semibold">Compartilhadas</p>
                              <p className="font-display tabular-nums text-[12px] text-muted-foreground truncate">{formatCents(sharedCountData?.totalAmount ?? 0)} total</p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="font-display tabular-nums text-sm font-semibold tracking-tight">{sharedCountData?.count ?? 0}</p>
                            <p className="text-[11px] text-muted-foreground">despesas</p>
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </Link>

                {/* Card Despesas Pessoais com skeleton */}
                <Link href="/personal-expenses">
                  <Card className="interactive-card cursor-pointer rounded-2xl border bg-card shadow-sm transition-all duration-150 hover:-translate-y-0.5 hover:shadow-md">
                    <CardContent className="p-3">
                      {personalLoading ? (
                        <div className="flex items-start justify-between gap-3 animate-pulse">
                          <div className="flex min-w-0 items-start gap-3">
                            <div className="mt-0.5 h-9 w-9 rounded-2xl bg-muted" />
                            <div className="min-w-0 space-y-1.5">
                              <div className="h-4 w-16 bg-muted rounded" />
                              <div className="h-3 w-32 bg-muted rounded" />
                            </div>
                          </div>
                          <div className="text-right space-y-1.5">
                            <div className="h-4 w-16 bg-muted rounded ml-auto" />
                            <div className="h-3 w-12 bg-muted rounded ml-auto" />
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex min-w-0 items-start gap-3">
                            <div className="mt-0.5 flex h-9 w-9 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                              <Wallet className="h-4 w-4" />
                            </div>
                            <div className="min-w-0">
                              <p className="text-sm font-semibold">Pessoal</p>
                              <p className="font-display tabular-nums text-[12px] text-muted-foreground truncate">{formatCents(personalTotal)} total</p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="font-display tabular-nums text-sm font-semibold tracking-tight">{personalExpenses?.length ?? 0}</p>
                            <p className="text-[11px] text-muted-foreground">itens</p>
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </Link>

                {/* Card Notificações com skeleton */}
                <Link href="/notifications">
                  <Card className="interactive-card cursor-pointer rounded-2xl border bg-card shadow-sm transition-all duration-150 hover:-translate-y-0.5 hover:shadow-md">
                    <CardContent className="p-3">
                      {(unreadLoading || notificationsLoading) ? (
                        <div className="flex items-start justify-between gap-3 animate-pulse">
                          <div className="flex min-w-0 items-start gap-3">
                            <div className="mt-0.5 h-9 w-9 rounded-2xl bg-muted" />
                            <div className="min-w-0 space-y-1.5">
                              <div className="h-4 w-24 bg-muted rounded" />
                              <div className="h-3 w-20 bg-muted rounded" />
                            </div>
                          </div>
                          <div className="text-right space-y-1.5">
                            <div className="h-4 w-8 bg-muted rounded ml-auto" />
                            <div className="h-3 w-16 bg-muted rounded ml-auto" />
                          </div>
                        </div>
                      ) : (
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
                            <p className="font-display tabular-nums text-sm font-semibold tracking-tight">{unreadCount || 0}</p>
                            <p className="text-[11px] text-muted-foreground">não lidas</p>
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </Link>
          </div>

          <Card className="rounded-2xl border border-border/60 bg-card/60">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Detalhes</CardTitle>
              <CardDescription className="text-xs">Últimos lançamentos e alertas</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-2 sm:grid-cols-2">
              <Card className="rounded-2xl border border-border/60 bg-card/60">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Despesas pessoais</CardTitle>
                  <CardDescription className="font-display tabular-nums text-xs">Últimas {recentPersonalExpenses.length} • {formatCents(personalTotal)}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-2">
                  {personalLoading ? (
                    <p className="text-xs text-muted-foreground">Carregando…</p>
                  ) : recentPersonalExpenses.length === 0 ? (
                    <p className="text-xs text-muted-foreground">Sem lançamentos recentes.</p>
                  ) : (
                    <div className="space-y-2">
                      {recentPersonalExpenses.map((item: any) => (
                        <div key={item.id} className="flex items-start justify-between gap-3 rounded-2xl border border-border/60 bg-background/60 px-3 py-2">
                          <div className="min-w-0">
                            <p className="truncate text-sm font-medium">{item.title}</p>
                            <p className="text-[11px] text-muted-foreground">
                              {item.date ? new Date(item.date).toLocaleDateString("pt-BR") : "—"}
                              {item.category ? ` • ${item.category}` : ""}
                            </p>
                          </div>
                          <p className="font-display tabular-nums shrink-0 text-sm font-semibold tracking-tight">{formatCents(item.amount)}</p>
                        </div>
                      ))}
                    </div>
                  )}

                  <Button asChild variant="outline" className="interactive-tap w-full rounded-2xl">
                    <Link href="/personal-expenses">Ver todas</Link>
                  </Button>
                </CardContent>
              </Card>

              <Card className="rounded-2xl border border-border/60 bg-card/60">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Notificações</CardTitle>
                  <CardDescription className="text-xs">{unreadCount || 0} não lidas • {notificationsCount} no total</CardDescription>
                </CardHeader>
                <CardContent className="space-y-2">
                  {(unreadLoading || notificationsLoading) ? (
                    <p className="text-xs text-muted-foreground">Carregando…</p>
                  ) : recentNotifications.length === 0 ? (
                    <p className="text-xs text-muted-foreground">Nada por aqui.</p>
                  ) : (
                    <div className="space-y-2">
                      {recentNotifications.map((n: any) => (
                        <div key={n.id} className="rounded-2xl border border-border/60 bg-background/60 px-3 py-2">
                          <div className="flex items-start justify-between gap-2">
                            <p className="truncate text-sm font-medium">{n.title}</p>
                            {!n.read ? (
                              <span className="h-5 shrink-0 rounded-full bg-primary/15 px-2 text-[11px] font-medium text-primary">Nova</span>
                            ) : null}
                          </div>
                          <p className="mt-0.5 line-clamp-1 text-[12px] text-muted-foreground">{n.message}</p>
                        </div>
                      ))}
                    </div>
                  )}

                  <Button asChild variant="outline" className="interactive-tap w-full rounded-2xl">
                    <Link href="/notifications">Ver tudo</Link>
                  </Button>
                </CardContent>
              </Card>
            </CardContent>
          </Card>
        </div>
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
                    Despesa compartilhada
                  </Link>
                </Button>
                <Button asChild variant="outline" className="interactive-tap w-full justify-start gap-2 rounded-2xl py-3">
                  <Link href="/personal-expenses">
                    <Wallet className="h-4 w-4" />
                    Despesa pessoal
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
