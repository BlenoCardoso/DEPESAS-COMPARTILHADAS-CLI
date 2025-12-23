import { useAuth } from "@/_core/hooks/useAuth";
import { EmptyState } from "@/components/EmptyState";
import { PageContainer } from "@/components/layout/PageContainer";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { trpc } from "@/lib/trpc";
import { ArrowUpDown, Check, Loader2, MoreVertical, Pencil, Plus, Trash2, Wallet } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { formatCents, parseReaisToCents } from "@/lib/utils";
import { CategoryPill } from "@/components/CategoryVisual";
import { motion } from "framer-motion";
import { useIsMobile } from "@/hooks/useMobile";
import { useLocation } from "wouter";

export default function PersonalExpenses() {
  const { isAuthenticated } = useAuth();
  const isMobile = useIsMobile();
  const [location, navigate] = useLocation();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [amount, setAmount] = useState(""); // valor em reais (string)
  const [editing, setEditing] = useState<any | null>(null);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [category, setCategory] = useState("");
  const [date, setDate] = useState<string>(() => new Date().toISOString().substring(0, 10));
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [filterText, setFilterText] = useState("");
  const [filterCategory, setFilterCategory] = useState("");
  const [filterStart, setFilterStart] = useState("");
  const [filterEnd, setFilterEnd] = useState("");
  const [sortOrder, setSortOrder] = useState<"desc" | "asc">("desc");

  const { data: expenses, isLoading, refetch } = trpc.personalExpenses.list.useQuery(undefined, { enabled: isAuthenticated });
  const expensesList = (expenses as any[]) ?? [];

  const visibleExpenses = useMemo(() => {
    let list = expensesList;
    if (filterText) {
      const q = filterText.toLowerCase();
      list = list.filter((e) => String(e?.title || "").toLowerCase().includes(q));
    }
    if (filterCategory) {
      const q = filterCategory.toLowerCase();
      list = list.filter((e) => String(e?.category || "").toLowerCase().includes(q));
    }
    if (filterStart) {
      const start = new Date(filterStart);
      list = list.filter((e) => (e?.date ? new Date(e.date) >= start : false));
    }
    if (filterEnd) {
      const end = new Date(filterEnd);
      list = list.filter((e) => (e?.date ? new Date(e.date) <= end : false));
    }
    return list;
  }, [expensesList, filterCategory, filterEnd, filterStart, filterText]);

  const groupedVisibleExpenses = useMemo(() => {
    const sorted = visibleExpenses.slice();
    sorted.sort((a, b) => {
      const at = a?.date ? new Date(a.date).getTime() : 0;
      const bt = b?.date ? new Date(b.date).getTime() : 0;
      return sortOrder === "asc" ? at - bt : bt - at;
    });

    const groups = new Map<string, any[]>();
    for (const item of sorted) {
      const d = item?.date ? new Date(item.date) : null;
      const key = d ? `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}` : "sem-data";
      const arr = groups.get(key);
      if (arr) arr.push(item);
      else groups.set(key, [item]);
    }

    return Array.from(groups.entries()).map(([key, items]) => {
      let label = "Sem data";
      if (key !== "sem-data") {
        const [yy, mm] = key.split("-").map((n) => parseInt(n, 10));
        if (yy && mm) {
          const d = new Date(yy, mm - 1, 1);
          label = d.toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
        }
      }
      return { key, label, items };
    });
  }, [sortOrder, visibleExpenses]);

  const totalAmount = visibleExpenses.reduce((sum, item) => sum + (item.amount || 0), 0);
  const lastUpdate = (visibleExpenses[0] as any)?.updatedAt
    ? new Date((visibleExpenses[0] as any).updatedAt).toLocaleDateString("pt-BR")
    : new Date().toLocaleDateString("pt-BR");
  const heroStats = [
    {
      label: "Lançamentos",
      value: visibleExpenses.length,
      helper: visibleExpenses.length === 1 ? "item" : "itens",
    },
    {
      label: "Total acumulado",
      value: formatCents(totalAmount),
      helper: "Atualizado automaticamente",
    },
    {
      label: "Última atualização",
      value: lastUpdate,
      helper: "Baseado nos dados mais recentes",
    },
  ];

  const createMutation = trpc.personalExpenses.create.useMutation({
    onSuccess: () => {
      toast.success("Despesa criada");
      setIsCreateOpen(false);
      setTitle("");
      setAmount("");
      setCategory("");
      refetch();
    },
    onError: e => toast.error(e.message),
  });

  const deleteMutation = trpc.personalExpenses.delete.useMutation({
    onSuccess: () => { toast.success("Removida"); refetch(); },
    onError: e => toast.error(e.message),
  });

  const updateMutation = trpc.personalExpenses.update.useMutation({
    onSuccess: () => { toast.success("Atualizado"); setIsEditOpen(false); refetch(); },
    onError: e => toast.error(e.message),
  });

  const handleCreate = () => {
    const cents = parseReaisToCents(amount);
    if (!title.trim() || !cents) { toast.error("Título e valor obrigatórios"); return; }
    // description removida para evitar envio de undefined ao Firestore
    createMutation.mutate({ title, amount: cents, date: new Date(date + 'T00:00:00'), currency: 'BRL', category: category || undefined });
  };
  const startEdit = (item: any) => {
    setEditing(item);
    setTitle(item.title);
    setAmount((item.amount / 100).toString());
    setCategory(item.category || "");
    setDate(item.date ? new Date(item.date).toISOString().substring(0,10) : new Date().toISOString().substring(0,10));
    setIsEditOpen(true);
  };

  const handleUpdate = () => {
    if (!editing) return;
    const cents = parseReaisToCents(amount);
    updateMutation.mutate({ id: editing.id, title: title || undefined, amount: cents || undefined, category: category || undefined, date: new Date(date + 'T00:00:00') });
  };

  const handleDelete = (id: string) => { if (confirm("Remover despesa?")) deleteMutation.mutate({ id }); };

  useEffect(() => {
    if (!isMobile) return;
    if (!location || !location.includes("create=1")) return;
    setIsCreateOpen(true);
    const clean = (location.split("?")[0] || "/personal-expenses").split("#")[0] || "/personal-expenses";
    if (clean !== location) navigate(clean);
  }, [isMobile, location]);

  return (
    <div className="space-y-4 sm:space-y-6 animate-fade-in">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold sm:text-3xl">Despesas pessoais</h1>
        <p className="text-sm text-muted-foreground">Lançamentos pessoais, rápidos e organizados.</p>
      </div>

      <div className="overflow-hidden rounded-2xl border border-border/60 bg-card/60 p-1">
        <ToggleGroup type="single" value="personal" className="w-full" variant="outline">
          <ToggleGroupItem
            value="shared"
            className="flex-1 rounded-xl"
            onClick={() => navigate("/shared-expenses")}
          >
            Compartilhadas
          </ToggleGroupItem>
          <ToggleGroupItem
            value="personal"
            className="flex-1 rounded-xl data-[state=on]:bg-primary/15 data-[state=on]:text-primary"
          >
            Pessoais
          </ToggleGroupItem>
        </ToggleGroup>
      </div>

      <Accordion type="single" collapsible defaultValue={undefined}>
        <AccordionItem value="stats" className="border-none">
          <AccordionTrigger className="rounded-2xl border border-border/60 bg-card/60 px-4 py-3 hover:no-underline">
            <span className="flex flex-col items-start">
              <span className="text-sm font-semibold">Resumo</span>
              <span className="text-xs text-muted-foreground">Totais e última atualização</span>
            </span>
          </AccordionTrigger>
          <AccordionContent className="pt-3">
            <div className="grid grid-cols-3 gap-2">
              <Card className="rounded-2xl border bg-card shadow-sm">
                <CardContent className="p-4">
                  <p className="text-xs text-muted-foreground">Itens</p>
                  <p className="font-display tabular-nums mt-1 text-2xl font-bold leading-none tracking-tight">{visibleExpenses.length}</p>
                </CardContent>
              </Card>
              <Card className="rounded-2xl border bg-card shadow-sm">
                <CardContent className="p-4">
                  <p className="text-xs text-muted-foreground">Total</p>
                  <p className="font-display tabular-nums mt-1 truncate text-base font-semibold leading-tight tracking-tight">{formatCents(totalAmount)}</p>
                </CardContent>
              </Card>
              <Card className="rounded-2xl border bg-card shadow-sm">
                <CardContent className="p-4">
                  <p className="text-xs text-muted-foreground">Atualizado</p>
                  <p className="mt-1 truncate text-base font-semibold leading-tight">{lastUpdate}</p>
                </CardContent>
              </Card>
            </div>
          </AccordionContent>
        </AccordionItem>
      </Accordion>

      <PageContainer className="rounded-2xl border border-border/60 bg-card/60 p-3 sm:p-4">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <div className="flex-1">
            <p className="text-sm font-semibold">Ações</p>
            <p className="text-xs text-muted-foreground">Crie e filtre lançamentos.</p>
          </div>

          <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
            <DialogTrigger asChild>
              <Button className="interactive-tap w-full gap-2 rounded-2xl sm:w-auto"><Plus className="h-4 w-4" /> Nova despesa</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Nova Despesa</DialogTitle>
                <DialogDescription>Registre uma despesa pessoal</DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-2">
                <div className="space-y-2"><Label>Título *</Label><Input value={title} onChange={e => setTitle(e.target.value)} /></div>
                <div className="space-y-2"><Label>Valor (R$) *</Label><Input value={amount} onChange={e => setAmount(e.target.value)} placeholder="Ex: 25.99" /></div>
                <div className="space-y-2"><Label>Categoria</Label><Input value={category} onChange={e => setCategory(e.target.value)} /></div>
                <div className="space-y-2"><Label>Data</Label><Input type="date" value={date} onChange={e => setDate(e.target.value)} /></div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsCreateOpen(false)}>Cancelar</Button>
                <Button onClick={handleCreate} disabled={createMutation.isPending}>{createMutation.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}Salvar</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="interactive-tap w-full gap-2 rounded-2xl sm:w-auto" aria-label="Ordenar">
                <ArrowUpDown className="h-4 w-4" />
                Ordenar
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem onClick={() => setSortOrder("desc")}>
                <span className="flex items-center gap-2">
                  {sortOrder === "desc" ? <Check className="h-4 w-4" /> : <span className="h-4 w-4" />}
                  Mais recentes
                </span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setSortOrder("asc")}>
                <span className="flex items-center gap-2">
                  {sortOrder === "asc" ? <Check className="h-4 w-4" /> : <span className="h-4 w-4" />}
                  Mais antigas
                </span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <Accordion type="single" collapsible value={filtersOpen ? "filters" : undefined} onValueChange={(v) => setFiltersOpen(v === "filters")}>
          <AccordionItem value="filters" className="mt-2 border-none">
            <AccordionTrigger className="rounded-2xl border border-border/60 bg-background/60 px-4 py-3 hover:no-underline">
              <span className="flex flex-col items-start">
                <span className="text-sm font-semibold">Filtros</span>
                <span className="text-xs text-muted-foreground">Busca, categoria e período</span>
              </span>
            </AccordionTrigger>
            <AccordionContent className="pt-3">
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                <div className="space-y-1">
                  <Label className="text-xs">Busca</Label>
                  <Input value={filterText} onChange={(e) => setFilterText(e.target.value)} placeholder="Título" className="w-full rounded-2xl" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Categoria</Label>
                  <Input value={filterCategory} onChange={(e) => setFilterCategory(e.target.value)} placeholder="Categoria" className="w-full rounded-2xl" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Início</Label>
                  <Input type="date" value={filterStart} onChange={(e) => setFilterStart(e.target.value)} className="w-full rounded-2xl" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Fim</Label>
                  <Input type="date" value={filterEnd} onChange={(e) => setFilterEnd(e.target.value)} className="w-full rounded-2xl" />
                </div>
                {(filterText || filterCategory || filterStart || filterEnd) && (
                  <div className="flex items-end">
                    <Button
                      type="button"
                      variant="outline"
                      className="interactive-tap w-full rounded-2xl"
                      onClick={() => {
                        setFilterText("");
                        setFilterCategory("");
                        setFilterStart("");
                        setFilterEnd("");
                      }}
                    >
                      Limpar filtros
                    </Button>
                  </div>
                )}
              </div>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </PageContainer>

      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Despesa</DialogTitle>
            <DialogDescription>Atualize os campos necessários</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2"><Label>Título</Label><Input value={title} onChange={e => setTitle(e.target.value)} /></div>
            <div className="space-y-2"><Label>Valor (R$)</Label><Input value={amount} onChange={e => setAmount(e.target.value)} /></div>
            <div className="space-y-2"><Label>Categoria</Label><Input value={category} onChange={e => setCategory(e.target.value)} /></div>
            <div className="space-y-2"><Label>Data</Label><Input type="date" value={date} onChange={e => setDate(e.target.value)} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditOpen(false)}>Cancelar</Button>
            <Button onClick={handleUpdate} disabled={updateMutation.isPending}>{updateMutation.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {isLoading ? (
        <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin" /></div>
      ) : visibleExpenses.length === 0 ? (
        <PageContainer className="rounded-2xl border border-border/60 bg-card/80">
          <EmptyState
            title="Sem despesas registradas"
            description="Registre seus lançamentos pessoais." 
            icon={<Wallet className="h-10 w-10" />}
            cta={<Button onClick={() => setIsCreateOpen(true)} className="gap-2"><Plus className="h-4 w-4" />Adicionar agora</Button>}
          />
        </PageContainer>
      ) : (
        <PageContainer className="space-y-2">
          {groupedVisibleExpenses.map((g) => (
            <div key={g.key} className="space-y-2">
              <div className="pt-2">
                <p className="px-1 text-xs font-semibold text-muted-foreground">{g.label}</p>
              </div>

              {g.items.map((item: any) => (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ type: "spring", stiffness: 170, damping: 20 }}
                >
                  <Card className="interactive-card rounded-2xl border bg-card shadow-sm transition-all duration-150 hover:-translate-y-0.5 hover:shadow-md">
                    <CardContent className="p-3">
                      <div className="flex items-start gap-3">
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-semibold">{item.title}</p>
                          <div className="mt-2 flex flex-wrap items-center gap-2">
                            <span className="text-[11px] text-muted-foreground">
                              {item.date ? new Date(item.date).toLocaleDateString("pt-BR") : "—"}
                            </span>
                            {item.category ? (
                              <CategoryPill name={item.category} />
                            ) : null}
                          </div>
                        </div>

                        <div className="flex items-center gap-1">
                          <div className="text-right">
                            <p className="text-sm font-semibold">{formatCents(item.amount)}</p>
                            <p className="text-[11px] text-muted-foreground">total</p>
                          </div>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="interactive-tap h-9 w-9 rounded-2xl" aria-label="Mais opções">
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-44">
                              <DropdownMenuItem onClick={() => startEdit(item)}>
                                <span className="flex items-center gap-2">
                                  <Pencil className="h-4 w-4" />
                                  Editar
                                </span>
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                className="text-destructive focus:text-destructive"
                                onClick={() => handleDelete(item.id)}
                                disabled={deleteMutation.isPending}
                              >
                                <span className="flex items-center gap-2">
                                  <Trash2 className="h-4 w-4" />
                                  Remover
                                </span>
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          ))}
        </PageContainer>
      )}
    </div>
  );
}
