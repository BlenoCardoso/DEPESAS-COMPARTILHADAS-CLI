import { useAuth } from "@/_core/hooks/useAuth";
import { EmptyState } from "@/components/EmptyState";
import { PageContainer } from "@/components/layout/PageContainer";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { trpc } from "@/lib/trpc";
import { CheckCircle2, Loader2, MoreVertical, Pencil, Plus, Trash2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useCurrentGroup } from "@/contexts/CurrentGroupContext";
import { toast } from "sonner";
import { formatCents, userLabel } from "@/lib/utils";
import { useIsMobile } from "@/hooks/useMobile";
import { motion } from "framer-motion";
import { useLocation } from "wouter";

export default function SharedExpenses() {
  const { isAuthenticated, user } = useAuth();
  const { currentGroup, setCurrentGroupId } = useCurrentGroup();
  const groupId = currentGroup?.id ?? null;
  const [, navigate] = useLocation();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [amount, setAmount] = useState(""); // centavos (input em centavos para manter lógica de splits)
  const [category, setCategory] = useState("");
  const [date, setDate] = useState<string>(() => new Date().toISOString().substring(0, 10));
  const [allowMemberEdits, setAllowMemberEdits] = useState(false);
  // filtros
  const [filterText, setFilterText] = useState("");
  const [filterCategory, setFilterCategory] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [filterStart, setFilterStart] = useState("");
  const [filterEnd, setFilterEnd] = useState("");
  const [segment, setSegment] = useState<"all" | "shared" | "personal" | "pending" | "paid">("shared");

  useEffect(() => {
    if (segment === "all" || segment === "personal") return;
    if (filterStatus === "pending") {
      setSegment("pending");
      return;
    }
    if (filterStatus === "validated") {
      setSegment("paid");
      return;
    }
    if (!filterStatus) {
      setSegment("shared");
    }
  }, [filterStatus, segment]);
  // edição
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editing, setEditing] = useState<any | null>(null);
  // detalhes
  const [detailId, setDetailId] = useState<string | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [detailAllowMemberEdits, setDetailAllowMemberEdits] = useState(false);
  const isMobile = useIsMobile();
  const [filtersOpen, setFiltersOpen] = useState(false);

  const { data: groups } = trpc.groups.list.useQuery(undefined, { enabled: isAuthenticated });
  const groupsList = Array.isArray(groups) ? groups : [];

  // Seleciona automaticamente primeiro grupo
  useEffect(() => {
    if (!groupId && groupsList.length > 0) {
      setCurrentGroupId(groupsList[0].group.id);
    }
  }, [groupsList, groupId, setCurrentGroupId]);

  const { data: expenses, isLoading, refetch } = trpc.sharedExpenses.list.useQuery(
    { groupId: groupId! },
    { enabled: !!groupId && isAuthenticated }
  );
  const detailQuery = trpc.sharedExpenses.getById.useQuery(
    { id: detailId! },
    { enabled: !!detailId && isDetailOpen }
  );


  const membersQuery = trpc.groups.getMembers.useQuery(
    { groupId: groupId! },
    { enabled: !!groupId && isAuthenticated }
  );

  const createMutation = trpc.sharedExpenses.create.useMutation({
    onSuccess: () => {
      toast.success("Despesa criada");
      setIsCreateOpen(false);
      setTitle("");
      setAmount("");
      setCategory("");
      setAllowMemberEdits(false);
      refetch();
    },
    onError: e => toast.error(e.message),
  });

  const deleteMutation = trpc.sharedExpenses.delete.useMutation({
    onSuccess: () => {
      toast.success("Despesa removida");
      refetch();
    },
    onError: e => toast.error(e.message),
  });

  const updateMutation = trpc.sharedExpenses.update.useMutation({
    onSuccess: () => { toast.success("Despesa atualizada"); setIsEditOpen(false); refetch(); },
    onError: e => toast.error(e.message),
  });

  const permissionMutation = trpc.sharedExpenses.update.useMutation({
    onSuccess: () => {
      toast.success("Preferência atualizada");
      detailQuery.refetch();
      refetch();
    },
    onError: e => toast.error(e.message),
  });

  const validateMutation = trpc.sharedExpenses.validate.useMutation({
    onSuccess: () => { toast.success("Validada"); refetch(); },
    onError: e => toast.error(e.message),
  });

  const splits = useMemo(() => {
    if (!membersQuery.data || !amount) return [];
    const total = parseInt(amount, 10);
    if (!Number.isFinite(total) || total <= 0) return [];
    const each = Math.floor(total / membersQuery.data.length);
    // Distribui resto nos primeiros membros
    let remainder = total - each * membersQuery.data.length;
    return membersQuery.data.map(m => ({
      userId: m.user.id,
      amount: each + (remainder-- > 0 ? 1 : 0),
    }));
  }, [membersQuery.data, amount]);

  const handleCreate = () => {
    if (!groupId) return;
    const amt = parseInt(amount, 10);
    if (!title.trim() || !amt) {
      toast.error("Título e valor são obrigatórios");
      return;
    }
    if (!splits.length) {
      toast.error("Não foi possível gerar splits");
      return;
    }
    createMutation.mutate({
      groupId,
      title,
      amount: amt,
      date: new Date(date + 'T00:00:00'),
      currency: "BRL",
      category: category || undefined,
      allowMemberEdits,
      // description omitida para evitar envio de undefined
      splits,
    });
  };

  const handleDelete = (id: string) => {
    if (confirm("Remover despesa?")) {
      deleteMutation.mutate({ id });
    }
  };

  const startEdit = (row: any) => {
    setEditing(row);
    setTitle(row.expense.title);
    setAmount(String(row.expense.amount));
    setCategory(row.expense.category || "");
    setDate(new Date(row.expense.date).toISOString().substring(0,10));
    setAllowMemberEdits(Boolean(row.expense.allowMemberEdits));
    setIsEditOpen(true);
  };

  const handleUpdate = () => {
    if (!editing) return;
    const amt = parseInt(amount, 10);
    const payload: any = {
      id: editing.expense.id,
      title: title || undefined,
      amount: isNaN(amt) ? undefined : amt,
      category: category || undefined,
      date: new Date(date + 'T00:00:00'),
    };
    if (editing.expense.createdBy === user?.id) {
      payload.allowMemberEdits = allowMemberEdits;
    }
    updateMutation.mutate(payload);
  };

  const openDetail = (row: any) => {
    setDetailId(row.expense.id);
    setIsDetailOpen(true);
  };

  const filteredExpenses = useMemo(() => {
    let list = expenses || [];
    if (filterText) list = list.filter(e => e.expense.title.toLowerCase().includes(filterText.toLowerCase()));
    if (filterCategory) list = list.filter(e => (e.expense.category || '').toLowerCase() === filterCategory.toLowerCase());
    if (filterStatus) list = list.filter(e => e.expense.status === filterStatus);
    if (filterStart) list = list.filter(e => new Date(e.expense.date) >= new Date(filterStart));
    if (filterEnd) list = list.filter(e => new Date(e.expense.date) <= new Date(filterEnd));
    return list;
  }, [expenses, filterText, filterCategory, filterStatus, filterStart, filterEnd]);

  useEffect(() => {
    if (detailQuery.data) {
      setDetailAllowMemberEdits(Boolean(detailQuery.data.expense.allowMemberEdits));
    }
  }, [detailQuery.data]);

  const expensesList = filteredExpenses ?? [];
  const totalAmount = expensesList.reduce((sum, item) => sum + (item.expense.amount || 0), 0);
  const pendingCount = expensesList.filter((item) => item.expense.status === "pending").length;
  const heroStats = [
    {
      label: "Despesas filtradas",
      value: expensesList.length,
      helper: expensesList.length === 1 ? "item ativo" : "itens ativos",
    },
    {
      label: "Valor total",
      value: formatCents(totalAmount),
      helper: "Considerando filtros aplicados",
    },
    {
      label: "Pendentes",
      value: pendingCount,
      helper: "Aguardando validação",
    },
  ];

  return (
    <div className="space-y-4 sm:space-y-6 animate-fade-in">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold sm:text-3xl">Despesas compartilhadas</h1>
        <p className="text-sm text-muted-foreground">
          {currentGroup ? `Grupo: ${currentGroup.name}` : "Selecione um grupo para ver as despesas."}
        </p>
      </div>

      <div className="overflow-hidden rounded-2xl border border-border/60 bg-card/60 p-1">
        <ToggleGroup
          type="single"
          value={segment}
          onValueChange={(v) => {
            const next = (v || "shared") as typeof segment;
            setSegment(next);
            if (next === "personal") {
              navigate("/personal-expenses");
              return;
            }
            if (next === "all") {
              setFilterText("");
              setFilterCategory("");
              setFilterStatus("");
              setFilterStart("");
              setFilterEnd("");
              return;
            }
            if (next === "shared") {
              setFilterStatus("");
              return;
            }
            if (next === "pending") {
              setFilterStatus("pending");
              return;
            }
            if (next === "paid") {
              // no backend: "validated" é o equivalente mais próximo de "paga" no fluxo atual
              setFilterStatus("validated");
            }
          }}
          className="w-full"
          variant="outline"
        >
          <ToggleGroupItem value="all" className="flex-1 rounded-xl data-[state=on]:bg-primary/15 data-[state=on]:text-primary">
            Todas
          </ToggleGroupItem>
          <ToggleGroupItem value="shared" className="flex-1 rounded-xl data-[state=on]:bg-primary/15 data-[state=on]:text-primary">
            Compart.
          </ToggleGroupItem>
          <ToggleGroupItem value="personal" className="flex-1 rounded-xl data-[state=on]:bg-primary/15 data-[state=on]:text-primary">
            Pessoais
          </ToggleGroupItem>
          <ToggleGroupItem value="pending" className="flex-1 rounded-xl data-[state=on]:bg-primary/15 data-[state=on]:text-primary">
            Pendentes
          </ToggleGroupItem>
          <ToggleGroupItem value="paid" className="flex-1 rounded-xl data-[state=on]:bg-primary/15 data-[state=on]:text-primary">
            Pagas
          </ToggleGroupItem>
        </ToggleGroup>
      </div>

      <Accordion type="single" collapsible defaultValue={undefined}>
        <AccordionItem value="stats" className="border-none">
          <AccordionTrigger className="rounded-2xl border border-border/60 bg-card/60 px-4 py-3 hover:no-underline">
            <span className="flex flex-col items-start">
              <span className="text-sm font-semibold">Resumo</span>
              <span className="text-xs text-muted-foreground">Totais e pendências</span>
            </span>
          </AccordionTrigger>
          <AccordionContent className="pt-3">
            <div className="grid grid-cols-3 gap-2">
              <Card className="rounded-2xl border bg-card shadow-sm">
                <CardContent className="p-4">
                  <p className="text-xs text-muted-foreground">Itens</p>
                  <p className="mt-1 text-2xl font-bold leading-none">{expensesList.length}</p>
                </CardContent>
              </Card>
              <Card className="rounded-2xl border bg-card shadow-sm">
                <CardContent className="p-4">
                  <p className="text-xs text-muted-foreground">Total</p>
                  <p className="mt-1 truncate text-base font-semibold leading-tight">{formatCents(totalAmount)}</p>
                </CardContent>
              </Card>
              <Card className="rounded-2xl border bg-card shadow-sm">
                <CardContent className="p-4">
                  <p className="text-xs text-muted-foreground">Pendentes</p>
                  <p className="mt-1 text-2xl font-bold leading-none">{pendingCount}</p>
                </CardContent>
              </Card>
            </div>
          </AccordionContent>
        </AccordionItem>
      </Accordion>

      <PageContainer className="rounded-2xl border border-border/60 bg-card/60 p-3 sm:p-4">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <div className="flex-1">
            <Select value={groupId ?? undefined} onValueChange={(v) => setCurrentGroupId(v)}>
              <SelectTrigger className="w-full rounded-2xl">
                <SelectValue placeholder="Selecionar grupo" />
              </SelectTrigger>
              <SelectContent>
                {groupsList.map((g) => (
                  <SelectItem key={g.group.id} value={g.group.id}>
                    {g.group.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Dialog
            open={isCreateOpen}
            onOpenChange={(open) => {
              setIsCreateOpen(open);
              if (!open) setAllowMemberEdits(false);
            }}
          >
            <DialogTrigger asChild>
              <Button disabled={!groupId} className="interactive-tap w-full gap-2 rounded-2xl sm:w-auto">
                <Plus className="h-4 w-4" /> Nova despesa
              </Button>
            </DialogTrigger>
            <DialogContent>
                <DialogHeader>
                  <DialogTitle>Nova Despesa</DialogTitle>
                  <DialogDescription>Divida automaticamente entre membros do grupo</DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-2">
                  <div className="space-y-2">
                    <Label>Título *</Label>
                    <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="Ex: Mercado" />
                  </div>
                  <div className="space-y-2">
                    <Label>Valor (centavos) *</Label>
                    <Input value={amount} onChange={e => setAmount(e.target.value)} placeholder="Ex: 2599" />
                  </div>
                  <div className="space-y-2">
                    <Label>Categoria</Label>
                    <Input value={category} onChange={e => setCategory(e.target.value)} placeholder="Ex: Alimentação" />
                  </div>
                  <div className="space-y-2">
                    <Label>Data</Label>
                    <Input type="date" value={date} onChange={e => setDate(e.target.value)} />
                  </div>
                  <div className="flex items-center justify-between rounded-2xl border border-border/60 p-3">
                    <div>
                      <Label className="text-sm">Permitir que membros editem</Label>
                      <p className="text-xs text-muted-foreground">Quando ativo, qualquer membro pode colaborar.</p>
                    </div>
                    <Switch checked={allowMemberEdits} onCheckedChange={setAllowMemberEdits} />
                  </div>
                  {splits.length > 0 && (
                    <Card className="border border-dashed">
                      <CardHeader>
                        <CardTitle className="text-sm">Divisão automática</CardTitle>
                        <CardDescription className="text-xs">Valores por participante (centavos)</CardDescription>
                      </CardHeader>
                      <CardContent className="grid grid-cols-2 gap-2 text-xs">
                        {splits.map(s => (
                          <div key={s.userId} className="flex justify-between">
                            <span>{userLabel(membersQuery.data?.find(m => m.user.id === s.userId)?.user, user || undefined) || s.userId}</span>
                            <span className="font-medium">{s.amount}</span>
                          </div>
                        ))}
                      </CardContent>
                    </Card>
                  )}
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsCreateOpen(false)}>Cancelar</Button>
                  <Button onClick={handleCreate} disabled={createMutation.isPending}>
                    {createMutation.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}Criar
                  </Button>
                </DialogFooter>
              </DialogContent>
          </Dialog>
        </div>

        <Accordion type="single" collapsible value={filtersOpen ? "filters" : undefined} onValueChange={(v) => setFiltersOpen(v === "filters")}>
          <AccordionItem value="filters" className="mt-2 border-none">
            <AccordionTrigger className="rounded-2xl border border-border/60 bg-background/60 px-4 py-3 hover:no-underline">
              <span className="flex flex-col items-start">
                <span className="text-sm font-semibold">Filtros</span>
                <span className="text-xs text-muted-foreground">Busca, categoria, status e período</span>
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
                  <Label className="text-xs">Status</Label>
                  <Select value={filterStatus || undefined} onValueChange={(v) => setFilterStatus(v === "all" ? "" : v)}>
                    <SelectTrigger className="w-full rounded-2xl"><SelectValue placeholder="Todos" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos</SelectItem>
                      <SelectItem value="pending">Pendente</SelectItem>
                      <SelectItem value="validated">Validada</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Início</Label>
                  <Input type="date" value={filterStart} onChange={(e) => setFilterStart(e.target.value)} className="w-full rounded-2xl" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Fim</Label>
                  <Input type="date" value={filterEnd} onChange={(e) => setFilterEnd(e.target.value)} className="w-full rounded-2xl" />
                </div>
                {(filterText || filterCategory || filterStatus || filterStart || filterEnd) && (
                  <div className="flex items-end">
                    <Button
                      type="button"
                      variant="outline"
                      className="interactive-tap w-full rounded-2xl"
                      onClick={() => {
                        setFilterText("");
                        setFilterCategory("");
                        setFilterStatus("");
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

      {/* Dialog de edição */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Despesa</DialogTitle>
            <DialogDescription>Atualize os campos necessários e salve as alterações</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2"><Label>Título</Label><Input value={title} onChange={e => setTitle(e.target.value)} /></div>
            <div className="space-y-2"><Label>Valor (centavos)</Label><Input value={amount} onChange={e => setAmount(e.target.value)} /></div>
            <div className="space-y-2"><Label>Categoria</Label><Input value={category} onChange={e => setCategory(e.target.value)} /></div>
            <div className="space-y-2"><Label>Data</Label><Input type="date" value={date} onChange={e => setDate(e.target.value)} /></div>
            {editing?.expense.createdBy === user?.id && (
              <div className="flex items-center justify-between rounded-md border p-3">
                <div>
                  <Label className="text-sm">Permitir que membros editem</Label>
                  <p className="text-xs text-muted-foreground">Membros poderão alterar campos como título e valor.</p>
                </div>
                <Switch checked={allowMemberEdits} onCheckedChange={setAllowMemberEdits} />
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditOpen(false)}>Cancelar</Button>
            <Button onClick={handleUpdate} disabled={updateMutation.isPending}>{updateMutation.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog de detalhes */}
      <Dialog
        open={isDetailOpen}
        onOpenChange={open => {
          setIsDetailOpen(open);
          if (!open) setDetailId(null);
        }}
      >
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Detalhes da Despesa</DialogTitle>
            <DialogDescription>Veja valores, splits e status da despesa selecionada</DialogDescription>
          </DialogHeader>
          {detailQuery.isLoading ? (
            <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin" /></div>
          ) : detailQuery.data ? (
            <div className="space-y-4 text-sm">
              <div className="grid grid-cols-2 gap-2">
                <div className="flex justify-between"><span>Título</span><span>{detailQuery.data.expense.title}</span></div>
                <div className="flex justify-between"><span>Valor</span><span>{formatCents(detailQuery.data.expense.amount)}</span></div>
                <div className="flex justify-between"><span>Categoria</span><span>{detailQuery.data.expense.category || 'Sem'}</span></div>
                <div className="flex justify-between"><span>Data</span><span>{new Date(detailQuery.data.expense.date).toLocaleDateString('pt-BR')}</span></div>
                <div className="flex justify-between"><span>Status</span><span className="capitalize">{detailQuery.data.expense.status}</span></div>
              </div>
              <div className="flex items-center justify-between rounded-md border p-3 text-sm">
                <div>
                  <p className="font-medium">Edição por membros</p>
                  <p className="text-xs text-muted-foreground">Controla se outras pessoas do grupo podem atualizar os dados.</p>
                </div>
                {detailQuery.data.expense.createdBy === user?.id ? (
                  <Switch
                    checked={detailAllowMemberEdits}
                    disabled={permissionMutation.isPending}
                    onCheckedChange={next => {
                      const previous = detailAllowMemberEdits;
                      setDetailAllowMemberEdits(next);
                      if (!detailId) return;
                      permissionMutation.mutate(
                        { id: detailId, allowMemberEdits: next },
                        {
                          onError: () => setDetailAllowMemberEdits(previous),
                        }
                      );
                    }}
                  />
                ) : (
                  <span className="font-semibold text-xs">
                    {detailAllowMemberEdits ? "Liberada" : "Restrita"}
                  </span>
                )}
              </div>
              <Card>
                <CardHeader className="py-3"><CardTitle className="text-sm">Splits</CardTitle><CardDescription>Participantes e valores</CardDescription></CardHeader>
                <CardContent className="space-y-2">
                  {detailQuery.data.splits.map(s => (
                    <div key={s.split.id} className="flex justify-between text-xs">
                      <span>{userLabel(s.user, user || undefined)}</span>
                      <span className="font-medium">{formatCents(s.split.amount)}</span>
                    </div>
                  ))}
                </CardContent>
              </Card>
              {detailQuery.data.expense.status === 'pending' && (
                <Button onClick={() => validateMutation.mutate({ id: detailQuery.data.expense.id })} disabled={validateMutation.isPending} className="gap-2">
                  {validateMutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                  <CheckCircle2 className="h-4 w-4" /> Validar
                </Button>
              )}
            </div>
          ) : (
            <p className="text-muted-foreground text-sm">Sem dados</p>
          )}
          <DialogFooter><Button variant="outline" onClick={() => setIsDetailOpen(false)}>Fechar</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      {isLoading ? (
        <div className="flex items-center justify-center py-12"><Loader2 className="h-8 w-8 animate-spin" /></div>
      ) : expensesList.length === 0 ? (
        <PageContainer className="rounded-3xl border border-border/60 bg-card/80">
          <EmptyState
            title="Nenhuma despesa"
            description="Selecione um grupo e registre os primeiros lançamentos para acompanhar divisão, validação e notificações."
            cta={
              <Button onClick={() => setIsCreateOpen(true)} disabled={!groupId} className="gap-2">
                <Plus className="h-4 w-4" />
                Criar despesa
              </Button>
            }
          />
        </PageContainer>
      ) : (
        <PageContainer className="space-y-2">
          {expensesList.map(e => {
            const isOwner = e.expense.createdBy === user?.id;
            const canEdit = isOwner || (!!e.expense.allowMemberEdits && !!user?.id);
            return (
              <motion.div
                key={e.expense.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ type: "spring", stiffness: 170, damping: 20 }}
              >
                <Card className="interactive-card rounded-2xl border bg-card shadow-sm transition-all duration-150 hover:-translate-y-0.5 hover:shadow-md">
                  <CardContent className="p-3">
                    <div className="flex items-start gap-3">
                      <button
                        type="button"
                        className="min-w-0 flex-1 text-left"
                        onClick={() => openDetail(e)}
                      >
                        <p className="truncate text-sm font-semibold underline-offset-4 hover:underline">
                          {e.expense.title}
                        </p>
                        <div className="mt-2 flex flex-wrap items-center gap-2">
                          <Badge variant={e.expense.status === "validated" ? "secondary" : "outline"} className="rounded-full text-[11px]">
                            {e.expense.status === "validated" ? "Paga" : "Pendente"}
                          </Badge>
                          <span className="text-[11px] text-muted-foreground">
                            {new Date(e.expense.date).toLocaleDateString("pt-BR")}
                          </span>
                          {e.expense.category ? (
                            <span className="text-[11px] text-muted-foreground">{e.expense.category}</span>
                          ) : null}
                        </div>
                      </button>

                      <div className="flex items-center gap-1">
                        <div className="text-right">
                          <p className="text-sm font-semibold">{formatCents(e.expense.amount)}</p>
                          <p className="text-[11px] text-muted-foreground">total</p>
                        </div>
                        {(canEdit || isOwner) && (
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="interactive-tap h-9 w-9 rounded-2xl" aria-label="Mais opções">
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-44">
                              {canEdit && (
                                <DropdownMenuItem onClick={() => startEdit(e)}>
                                  <span className="flex items-center gap-2">
                                    <Pencil className="h-4 w-4" />
                                    Editar
                                  </span>
                                </DropdownMenuItem>
                              )}
                              {isOwner && (
                                <DropdownMenuItem
                                  className="text-destructive focus:text-destructive"
                                  onClick={() => handleDelete(e.expense.id)}
                                  disabled={deleteMutation.isPending}
                                >
                                  <span className="flex items-center gap-2">
                                    <Trash2 className="h-4 w-4" />
                                    Remover
                                  </span>
                                </DropdownMenuItem>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </PageContainer>
      )}
    </div>
  );
}
