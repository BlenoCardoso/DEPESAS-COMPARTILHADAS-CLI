import { useAuth } from "@/_core/hooks/useAuth";
import { EmptyState } from "@/components/EmptyState";
import { PageContainer } from "@/components/layout/PageContainer";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { trpc } from "@/lib/trpc";
import { Loader2, MoreVertical, Pencil, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { formatCents, parseReaisToCents } from "@/lib/utils";
import { motion } from "framer-motion";
import { useIsMobile } from "@/hooks/useMobile";

export default function PersonalExpenses() {
  const { isAuthenticated } = useAuth();
  const isMobile = useIsMobile();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [amount, setAmount] = useState(""); // valor em reais (string)
  const [editing, setEditing] = useState<any | null>(null);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [category, setCategory] = useState("");
  const [date, setDate] = useState<string>(() => new Date().toISOString().substring(0, 10));

  const { data: expenses, isLoading, refetch } = trpc.personalExpenses.list.useQuery(undefined, { enabled: isAuthenticated });
  const expensesList = (expenses as any[]) ?? [];
  const totalAmount = expensesList.reduce((sum, item) => sum + (item.amount || 0), 0);
  const lastUpdate = expensesList[0]?.updatedAt
    ? new Date(expensesList[0].updatedAt).toLocaleDateString("pt-BR")
    : new Date().toLocaleDateString("pt-BR");
  const heroStats = [
    {
      label: "Lançamentos",
      value: expensesList.length,
      helper: expensesList.length === 1 ? "item registrado" : "itens registrados",
    },
    {
      label: "Total acumulado",
      value: formatCents(totalAmount),
      helper: "Atualizado em tempo real",
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

  return (
    <div className="space-y-4 sm:space-y-6 animate-fade-in">
      <PageContainer className="app-hero">
        <div className="space-y-3">
          <p className="text-xs uppercase tracking-widest text-muted-foreground">Finanças pessoais</p>
          <h1 className="text-2xl font-semibold leading-tight sm:text-4xl">Despesas pessoais</h1>

          <Accordion type="single" collapsible defaultValue={isMobile ? undefined : "stats"}>
            <AccordionItem value="stats" className="border-none">
              <AccordionTrigger className="rounded-2xl border border-border/60 bg-card/60 px-4 py-3 hover:no-underline">
                <span className="flex flex-col items-start">
                  <span className="text-sm font-semibold">Resumo</span>
                  <span className="text-xs text-muted-foreground">Toque para ver estatísticas</span>
                </span>
              </AccordionTrigger>
              <AccordionContent className="pt-3">
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                  {heroStats.map((stat) => (
                    <motion.div
                      key={stat.label}
                      initial={{ opacity: 0, y: 16 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ type: "spring", stiffness: 200, damping: 22 }}
                      className="glass-panel rounded-3xl border border-border/70 p-4"
                    >
                      <p className="text-xs uppercase tracking-widest text-muted-foreground">{stat.label}</p>
                      <p className="text-2xl font-semibold">{stat.value}</p>
                      <p className="text-xs text-muted-foreground">{stat.helper}</p>
                    </motion.div>
                  ))}
                </div>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </div>
      </PageContainer>

      <PageContainer className="glass-panel rounded-3xl border border-border/70 bg-card/70">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-xl font-semibold">Registrar despesas</h2>
            <p className="text-sm text-muted-foreground">Cadastre novos itens ou edite lançamentos existentes.</p>
          </div>
          <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
            <DialogTrigger asChild>
              <Button className="w-full gap-2 sm:w-auto"><Plus className="h-4 w-4" /> Nova despesa</Button>
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
        </div>
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
      ) : expensesList.length === 0 ? (
        <PageContainer className="rounded-3xl border border-border/60 bg-card/80">
          <EmptyState
            title="Sem despesas registradas"
            description="Organize recibos pessoais, metas e comprovantes em um só lugar."
            cta={<Button onClick={() => setIsCreateOpen(true)} className="gap-2"><Plus className="h-4 w-4" />Adicionar agora</Button>}
          />
        </PageContainer>
      ) : (
        <PageContainer className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {expensesList.map((item: any) => (
            <motion.div
              key={item.id}
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ type: "spring", stiffness: 170, damping: 20 }}
            >
              <Card className="interactive-card rounded-3xl border border-border/60 bg-card/80">
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-start justify-between gap-3 text-lg">
                    <span>{item.title}</span>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="rounded-xl" aria-label="Mais opções">
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
                  </CardTitle>
                  <CardDescription>{item.category || 'Sem categoria'}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  <div className="flex items-center justify-between"><span>Valor</span><span className="font-semibold">{formatCents(item.amount)}</span></div>
                  <div className="flex items-center justify-between"><span>Data</span><span>{item.date ? new Date(item.date).toLocaleDateString('pt-BR') : '-'}</span></div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </PageContainer>
      )}
    </div>
  );
}
