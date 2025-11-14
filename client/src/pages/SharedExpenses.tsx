import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { trpc } from "@/lib/trpc";
import { Loader2, Plus, Trash2, Pencil, CheckCircle2, Filter } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { formatCents, parseReaisToCents } from "@/lib/utils";

export default function SharedExpenses() {
  const { isAuthenticated } = useAuth();
  const [groupId, setGroupId] = useState<string | null>(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [amount, setAmount] = useState(""); // centavos (input em centavos para manter lógica de splits)
  const [category, setCategory] = useState("");
  const [date, setDate] = useState<string>(() => new Date().toISOString().substring(0, 10));
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

  const { data: groups } = trpc.groups.list.useQuery(undefined, { enabled: isAuthenticated });

  // Seleciona automaticamente primeiro grupo
  useEffect(() => {
    if (!groupId && groups && groups.length > 0) {
      setGroupId(groups[0].group.id);
    }
  }, [groups, groupId]);

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
      description: undefined,
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
    setIsEditOpen(true);
  };

  const handleUpdate = () => {
    if (!editing) return;
    const amt = parseInt(amount, 10);
    updateMutation.mutate({ id: editing.expense.id, title: title || undefined, amount: isNaN(amt)? undefined : amt, category: category || undefined, date: new Date(date + 'T00:00:00') });
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

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Despesas Compartilhadas</h1>
          <p className="text-muted-foreground">Gerencie despesas compartilhadas com seus grupos</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Select value={groupId ?? undefined} onValueChange={v => setGroupId(v)}>
            <SelectTrigger className="w-[220px]">
              <SelectValue placeholder="Selecione grupo" />
            </SelectTrigger>
            <SelectContent>
              {groups?.map(g => (
                <SelectItem key={g.group.id} value={g.group.id}>{g.group.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
            <DialogTrigger asChild>
              <Button disabled={!groupId} className="gap-2">
                <Plus className="h-4 w-4" /> Nova Despesa
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Nova Despesa</DialogTitle>
                <DialogDescription>Divisão automática entre membros do grupo</DialogDescription>
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
                {splits.length > 0 && (
                  <Card className="border-dashed">
                    <CardHeader>
                      <CardTitle className="text-sm">Divisão</CardTitle>
                      <CardDescription className="text-xs">Valor por usuário (centavos)</CardDescription>
                    </CardHeader>
                    <CardContent className="grid grid-cols-2 gap-2 text-xs">
                      {splits.map(s => (
                        <div key={s.userId} className="flex justify-between">
                          <span>{membersQuery.data?.find(m => m.user.id === s.userId)?.user.name || s.userId}</span>
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
          {/* Filtros */}
          <div className="flex gap-2 items-end">
            <div className="space-y-1">
              <Label className="text-xs">Busca</Label>
              <Input value={filterText} onChange={e => setFilterText(e.target.value)} placeholder="Titulo" className="w-[140px]" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Categoria</Label>
              <Input value={filterCategory} onChange={e => setFilterCategory(e.target.value)} placeholder="Categoria" className="w-[120px]" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Status</Label>
              <Select value={filterStatus || undefined} onValueChange={v => setFilterStatus(v === 'all' ? '' : v)}>
                <SelectTrigger className="w-[120px]"><SelectValue placeholder="Todos" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="pending">Pendente</SelectItem>
                  <SelectItem value="validated">Validada</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Início</Label>
              <Input type="date" value={filterStart} onChange={e => setFilterStart(e.target.value)} className="w-[130px]" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Fim</Label>
              <Input type="date" value={filterEnd} onChange={e => setFilterEnd(e.target.value)} className="w-[130px]" />
            </div>
          </div>
        </div>
      </div>

      {/* Dialog de edição */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Editar Despesa</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2"><Label>Título</Label><Input value={title} onChange={e => setTitle(e.target.value)} /></div>
            <div className="space-y-2"><Label>Valor (centavos)</Label><Input value={amount} onChange={e => setAmount(e.target.value)} /></div>
            <div className="space-y-2"><Label>Categoria</Label><Input value={category} onChange={e => setCategory(e.target.value)} /></div>
            <div className="space-y-2"><Label>Data</Label><Input type="date" value={date} onChange={e => setDate(e.target.value)} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditOpen(false)}>Cancelar</Button>
            <Button onClick={handleUpdate} disabled={updateMutation.isPending}>{updateMutation.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog de detalhes */}
      <Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Detalhes da Despesa</DialogTitle></DialogHeader>
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
              <Card>
                <CardHeader className="py-3"><CardTitle className="text-sm">Splits</CardTitle><CardDescription>Participantes e valores</CardDescription></CardHeader>
                <CardContent className="space-y-2">
                  {detailQuery.data.splits.map(s => (
                    <div key={s.split.id} className="flex justify-between text-xs">
                      <span>{s.user.name || s.user.id}</span>
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
      ) : !filteredExpenses || filteredExpenses.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center space-y-2">
            <p className="text-muted-foreground">Nenhuma despesa para este grupo</p>
            <Button onClick={() => setIsCreateOpen(true)} disabled={!groupId}>Criar primeira</Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {filteredExpenses.map(e => (
            <Card key={e.expense.id} className="relative">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg flex justify-between items-start">
                  <span className="cursor-pointer underline-offset-2 hover:underline" onClick={() => openDetail(e)}>{e.expense.title}</span>
                  <span className="flex gap-1">
                    <Button variant="ghost" size="icon" onClick={() => startEdit(e)}><Pencil className="h-4 w-4" /></Button>
                    <Button variant="ghost" size="icon" onClick={() => handleDelete(e.expense.id)} disabled={deleteMutation.isPending}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </span>
                </CardTitle>
                <CardDescription>{e.expense.category || 'Sem categoria'}</CardDescription>
              </CardHeader>
              <CardContent className="text-sm space-y-1">
                <div className="flex justify-between"><span>Valor total</span><span className="font-medium">{formatCents(e.expense.amount)}</span></div>
                <div className="flex justify-between"><span>Data</span><span>{new Date(e.expense.date).toLocaleDateString('pt-BR')}</span></div>
                <div className="flex justify-between"><span>Status</span><span className="capitalize">{e.expense.status}</span></div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
