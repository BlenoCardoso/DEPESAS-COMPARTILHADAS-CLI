import { useAuth } from "@/_core/hooks/useAuth";
import { EmptyState } from "@/components/EmptyState";
import { Button } from "@/components/ui/button";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { useIsMobile } from "@/hooks/useMobile";
import { trpc } from "@/lib/trpc";
import { formatCents } from "@/lib/utils";
import { BarChart3, Filter, Loader2, RefreshCcw, TrendingUp, Wallet, Users } from "lucide-react";
import { useMemo, useState } from "react";
import { Link } from "wouter";
import { Cell, Pie, PieChart as RePieChart } from "recharts";

export default function Reports() {
  const { isAuthenticated } = useAuth();
  const isMobile = useIsMobile();
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [groupId, setGroupId] = useState<string>("all");
  const [rangePreset, setRangePreset] = useState<"all" | "7d" | "30d" | "90d" | "custom">("all");
  const [categoriesOpen, setCategoriesOpen] = useState(!isMobile);

  const toLocalDateInput = (date: Date) => {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, "0");
    const d = String(date.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  };

  const toStartOfDay = (dateInput: string) => new Date(`${dateInput}T00:00:00`);
  const toEndOfDay = (dateInput: string) => new Date(`${dateInput}T23:59:59.999`);

  const queryInput = useMemo(() => {
    const hasDates = Boolean(startDate && endDate);
    const hasGroup = groupId !== "all";
    if (!hasDates && !hasGroup) return undefined;
    return {
      ...(hasDates ? { startDate: toStartOfDay(startDate), endDate: toEndOfDay(endDate) } : {}),
      ...(hasGroup ? { groupId } : {}),
    };
  }, [startDate, endDate, groupId]);

  const summaryQuery = trpc.reports.summary.useQuery(queryInput, { enabled: isAuthenticated });
  const groupsQuery = trpc.groups.list.useQuery(undefined, { enabled: isAuthenticated });

  const refetch = () => summaryQuery.refetch();

  const applyPreset = (preset: "all" | "7d" | "30d" | "90d" | "custom") => {
    setRangePreset(preset);
    if (preset === "custom") {
      setFiltersOpen(true);
      return;
    }
    if (preset === "all") {
      setStartDate("");
      setEndDate("");
      return;
    }

    const today = new Date();
    const end = new Date(today);
    const start = new Date(today);
    const days = preset === "7d" ? 7 : preset === "30d" ? 30 : 90;
    start.setDate(start.getDate() - days);

    setStartDate(toLocalDateInput(start));
    setEndDate(toLocalDateInput(end));
  };

  const summaryCards = summaryQuery.data
    ? [
        {
          title: "Total Pessoal",
          description: "Suas despesas",
          value: formatCents(summaryQuery.data.personalTotal),
          icon: Wallet,
          tone: "secondary" as const,
        },
        {
          title: "Total Compartilhado",
          description: "Todos os grupos",
          value: formatCents(summaryQuery.data.sharedTotal),
          icon: Users,
          tone: "primary" as const,
        },
        {
          title: "Total Geral",
          description: "Pessoal + grupo",
          value: formatCents(summaryQuery.data.grandTotal),
          icon: TrendingUp,
          tone: "accent" as const,
        },
      ]
    : [];

  const selectedGroupName = useMemo(() => {
    if (groupId === "all") return "Todos os grupos";
    const items = groupsQuery.data || [];
    const found = items.find((g: any) => g?.group?.id === groupId);
    return found?.group?.name || "Grupo";
  }, [groupId, groupsQuery.data]);

  const periodLabel = useMemo(() => {
    if (!startDate || !endDate) return "Tudo";
    return `${startDate} → ${endDate}`;
  }, [startDate, endDate]);

  const chartPalette = (index: number) => {
    const colors = ["var(--chart-1)", "var(--chart-2)", "var(--chart-3)", "var(--chart-4)", "var(--chart-5)"];
    return colors[index % colors.length];
  };

  const overviewBreakdown = useMemo(() => {
    if (!summaryQuery.data) {
      return { data: [], config: {} as Record<string, any> };
    }

    const data = [
      { key: "shared", label: "Compartilhado", value: summaryQuery.data.sharedTotal || 0, fill: "var(--chart-1)" },
      { key: "personal", label: "Pessoal", value: summaryQuery.data.personalTotal || 0, fill: "var(--chart-3)" },
    ].filter((d) => d.value > 0);

    const config = {
      shared: { label: "Compartilhado", color: "var(--chart-1)" },
      personal: { label: "Pessoal", color: "var(--chart-3)" },
    };

    return { data, config };
  }, [summaryQuery.data]);

  const categoryBreakdown = useMemo(() => {
    if (!summaryQuery.data) {
      return { data: [], config: {} as Record<string, any> };
    }
    const raw = (summaryQuery.data.categories || []).filter((c) => (c.total || 0) > 0);
    const data = raw.map((c, index) => {
      const key = `cat-${index}`;
      return { key, category: c.name, value: c.total, fill: chartPalette(index) };
    });
    const config = Object.fromEntries(
      data.map((d) => [d.key, { label: d.category, color: d.fill }])
    );
    return { data, config };
  }, [summaryQuery.data]);

  const categoryRows = useMemo(() => {
    if (!summaryQuery.data) return [];
    const total = summaryQuery.data.grandTotal || 0;
    return summaryQuery.data.categories.map((c, index) => {
      const bars = ["bg-primary/40", "bg-secondary/40", "bg-accent/40", "bg-info/40", "bg-success/40"];
      const barClass = bars[index % bars.length];
      const percent = total ? (c.total / total) * 100 : 0;
      return { name: c.name, total: c.total, barClass, percent };
    });
  }, [summaryQuery.data]);

  const hasAnyData = useMemo(() => {
    if (!summaryQuery.data) return false;
    if ((summaryQuery.data.grandTotal || 0) > 0) return true;
    if ((summaryQuery.data.personalTotal || 0) > 0) return true;
    if ((summaryQuery.data.sharedTotal || 0) > 0) return true;
    return (summaryQuery.data.categories || []).some((c) => (c.total || 0) > 0);
  }, [summaryQuery.data]);

  const scrollToCategories = () => {
    if (typeof window === "undefined") return;
    setCategoriesOpen(true);
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        document.getElementById("reports-categories")?.scrollIntoView({ behavior: "smooth", block: "start" });
      });
    });
  };

  return (
    <div className="space-y-4 sm:space-y-6 animate-fade-in">
      <div className="rounded-3xl border border-border/60 bg-primary text-primary-foreground px-5 py-5 shadow-sm">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h1 className="font-display text-2xl font-semibold tracking-tight sm:text-3xl">Relatórios</h1>
            <p className="mt-1 text-sm/5 text-primary-foreground/80">
              {selectedGroupName} • {periodLabel}
            </p>
          </div>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={() => setFiltersOpen((v) => !v)}
            className="gap-2 rounded-2xl"
          >
            <Filter className="h-4 w-4" /> Filtros
          </Button>
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-border/60 bg-card/60 p-1">
        <ToggleGroup
          type="single"
          value={rangePreset}
          onValueChange={(v) => applyPreset(((v as any) || "all") as any)}
          className="w-full"
          variant="outline"
        >
          <ToggleGroupItem value="all" className="flex-1 rounded-xl">
            Tudo
          </ToggleGroupItem>
          <ToggleGroupItem value="7d" className="flex-1 rounded-xl">
            7d
          </ToggleGroupItem>
          <ToggleGroupItem value="30d" className="flex-1 rounded-xl">
            30d
          </ToggleGroupItem>
          <ToggleGroupItem value="custom" className="flex-1 rounded-xl">
            Período
          </ToggleGroupItem>
        </ToggleGroup>
      </div>

      <Accordion
        type="single"
        collapsible
        value={filtersOpen ? "filters" : undefined}
        onValueChange={(v) => setFiltersOpen(v === "filters")}
      >
        <AccordionItem value="filters" className="border-none">
          <AccordionTrigger className="rounded-2xl border border-border/60 bg-card/60 px-4 py-3 hover:no-underline">
            <span className="flex flex-col items-start">
              <span className="text-sm font-semibold">Filtros</span>
              <span className="text-xs text-muted-foreground">Defina um período e atualize</span>
            </span>
          </AccordionTrigger>
          <AccordionContent className="pt-3">
            <div className="grid gap-3 sm:grid-cols-[minmax(180px,1fr)_140px_140px_auto]">
              <div className="space-y-1">
                <label className="text-xs font-medium">Grupo</label>
                <Select
                  value={groupId}
                  onValueChange={(v) => {
                    setGroupId(v);
                    setFiltersOpen(true);
                  }}
                >
                  <SelectTrigger className="w-full rounded-2xl">
                    <SelectValue placeholder="Todos os grupos" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos os grupos</SelectItem>
                    {(groupsQuery.data || []).map((g: any) => (
                      <SelectItem key={g.group.id} value={g.group.id}>
                        {g.group.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium">Início</label>
                <Input
                  type="date"
                  value={startDate}
                  onChange={(e) => {
                    setRangePreset("custom");
                    setStartDate(e.target.value);
                  }}
                  className="w-full rounded-2xl"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium">Fim</label>
                <Input
                  type="date"
                  value={endDate}
                  onChange={(e) => {
                    setRangePreset("custom");
                    setEndDate(e.target.value);
                  }}
                  className="w-full rounded-2xl"
                />
              </div>
              <div className="flex items-end">
                <Button
                  onClick={refetch}
                  variant="outline"
                  size="sm"
                  disabled={summaryQuery.isFetching}
                  className="interactive-tap w-full gap-1 rounded-2xl sm:w-auto"
                >
                  {summaryQuery.isFetching && <Loader2 className="h-4 w-4 animate-spin" />}
                  <RefreshCcw className="h-4 w-4" /> Atualizar
                </Button>
              </div>
            </div>
          </AccordionContent>
        </AccordionItem>
      </Accordion>

      {summaryQuery.isLoading ? (
        <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin" /></div>
      ) : summaryQuery.isError ? (
        <div className="rounded-2xl border border-border/60 bg-card/60 p-4">
          <p className="text-sm font-semibold">Não foi possível carregar</p>
          <p className="mt-1 text-xs text-muted-foreground">{summaryQuery.error.message}</p>
        </div>
      ) : summaryQuery.data ? (
        <>
          {!hasAnyData ? (
            <Card className="bg-card/80">
              <CardContent className="p-4">
                <EmptyState
                  title="Ainda não há despesas neste período"
                  description="Comece adicionando uma nova despesa para ver seus totais e categorias aqui."
                  icon={<BarChart3 className="h-10 w-10" />}
                  cta={
                    <Button asChild className="gap-2">
                      <Link href="/shared-expenses">Adicionar despesa</Link>
                    </Button>
                  }
                />
              </CardContent>
            </Card>
          ) : null}

          <Accordion type="single" collapsible defaultValue={isMobile ? undefined : "summary"}>
            <AccordionItem value="summary" className="border-none">
              <AccordionTrigger className="rounded-2xl border border-border/60 bg-card/60 px-4 py-3 hover:no-underline">
                <span className="flex flex-col items-start">
                  <span className="text-sm font-semibold">Resumo</span>
                  <span className="text-xs text-muted-foreground">
                    Total geral:{" "}
                    <span className="font-display tabular-nums tracking-tight">
                      {formatCents(summaryQuery.data.grandTotal)}
                    </span>
                  </span>
                </span>
              </AccordionTrigger>
              <AccordionContent className="pt-3">
                <div className="grid gap-3 sm:grid-cols-2">
                  <Card className="rounded-2xl border border-border/60 bg-card shadow-sm">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm">Divisão geral</CardTitle>
                      <CardDescription className="text-xs">Pessoal vs compartilhado</CardDescription>
                    </CardHeader>
                    <CardContent>
                      {overviewBreakdown.data.length === 0 ? (
                        <p className="text-xs text-muted-foreground">Sem dados suficientes.</p>
                      ) : (
                        <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_180px] sm:items-center">
                          <div className="space-y-2">
                            {summaryCards.map((card) => {
                              const Icon = card.icon;
                              const iconClass =
                                card.tone === "primary"
                                  ? "bg-primary/10 text-primary"
                                  : card.tone === "secondary"
                                    ? "bg-secondary/10 text-secondary"
                                    : "bg-accent/10 text-accent";

                              return (
                                <Card key={card.title} className="rounded-2xl border border-border/60 bg-background/60">
                                  <CardContent className="p-3">
                                    <div className="flex items-start justify-between gap-3">
                                      <div className="min-w-0">
                                        <p className="text-sm font-semibold">{card.title}</p>
                                        <p className="text-[11px] text-muted-foreground">{card.description}</p>
                                      </div>
                                      <div className="flex items-center gap-2">
                                        <p className="font-display text-base font-semibold tabular-nums tracking-tight">{card.value}</p>
                                        <div className={`rounded-xl p-2 ${iconClass}`}>
                                          <Icon className="h-4 w-4" />
                                        </div>
                                      </div>
                                    </div>
                                  </CardContent>
                                </Card>
                              );
                            })}
                          </div>

                          <ChartContainer className="aspect-square w-full sm:w-[180px]" config={overviewBreakdown.config}>
                            <RePieChart>
                              <ChartTooltip
                                content={
                                  <ChartTooltipContent
                                    nameKey="key"
                                    formatter={(value) => (
                                      <span className="font-display tabular-nums text-foreground font-semibold">
                                        {formatCents(Number(value) || 0)}
                                      </span>
                                    )}
                                  />
                                }
                              />
                              <Pie
                                data={overviewBreakdown.data}
                                dataKey="value"
                                nameKey="key"
                                innerRadius={50}
                                outerRadius={75}
                                stroke="transparent"
                              >
                                {overviewBreakdown.data.map((entry) => (
                                  <Cell key={entry.key} fill={entry.fill} />
                                ))}
                              </Pie>
                            </RePieChart>
                          </ChartContainer>
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  <Card className="rounded-2xl border border-border/60 bg-card shadow-sm">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm">Categorias</CardTitle>
                      <CardDescription className="text-xs">Distribuição no período</CardDescription>
                    </CardHeader>
                    <CardContent>
                      {categoryBreakdown.data.length === 0 ? (
                        <p className="text-xs text-muted-foreground">Sem dados suficientes.</p>
                      ) : (
                        <div className="space-y-2">
                          <Button
                            type="button"
                            onClick={scrollToCategories}
                            variant="outline"
                            size="sm"
                            className="w-full gap-2 rounded-2xl"
                          >
                            <BarChart3 className="h-4 w-4" /> Ver detalhes por categoria
                          </Button>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <span className="h-2 w-2 rounded-full" style={{ background: "var(--chart-1)" }} /> Compartilhado
                            <span className="h-2 w-2 rounded-full" style={{ background: "var(--chart-3)" }} /> Pessoal
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>
              </AccordionContent>
            </AccordionItem>
          </Accordion>

          <div id="reports-categories" />
          <Accordion
            type="single"
            collapsible
            value={categoriesOpen ? "categories" : undefined}
            onValueChange={(v) => setCategoriesOpen(v === "categories")}
          >
            <AccordionItem value="categories" className="border-none">
              <AccordionTrigger className="rounded-2xl border border-border/70 bg-card/60 px-4 py-3 hover:no-underline">
                <span className="flex flex-col items-start">
                  <span className="text-sm font-semibold">Detalhar por categoria</span>
                  <span className="text-xs text-muted-foreground">Opcional</span>
                </span>
              </AccordionTrigger>
              <AccordionContent className="pt-3">
                <Card className="rounded-2xl border border-border/70">
                  <CardContent className="p-4">
                    {categoryBreakdown.data.length === 0 ? (
                      <p className="text-sm text-muted-foreground">Sem dados</p>
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

                        <ChartContainer className="aspect-square w-full sm:w-[220px]" config={categoryBreakdown.config}>
                          <RePieChart>
                            <ChartTooltip
                              content={
                                <ChartTooltipContent
                                  nameKey="key"
                                  formatter={(value) => (
                                    <span className="font-display tabular-nums text-foreground font-semibold">
                                      {formatCents(Number(value) || 0)}
                                    </span>
                                  )}
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

                    {categoryRows.length > 0 ? (
                      <div className="mt-4 space-y-3 text-sm">
                        <p className="text-xs font-medium text-muted-foreground">Participação (%)</p>
                        {categoryRows.map((row) => (
                          <div key={row.name} className="space-y-1">
                            <div className="flex items-center justify-between gap-2">
                              <span className="truncate font-medium">{row.name}</span>
                              <span className="font-display font-semibold tabular-nums tracking-tight">{formatCents(row.total)}</span>
                            </div>
                            <div className="h-1.5 w-full rounded-full bg-muted">
                              <div
                                className={`h-full rounded-full ${row.barClass}`}
                                style={{ width: `${Math.min(100, row.percent)}%` }}
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : null}
                  </CardContent>
                </Card>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </>
      ) : (
        <p className="text-muted-foreground">Sem dados</p>
      )}
    </div>
  );
}
