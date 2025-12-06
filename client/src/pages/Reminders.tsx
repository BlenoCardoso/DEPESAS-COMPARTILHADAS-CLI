import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { trpc } from "@/lib/trpc";
import { Loader2, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

export default function Reminders() {
  const { isAuthenticated } = useAuth();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("");
  const [reminderDate, setReminderDate] = useState<string>(() => new Date().toISOString().substring(0, 16));

  const { data: reminders, isLoading, refetch } = trpc.reminders.list.useQuery(undefined, { enabled: isAuthenticated });

  const createMutation = trpc.reminders.create.useMutation({
    onSuccess: () => { toast.success("Lembrete criado"); setIsCreateOpen(false); setTitle(""); setCategory(""); refetch(); },
    onError: e => toast.error(e.message),
  });
  const deleteMutation = trpc.reminders.delete.useMutation({ onSuccess: () => { toast.success("Removido"); refetch(); }, onError: e => toast.error(e.message) });

  const handleCreate = () => {
    if (!title.trim()) { toast.error("Título obrigatório"); return; }
    // Remover campo description undefined
    createMutation.mutate({ title, category: category || undefined, reminderDate: new Date(reminderDate) });
  };
  const handleDelete = (id: string) => { if (confirm("Remover lembrete?")) deleteMutation.mutate({ id }); };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold sm:text-3xl">Lembretes</h1>
          <p className="text-sm text-muted-foreground">Gerencie seus lembretes</p>
        </div>
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2 w-full sm:w-auto"><Plus className="h-4 w-4" /> Novo</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Novo Lembrete</DialogTitle>
              <DialogDescription>Notificação simples para uma data</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div className="space-y-2"><Label>Título *</Label><Input value={title} onChange={e => setTitle(e.target.value)} /></div>
              <div className="space-y-2"><Label>Categoria</Label><Input value={category} onChange={e => setCategory(e.target.value)} /></div>
              <div className="space-y-2"><Label>Data/Hora</Label><Input type="datetime-local" value={reminderDate} onChange={e => setReminderDate(e.target.value)} /></div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsCreateOpen(false)}>Cancelar</Button>
              <Button onClick={handleCreate} disabled={createMutation.isPending}>{createMutation.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}Salvar</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
      {isLoading ? (
        <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin" /></div>
      ) : !reminders || reminders.length === 0 ? (
        <Card className="rounded-2xl border border-border/70"><CardContent className="py-10 text-center space-y-2"><p className="text-muted-foreground">Nenhum lembrete</p><Button onClick={() => setIsCreateOpen(true)}>Criar primeiro</Button></CardContent></Card>
      ) : (
        <div className="grid gap-3 sm:gap-4 md:grid-cols-2">
            {(reminders as any[]).map(r => (
            <Card key={r.id} className="rounded-2xl border border-border/70">
              <CardHeader className="pb-2"><CardTitle className="flex justify-between text-lg"><span>{r.title}</span><Button variant="ghost" size="icon" onClick={() => handleDelete(r.id)} disabled={deleteMutation.isPending}><Trash2 className="h-4 w-4 text-destructive" /></Button></CardTitle><CardDescription>{r.category || 'Sem categoria'}</CardDescription></CardHeader>
              <CardContent className="text-sm space-y-1">
                <div className="flex justify-between"><span>Data</span><span>{new Date(r.reminderDate).toLocaleString('pt-BR')}</span></div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
