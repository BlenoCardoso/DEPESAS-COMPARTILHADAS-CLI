import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { trpc } from "@/lib/trpc";
import { Loader2, Plus, Trash2, Pencil } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { formatCents, parseReaisToCents } from "@/lib/utils";

export default function PersonalExpenses() {
  const { isAuthenticated } = useAuth();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [amount, setAmount] = useState(""); // valor em reais (string)
  const [editing, setEditing] = useState<any | null>(null);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [category, setCategory] = useState("");
  const [date, setDate] = useState<string>(() => new Date().toISOString().substring(0, 10));

  const { data: expenses, isLoading, refetch } = trpc.personalExpenses.list.useQuery(undefined, { enabled: isAuthenticated });

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
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold sm:text-3xl">Despesas Pessoais</h1>
          <p className="text-sm text-muted-foreground">Gerencie suas despesas pessoais</p>
        </div>
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button className="w-full gap-2 sm:w-auto"><Plus className="h-4 w-4" /> Nova</Button>
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
      </div>
      {isLoading ? (
        <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin" /></div>
      ) : !expenses || expenses.length === 0 ? (
        <Card className="rounded-2xl border border-border/70"><CardContent className="py-10 text-center space-y-2"><p className="text-muted-foreground">Nenhuma despesa</p><Button onClick={() => setIsCreateOpen(true)}>Criar primeira</Button></CardContent></Card>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:gap-4 md:grid-cols-2">
          {(expenses as any[]).map(e => (
            <Card key={e.id} className="rounded-2xl border border-border/70">
              <CardHeader className="pb-2"><CardTitle className="text-lg flex justify-between"><span>{(e as any).title}</span><span className="flex gap-1"> <Button variant="ghost" size="icon" className="rounded-xl" onClick={() => startEdit(e)}><Pencil className="h-4 w-4" /></Button><Button variant="ghost" size="icon" className="rounded-xl" onClick={() => handleDelete(e.id)} disabled={deleteMutation.isPending}><Trash2 className="h-4 w-4 text-destructive" /></Button></span></CardTitle><CardDescription>{(e as any).category || 'Sem categoria'}</CardDescription></CardHeader>
              <CardContent className="text-sm space-y-1">
                <div className="flex justify-between"><span>Valor</span><span className="font-medium">{formatCents((e as any).amount)}</span></div>
                <div className="flex justify-between"><span>Data</span><span>{(e as any).date ? new Date((e as any).date).toLocaleDateString('pt-BR') : '-'}</span></div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
