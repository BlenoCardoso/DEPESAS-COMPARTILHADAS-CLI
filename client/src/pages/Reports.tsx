import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { trpc } from "@/lib/trpc";
import { formatCents } from "@/lib/utils";
import { Loader2, RefreshCcw } from "lucide-react";
import { useState } from "react";

export default function Reports() {
  const { isAuthenticated } = useAuth();
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");
  const summaryQuery = trpc.reports.summary.useQuery(
    startDate && endDate ? { startDate: new Date(startDate), endDate: new Date(endDate) } : undefined,
    { enabled: isAuthenticated }
  );

  const refetch = () => summaryQuery.refetch();

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Relatórios</h1>
          <p className="text-muted-foreground">Visualize estatísticas agregadas</p>
        </div>
        <div className="flex flex-wrap gap-2 items-end">
          <div className="space-y-1">
            <label className="text-xs font-medium">Início</label>
            <Input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="w-[140px]" />
          </div>
            <div className="space-y-1">
            <label className="text-xs font-medium">Fim</label>
            <Input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="w-[140px]" />
          </div>
          <Button onClick={refetch} variant="outline" size="sm" disabled={summaryQuery.isFetching} className="gap-1">
            {summaryQuery.isFetching && <Loader2 className="h-4 w-4 animate-spin" />}
            <RefreshCcw className="h-4 w-4" /> Atualizar
          </Button>
        </div>
      </div>

      {summaryQuery.isLoading ? (
        <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin" /></div>
      ) : summaryQuery.data ? (
        <>
          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardHeader className="pb-2"><CardTitle>Total Pessoal</CardTitle><CardDescription>Somatório das suas despesas</CardDescription></CardHeader>
              <CardContent className="text-2xl font-semibold">{formatCents(summaryQuery.data.personalTotal)}</CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2"><CardTitle>Total Compartilhado</CardTitle><CardDescription>Todos os grupos</CardDescription></CardHeader>
              <CardContent className="text-2xl font-semibold">{formatCents(summaryQuery.data.sharedTotal)}</CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2"><CardTitle>Total Geral</CardTitle><CardDescription>Pessoal + Compartilhado</CardDescription></CardHeader>
              <CardContent className="text-2xl font-semibold">{formatCents(summaryQuery.data.grandTotal)}</CardContent>
            </Card>
          </div>
          <Card>
            <CardHeader className="pb-2"><CardTitle>Por Categoria</CardTitle><CardDescription>Soma em reais</CardDescription></CardHeader>
            <CardContent className="space-y-2 text-sm">
              {summaryQuery.data.categories.length === 0 && <p className="text-muted-foreground">Sem dados</p>}
              {summaryQuery.data.categories.map(c => (
                <div key={c.name} className="flex justify-between"><span>{c.name}</span><span className="font-medium">{formatCents(c.total)}</span></div>
              ))}
            </CardContent>
          </Card>
        </>
      ) : (
        <p className="text-muted-foreground">Sem dados</p>
      )}
    </div>
  );
}
