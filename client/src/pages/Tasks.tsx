import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { trpc } from "@/lib/trpc";
import { CheckCircle2, Loader2, Plus, Trash2, Flame, AlertCircle, Check } from "lucide-react";
import { ReactNode, useState } from "react";
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

  const priorityStyles: Record<string, { label: string; gradient: string; icon: ReactNode }> = {
    low: {
      label: "Baixa",
      gradient: "from-secondary/30 to-secondary/5",
      icon: <Check className="h-4 w-4" />,
    },
    medium: {
      label: "Média",
      gradient: "from-primary/25 to-primary/5",
      icon: <AlertCircle className="h-4 w-4" />,
    },
    high: {
      label: "Alta",
      gradient: "from-destructive/25 to-destructive/5",
      icon: <Flame className="h-4 w-4" />,
    },
  };

  const getCardGradient = (priority: string, completed: boolean) => {
    if (completed) return "bg-muted";
    return `bg-gradient-to-br ${priorityStyles[priority]?.gradient ?? 'from-muted to-card'}`;
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold sm:text-3xl">Tarefas</h1>
          <p className="text-sm text-muted-foreground">Organize suas tarefas</p>
        </div>
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button className="w-full gap-2 sm:w-auto"><Plus className="h-4 w-4" /> Nova</Button>
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
        <Card className="rounded-2xl border border-border/70 interactive-card"><CardContent className="py-10 text-center space-y-2"><p className="text-muted-foreground">Nenhuma tarefa</p><Button onClick={() => setIsCreateOpen(true)}>Criar primeira</Button></CardContent></Card>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:gap-4 md:grid-cols-2">
            {(tasks as any[]).map(t => {
              const priority = (t as any).priority || "medium";
              const completed = (t as any).completed;
              return (
              <Card key={t.id} className={`rounded-2xl border border-border/60 shadow-sm transition-all interactive-card ${completed ? 'opacity-70' : 'opacity-100'} ${getCardGradient(priority, completed)}`}>
                <CardHeader className="pb-2">
                  <CardTitle className="flex justify-between items-start text-lg">
                    <span className="flex items-center gap-2">
                      {completed ? (
                        <CheckCircle2 className="h-4 w-4 text-green-600" />
                      ) : (
                        <span className="rounded-xl bg-white/60 p-1 text-xs text-primary">
                          {priorityStyles[priority]?.icon}
                        </span>
                      )}
                      {(t as any).title}
                    </span>
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="rounded-xl interactive-tap"
                        onClick={() => handleToggle(t.id, completed)}
                        disabled={toggleMutation.isPending}
                      >
                        {completed ? '⟳' : '✔'}
                      </Button>
                      <Button variant="ghost" size="icon" className="rounded-xl interactive-tap" onClick={() => handleDelete(t.id)} disabled={deleteMutation.isPending}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                    </div>
                  </CardTitle>
                  <div className="flex items-center gap-2 text-xs">
                    <Badge variant="secondary" className="capitalize bg-white/30 text-foreground">
                      {priorityStyles[priority]?.label ?? priority}
                    </Badge>
                    {completed && <Badge variant="outline">Concluída</Badge>}
                  </div>
                </CardHeader>
                <CardContent className="text-sm space-y-1">
                  {(t as any).dueDate && <div className="flex justify-between"><span>Prazo</span><span>{new Date((t as any).dueDate).toLocaleDateString('pt-BR')}</span></div>}
                  <div className="flex justify-between"><span>Status</span><span>{(t as any).completed ? 'Concluída' : 'Pendente'}</span></div>
                </CardContent>
              </Card>
            );})}
        </div>
      )}
    </div>
  );
}
