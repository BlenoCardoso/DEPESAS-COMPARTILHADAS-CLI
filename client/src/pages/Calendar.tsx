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

export default function Calendar() {
  const { isAuthenticated } = useAuth();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [startDate, setStartDate] = useState<string>(() => new Date().toISOString().substring(0, 16));
  const [endDate, setEndDate] = useState<string>("");
  const [allDay, setAllDay] = useState(false);

  const { data: events, isLoading, refetch } = trpc.calendar.list.useQuery(undefined, { enabled: isAuthenticated });

  const createMutation = trpc.calendar.create.useMutation({
    onSuccess: () => { toast.success("Evento criado"); setIsCreateOpen(false); setTitle(""); setEndDate(""); setAllDay(false); refetch(); },
    onError: e => toast.error(e.message),
  });
  const deleteMutation = trpc.calendar.delete.useMutation({ onSuccess: () => { toast.success("Evento removido"); refetch(); }, onError: e => toast.error(e.message) });

  const handleCreate = () => {
    if (!title.trim()) { toast.error("Título obrigatório"); return; }
    createMutation.mutate({ title, description: undefined, startDate: new Date(startDate), endDate: endDate ? new Date(endDate) : undefined, allDay });
  };
  const handleDelete = (id: string) => { if (confirm("Remover evento?")) deleteMutation.mutate({ id }); };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Calendário</h1>
          <p className="text-muted-foreground">Visualize seus eventos</p>
        </div>
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2"><Plus className="h-4 w-4" /> Novo Evento</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Novo Evento</DialogTitle>
              <DialogDescription>Crie um evento simples</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div className="space-y-2"><Label>Título *</Label><Input value={title} onChange={e => setTitle(e.target.value)} /></div>
              <div className="space-y-2"><Label>Início</Label><Input type="datetime-local" value={startDate} onChange={e => setStartDate(e.target.value)} /></div>
              <div className="space-y-2"><Label>Fim (opcional)</Label><Input type="datetime-local" value={endDate} onChange={e => setEndDate(e.target.value)} /></div>
              <div className="flex items-center gap-2"><input id="allday" type="checkbox" checked={allDay} onChange={e => setAllDay(e.target.checked)} /><Label htmlFor="allday">Dia inteiro</Label></div>
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
      ) : !events || events.length === 0 ? (
        <Card><CardContent className="py-10 text-center space-y-2"><p className="text-muted-foreground">Nenhum evento</p><Button onClick={() => setIsCreateOpen(true)}>Criar primeiro</Button></CardContent></Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
            {(events as any[]).map(ev => (
              <Card key={ev.id}>
                <CardHeader className="pb-2"><CardTitle className="flex justify-between text-lg"><span>{(ev as any).title}</span><Button variant="ghost" size="icon" onClick={() => handleDelete(ev.id)} disabled={deleteMutation.isPending}><Trash2 className="h-4 w-4 text-destructive" /></Button></CardTitle><CardDescription>{(ev as any).allDay ? 'Dia inteiro' : 'Evento pontual'}</CardDescription></CardHeader>
                <CardContent className="text-sm space-y-1">
                  <div className="flex justify-between"><span>Início</span><span>{(ev as any).startDate ? new Date((ev as any).startDate).toLocaleString('pt-BR') : '-'}</span></div>
                  {(ev as any).endDate && <div className="flex justify-between"><span>Fim</span><span>{new Date((ev as any).endDate).toLocaleString('pt-BR')}</span></div>}
                </CardContent>
              </Card>
            ))}
        </div>
      )}
    </div>
  );
}
