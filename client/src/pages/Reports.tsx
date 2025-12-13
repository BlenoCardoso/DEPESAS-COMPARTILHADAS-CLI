import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useIsMobile } from "@/hooks/useMobile";
import { trpc } from "@/lib/trpc";
import { formatCents } from "@/lib/utils";
import { Loader2, RefreshCcw, TrendingUp, Wallet, Users } from "lucide-react";
import { useState } from "react";

export default function Reports() {
  const { isAuthenticated } = useAuth();
  const isMobile = useIsMobile();
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");
  const summaryQuery = trpc.reports.summary.useQuery(
    startDate && endDate ? { startDate: new Date(startDate), endDate: new Date(endDate) } : undefined,
    { enabled: isAuthenticated }
  );

  const refetch = () => summaryQuery.refetch();

  const summaryCards = summaryQuery.data
    ? [
        {
          title: "Total Pessoal",
          description: "Somatório das suas despesas",
          value: formatCents(summaryQuery.data.personalTotal),
          icon: Wallet,
          gradient: "from-secondary/90 to-secondary",
        },
        {
          title: "Total Compartilhado",
          description: "Todos os grupos",
          value: formatCents(summaryQuery.data.sharedTotal),
          icon: Users,
          gradient: "from-primary/90 to-primary/70",
        },
        {
          title: "Total Geral",
          description: "Pessoal + Compartilhado",
          value: formatCents(summaryQuery.data.grandTotal),
          icon: TrendingUp,
          gradient: "from-accent/90 to-accent/70",
        },
      ]
    : [];

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold sm:text-3xl">Relatórios</h1>
          <p className="text-sm text-muted-foreground">Visualize estatísticas agregadas</p>
        </div>
        <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:flex-wrap sm:items-end">
          <div className="space-y-1 sm:w-auto">
            <label className="text-xs font-medium">Início</label>
            <Input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="w-full sm:w-[140px]" />
          </div>
          <div className="space-y-1 sm:w-auto">
            <label className="text-xs font-medium">Fim</label>
            <Input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="w-full sm:w-[140px]" />
          </div>
          <Button
            onClick={refetch}
            variant="outline"
            size="sm"
            disabled={summaryQuery.isFetching}
            className="w-full gap-1 sm:w-auto"
          >
            {summaryQuery.isFetching && <Loader2 className="h-4 w-4 animate-spin" />}
            <RefreshCcw className="h-4 w-4" /> Atualizar
          </Button>
        </div>
      </div>

      {summaryQuery.isLoading ? (
        <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin" /></div>
      ) : summaryQuery.data ? (
        <>
          <div className="grid gap-3 sm:gap-4 md:grid-cols-3">
            {summaryCards.map(card => {
              const Icon = card.icon;
              return (
                <Card key={card.title} className={`rounded-2xl border-0 text-white shadow-lg bg-gradient-to-br ${card.gradient}`}>
                  <CardHeader className="flex flex-row items-start justify-between pb-2">
                    <div>
                      <CardTitle className="text-base font-medium text-white/90">{card.title}</CardTitle>
                      <CardDescription className="text-white/70">{card.description}</CardDescription>
                    </div>
                    <div className="rounded-xl bg-white/20 p-2 text-white">
                      <Icon className="h-5 w-5" />
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-3xl font-semibold tracking-tight">{card.value}</p>
                  </CardContent>
                </Card>
              );
            })}
          </div>
          <Accordion type="single" collapsible defaultValue={isMobile ? undefined : "categories"}>
            <AccordionItem value="categories" className="border-none">
              <AccordionTrigger className="rounded-2xl border border-border/70 bg-card/60 px-4 py-3 hover:no-underline">
                <span className="flex flex-col items-start">
                  <span className="text-sm font-semibold">Detalhar por categoria</span>
                  <span className="text-xs text-muted-foreground">Toque para expandir</span>
                </span>
              </AccordionTrigger>
              <AccordionContent className="pt-3">
                <Card className="rounded-2xl border border-border/70">
                  <CardHeader className="pb-2">
                    <CardTitle>Por Categoria</CardTitle>
                    <CardDescription>Soma em reais</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4 text-sm">
                    {summaryQuery.data.categories.length === 0 && <p className="text-muted-foreground">Sem dados</p>}
                    {summaryQuery.data.categories.map((c, index) => {
                      const colors = ["from-primary/60", "from-secondary/60", "from-accent/60", "from-info/60", "from-success/60"];
                      const color = colors[index % colors.length];
                      const percent = summaryQuery.data.grandTotal
                        ? (c.total / summaryQuery.data.grandTotal) * 100
                        : 0;
                      return (
                        <div key={c.name} className="space-y-1">
                          <div className="flex items-center justify-between">
                            <span className="font-medium">{c.name}</span>
                            <span className="font-semibold">{formatCents(c.total)}</span>
                          </div>
                          <div className="h-2 w-full rounded-full bg-muted">
                            <div
                              className={`h-full rounded-full bg-gradient-to-r ${color} to-transparent`}
                              style={{ width: `${Math.min(100, percent)}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
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
