import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { trpc } from "@/lib/trpc";
import { CheckCircle2, Loader2, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

export default function Tasks() {
  const { isAuthenticated } = useAuth();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [priority, setPriority] = useState("medium");
  const [dueDate, setDueDate] = useState<string>("");

  const { data: tasks, isLoading, refetch } = trpc.tasks.list.useQuery(undefined, { enabled: isAuthenticated });

  const createMutation = trpc.tasks.create.useMutation({
    onSuccess: () => { toast.success("Tarefa criada"); setIsCreateOpen(false); setTitle(""); setPriority("medium"); setDueDate(""); refetch(); },
    onError: e => toast.error(e.message),
  });
  const deleteMutation = trpc.tasks.delete.useMutation({ onSuccess: () => { toast.success("Tarefa removida"); refetch(); }, onError: e => toast.error(e.message) });
  const toggleMutation = trpc.tasks.toggleCompleted.useMutation({ onSuccess: () => { refetch(); }, onError: e => toast.error(e.message) });

  const handleCreate = () => {
    if (!title.trim()) { toast.error("Título obrigatório"); return; }
    createMutation.mutate({ title, priority: priority as any, dueDate: dueDate ? new Date(dueDate + 'T00:00:00') : undefined });
  };
  const handleDelete = (id: string) => { if (confirm("Remover tarefa?")) deleteMutation.mutate({ id }); };
  const handleToggle = (id: string, completed: boolean) => toggleMutation.mutate({ id, completed: !completed });

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Tarefas</h1>
          <p className="text-muted-foreground">Organize suas tarefas</p>
        </div>
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2"><Plus className="h-4 w-4" /> Nova</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Nova Tarefa</DialogTitle>
              <DialogDescription>Defina prioridade e prazo</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div className="space-y-2"><Label>Título *</Label><Input value={title} onChange={e => setTitle(e.target.value)} /></div>
              <div className="space-y-2">
                <Label>Prioridade</Label>
                <Select value={priority} onValueChange={v => setPriority(v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Baixa</SelectItem>
                    <SelectItem value="medium">Média</SelectItem>
                    <SelectItem value="high">Alta</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2"><Label>Prazo</Label><Input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} /></div>
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
      ) : !tasks || tasks.length === 0 ? (
        <Card><CardContent className="py-10 text-center space-y-2"><p className="text-muted-foreground">Nenhuma tarefa</p><Button onClick={() => setIsCreateOpen(true)}>Criar primeira</Button></CardContent></Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
            {(tasks as any[]).map(t => (
              <Card key={t.id} className={(t as any).completed ? 'opacity-70' : ''}>
                <CardHeader className="pb-2">
                  <CardTitle className="flex justify-between items-start text-lg">
                    <span className="flex items-center gap-2">
                      {(t as any).completed && <CheckCircle2 className="h-4 w-4 text-green-600" />}
                      {(t as any).title}
                    </span>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" onClick={() => handleToggle(t.id, (t as any).completed)} disabled={toggleMutation.isPending}>{(t as any).completed ? '⟳' : '✔'}</Button>
                      <Button variant="ghost" size="icon" onClick={() => handleDelete(t.id)} disabled={deleteMutation.isPending}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                    </div>
                  </CardTitle>
                  <CardDescription className="capitalize">Prioridade: {(t as any).priority}</CardDescription>
                </CardHeader>
                <CardContent className="text-sm space-y-1">
                  {(t as any).dueDate && <div className="flex justify-between"><span>Prazo</span><span>{new Date((t as any).dueDate).toLocaleDateString('pt-BR')}</span></div>}
                  <div className="flex justify-between"><span>Status</span><span>{(t as any).completed ? 'Concluída' : 'Pendente'}</span></div>
                </CardContent>
              </Card>
            ))}
        </div>
      )}
    </div>
  );
}
