import { useAuth } from "@/_core/hooks/useAuth";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { trpc } from "@/lib/trpc";
import { CalendarDays, Loader2, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

const CalendarEmptyIllustration = () => (
  <svg
    viewBox="0 0 220 170"
    role="img"
    aria-hidden="true"
    className="mx-auto h-36 w-48"
  >
    <defs>
      <linearGradient id="calendarSheet" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#7C5DFA" stopOpacity="0.65" />
        <stop offset="100%" stopColor="#42C5C0" stopOpacity="0.65" />
      </linearGradient>
      <radialGradient id="calendarShadow" cx="50%" cy="50%" r="50%">
        <stop offset="0%" stopColor="#000" stopOpacity="0.25" />
        <stop offset="100%" stopColor="#000" stopOpacity="0" />
      </radialGradient>
    </defs>
    <ellipse cx="110" cy="152" rx="70" ry="16" fill="url(#calendarShadow)" opacity="0.25" />
    <rect x="34" y="30" width="154" height="106" rx="26" fill="url(#calendarSheet)" opacity="0.15" />
    <rect x="26" y="44" width="148" height="100" rx="22" fill="#ffffff" stroke="#e5e1ff" strokeWidth="2" />
    <rect x="26" y="44" width="148" height="34" rx="18" fill="#f5f2ff" />
    <circle cx="62" cy="47" r="12" fill="#7C5DFA" />
    <circle cx="138" cy="47" r="12" fill="#42C5C0" />
    {[0, 1, 2].map((row) => (
      <g key={row} transform={`translate(46 ${92 + row * 18})`}>
        {[0, 1, 2, 3].map((col) => (
          <rect
            key={col}
            x={col * 22}
            y={0}
            width={16}
            height={12}
            rx={4}
            fill="#f1f0ff"
          />
        ))}
      </g>
    ))}
    <rect x="78" y="104" width="32" height="20" rx="6" fill="#FFB892" opacity="0.8" />
    <rect x="114" y="122" width="28" height="16" rx="5" fill="#42C5C0" opacity="0.7" />
  </svg>
);

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
    // Omitir description quando não utilizada para evitar erro Firestore
    createMutation.mutate({ title, startDate: new Date(startDate), endDate: endDate ? new Date(endDate) : undefined, allDay });
  };
  const handleDelete = (id: string) => { if (confirm("Remover evento?")) deleteMutation.mutate({ id }); };

  const getEventAccent = (isAllDay: boolean) =>
    isAllDay
      ? "bg-gradient-to-br from-secondary/20 to-secondary/5"
      : "bg-gradient-to-br from-primary/15 to-primary/5";

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="space-y-4 rounded-2xl border border-border/70 bg-card/60 p-4 shadow-sm">
        <div className="flex items-center justify-between gap-3">
          <div className="flex flex-col gap-1">
            <h1 className="text-2xl font-semibold sm:text-3xl">Calendário</h1>
            <p className="text-sm text-muted-foreground">Visualize seus eventos</p>
          </div>
          <div className="hidden sm:flex h-12 w-12 items-center justify-center rounded-2xl gradient-primary text-white shadow-lg">
            <CalendarDays className="h-6 w-6" />
          </div>
        </div>
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button className="w-full gap-2 sm:w-auto"><Plus className="h-4 w-4" /> Novo Evento</Button>
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
              <div className="flex items-center justify-between rounded-2xl border border-border/60 px-4 py-3">
                <div className="space-y-0.5">
                  <Label>Dia inteiro</Label>
                  <p className="text-xs text-muted-foreground">Eventos de dia inteiro ficam no topo do calendário</p>
                </div>
                <Switch checked={allDay} onCheckedChange={setAllDay} />
              </div>
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
        <Card className="rounded-2xl border border-border/70 interactive-card">
          <CardContent className="py-10 text-center space-y-4">
            <CalendarEmptyIllustration />
            <div className="space-y-2">
              <p className="text-base font-semibold">Agenda tranquila por aqui</p>
              <p className="text-sm text-muted-foreground">Que tal marcar o primeiro compromisso agora?</p>
            </div>
            <Button onClick={() => setIsCreateOpen(true)} className="interactive-tap">Criar primeiro evento</Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:gap-4 md:grid-cols-2">
            {(events as any[]).map(ev => (
              <Card key={ev.id} className={`rounded-2xl border border-border/60 shadow-sm interactive-card ${getEventAccent((ev as any).allDay)}`}>
                <CardHeader className="pb-2">
                  <CardTitle className="flex justify-between text-lg">
                    <span>{(ev as any).title}</span>
                    <Button variant="ghost" size="icon" className="rounded-xl interactive-tap" onClick={() => handleDelete(ev.id)} disabled={deleteMutation.isPending}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                  </CardTitle>
                  <div className="flex items-center gap-2 text-sm">
                    <CardDescription>{(ev as any).allDay ? 'Dia inteiro' : 'Evento pontual'}</CardDescription>
                    {(ev as any).allDay && <Badge variant="secondary" className="text-[11px]">All day</Badge>}
                  </div>
                </CardHeader>
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
