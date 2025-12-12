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
import { trpc } from "@/lib/trpc";
import { Loader2, Plus, Trash2, Pencil, CheckCircle2, SlidersHorizontal } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useCurrentGroup } from "@/contexts/CurrentGroupContext";
import { toast } from "sonner";
import { formatCents, userLabel } from "@/lib/utils";
import { useIsMobile } from "@/hooks/useMobile";
import { motion } from "framer-motion";

export default function SharedExpenses() {
  const { isAuthenticated, user } = useAuth();
  const { currentGroup, setCurrentGroupId } = useCurrentGroup();
  const groupId = currentGroup?.id ?? null;
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
    if (!groupId && groups && groups.length > 0) {
      setCurrentGroupId(groups[0].group.id);
    }
  }, [groups, groupId, setCurrentGroupId]);

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
    <div className="space-y-6 animate-fade-in">
      <PageContainer className="app-hero">
        <div className="space-y-4">
          <p className="text-xs uppercase tracking-widest text-muted-foreground">Operações compartilhadas</p>
          <h1 className="text-3xl font-semibold leading-tight sm:text-4xl">
            Controle despesas sincronizadas com o seu grupo ativo
          </h1>
          <p className="text-sm text-muted-foreground sm:text-base">
            Cada ajuste aqui reflete imediatamente para todos os membros conectados e dispara notificações inteligentes.
          </p>
          <div className="grid gap-3 sm:grid-cols-3">
            {heroStats.map((stat) => (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ type: "spring", stiffness: 190, damping: 22 }}
                className="glass-panel rounded-3xl border border-border/70 p-4"
              >
                <p className="text-xs uppercase tracking-widest text-muted-foreground">{stat.label}</p>
                <p className="text-2xl font-semibold">{stat.value}</p>
                <p className="text-xs text-muted-foreground">{stat.helper}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </PageContainer>

      <PageContainer className="glass-panel space-y-4 rounded-3xl border border-border/70 bg-card/70">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-xl font-semibold">Configurar grupo e filtros</h2>
            <p className="text-sm text-muted-foreground">Escolha o grupo ativo, aplique filtros e registre novas despesas.</p>
          </div>
          <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:flex-wrap">
            <Select value={groupId ?? undefined} onValueChange={v => setCurrentGroupId(v)}>
              <SelectTrigger className="w-full sm:w-[220px]">
                <SelectValue placeholder="Selecione grupo" />
              </SelectTrigger>
              <SelectContent>
                {groupsList.map(g => (
                  <SelectItem key={g.group.id} value={g.group.id}>{g.group.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Dialog
              open={isCreateOpen}
              onOpenChange={open => {
                setIsCreateOpen(open);
                if (!open) setAllowMemberEdits(false);
              }}
            >
              <DialogTrigger asChild>
                <Button disabled={!groupId} className="w-full gap-2 sm:w-auto">
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
            <Button
              variant="outline"
              className="w-full gap-2 sm:hidden"
              onClick={() => setFiltersOpen(prev => !prev)}
            >
              <SlidersHorizontal className="h-4 w-4" /> {filtersOpen ? "Ocultar filtros" : "Mostrar filtros"}
            </Button>
          </div>
        </div>
        <div className={`grid gap-3 sm:grid-cols-2 lg:grid-cols-3 ${isMobile && !filtersOpen ? "hidden" : ""}`}>
          <div className="space-y-1">
            <Label className="text-xs">Busca</Label>
            <Input value={filterText} onChange={e => setFilterText(e.target.value)} placeholder="Título" className="w-full" />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Categoria</Label>
            <Input value={filterCategory} onChange={e => setFilterCategory(e.target.value)} placeholder="Categoria" className="w-full" />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Status</Label>
            <Select value={filterStatus || undefined} onValueChange={v => setFilterStatus(v === 'all' ? '' : v)}>
              <SelectTrigger className="w-full"><SelectValue placeholder="Todos" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="pending">Pendente</SelectItem>
                <SelectItem value="validated">Validada</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Início</Label>
            <Input type="date" value={filterStart} onChange={e => setFilterStart(e.target.value)} className="w-full" />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Fim</Label>
            <Input type="date" value={filterEnd} onChange={e => setFilterEnd(e.target.value)} className="w-full" />
          </div>
        </div>
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
        <PageContainer className="grid gap-4 md:grid-cols-2">
          {expensesList.map(e => {
            const isOwner = e.expense.createdBy === user?.id;
            const canEdit = isOwner || (!!e.expense.allowMemberEdits && !!user?.id);
            return (
              <motion.div
                key={e.expense.id}
                initial={{ opacity: 0, y: 24 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ type: "spring", stiffness: 170, damping: 20 }}
              >
                <Card className="interactive-card rounded-3xl border border-border/60 bg-card/80">
                  <CardHeader className="pb-2">
                    <CardTitle className="flex items-start justify-between gap-3 text-lg">
                      <button
                        type="button"
                        className="text-left underline-offset-4 hover:underline"
                        onClick={() => openDetail(e)}
                      >
                        {e.expense.title}
                      </button>
                      <span className="flex gap-1">
                        {canEdit && (
                          <Button variant="ghost" size="icon" className="rounded-xl" onClick={() => startEdit(e)}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                        )}
                        {isOwner && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="rounded-xl"
                            onClick={() => handleDelete(e.expense.id)}
                            disabled={deleteMutation.isPending}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        )}
                      </span>
                    </CardTitle>
                    <CardDescription className="flex flex-wrap items-center gap-2 text-sm">
                      {e.expense.category || 'Sem categoria'}
                      <Badge variant={e.expense.allowMemberEdits ? "secondary" : "outline"} className="text-[11px]">
                        {e.expense.allowMemberEdits ? "Edição liberada" : "Somente criador"}
                      </Badge>
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-2 text-sm">
                    <div className="flex items-center justify-between">
                      <span>Valor total</span>
                      <span className="font-semibold">{formatCents(e.expense.amount)}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Data</span>
                      <span>{new Date(e.expense.date).toLocaleDateString('pt-BR')}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Status</span>
                      <Badge variant={e.expense.status === 'validated' ? "secondary" : "outline"}>
                        {e.expense.status}
                      </Badge>
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
